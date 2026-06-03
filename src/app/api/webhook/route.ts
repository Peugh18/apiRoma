import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { forwardMessageToLaravel } from '@/lib/laravel-sync';
import { broadcastChatMessage } from '@/lib/pusher';
import {
  enrichInboundEventImage,
  resolveRomaApiPublicBase,
} from '@/lib/whatsapp-media-download';
import { WebhookInboundEvent } from '@/types/whatsapp';

const MEDIA_PIPELINE_VERSION = 3;

// Helper to fetch settings dynamically from DB
async function getSettings() {
  const { data } = await supabaseAdmin.from('app_settings').select('*').eq('id', 1).single();
  return data;
}

// GET handler for Meta webhook verification
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const settings = await getSettings();

  if (mode === 'subscribe' && token === settings?.whatsapp_verify_token) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Invalid verification token' }, { status: 403 });
}

// POST handler for receiving messages
export async function POST(request: Request) {
  const traceId = `trace_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  try {
    const body = await request.json();
    console.log('Webhook payload received:', JSON.stringify(body, null, 2));

    if (body.object !== 'whatsapp_business_account') {
      return NextResponse.json({ error: 'Not a WhatsApp event' }, { status: 404 });
    }

    const settings = await getSettings();
    if (!settings) {
      console.error('Settings not found in database');
      return NextResponse.json({ error: 'System unconfigured' }, { status: 500 });
    }

    const entries = body.entry || [];
    const normalizedEvents: WebhookInboundEvent[] = [];
    
    for (const entry of entries) {
      const changes = entry.changes || [];
      
      for (const change of changes) {
        const value = change.value;
        const messages = value.messages;
        const statuses = value.statuses;

        // Process messages
        if (messages && messages.length > 0) {
          const accessToken = settings.meta_access_token as string;

          for (const message of messages) {
            let normalized = normalizeMessageEvent(message, value.metadata.phone_number_id);

            if (normalized.message_type === 'image') {
              console.log('[webhook] pipeline imagen v' + MEDIA_PIPELINE_VERSION, {
                hasToken: Boolean(accessToken?.trim()),
                publicBase: resolveRomaApiPublicBase() || '(vacío — falta ROMA_API_PUBLIC_URL en .env.local)',
              });

              if (!accessToken?.trim()) {
                console.warn('[webhook] Imagen sin meta_access_token en app_settings (Supabase)');
              } else {
                try {
                  const resolvedUrl = await enrichInboundEventImage(normalized, accessToken);
                  if (resolvedUrl && !resolvedUrl.includes('lookaside.fbsbx.com')) {
                    normalized = { ...normalized, image_url: resolvedUrl };
                    console.log('[webhook] image_url reemplazada para CRM', {
                      url: resolvedUrl.slice(0, 120),
                    });
                  } else {
                    console.warn('[webhook] enrich no reemplazó lookaside', {
                      result: resolvedUrl?.slice(0, 80) ?? null,
                    });
                  }
                } catch (enrichErr) {
                  console.error('[webhook] enrichInboundEventImage error', enrichErr);
                }
              }
            }

            normalizedEvents.push(normalized);

            await logInboundToSupabase(traceId, normalized);

            await broadcastChatMessage({
              wa_id: normalized.wa_id,
              sender_phone: normalized.from,
              message_body: normalized.text || '[non-text]',
              direction: 'inbound',
            });

            await forwardMessageToLaravel(normalized);
          }
        }

        // Process status updates
        if (statuses && statuses.length > 0) {
          for (const status of statuses) {
            const normalized = normalizeStatusEvent(status, value.metadata.phone_number_id);
            normalizedEvents.push(normalized);

            // Log status to Supabase
            await logStatusToSupabase(traceId, normalized);

            // Forward status to Laravel
            await forwardMessageToLaravel(normalized);
          }
        }
      }
    }

    console.log('Normalized webhook events:', JSON.stringify(normalizedEvents, null, 2));
    return NextResponse.json({ status: 'success', events_processed: normalizedEvents.length }, { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

function normalizeMessageEvent(message: any, metaPhoneId: string): WebhookInboundEvent {
  const senderPhone = message.from;
  const waId = message.id;
  const timestamp = message.timestamp;
  
  let eventType: WebhookInboundEvent['message_type'] = 'text';
  let text: string | undefined;
  let interactive: WebhookInboundEvent['interactive'] | undefined;

  if (message.type === 'text') {
    text = message.text.body;
    eventType = 'text';
  } else if (message.type === 'image') {
    text = message.image?.caption || '📷 Imagen';
    eventType = 'image';
  } else if (message.type === 'interactive') {
    if (message.interactive.type === 'button_reply') {
      eventType = 'interactive_button_reply';
      interactive = {
        reply_type: 'button',
        id: message.interactive.button_reply.id,
        title: message.interactive.button_reply.title,
      };
    } else if (message.interactive.type === 'list_reply') {
      eventType = 'interactive_list_reply';
      interactive = {
        reply_type: 'list',
        id: message.interactive.list_reply.id,
        title: message.interactive.list_reply.title,
      };
    }
  }

  const imageUrl =
    message.type === 'image'
      ? message.image?.link ?? message.image?.url ?? undefined
      : undefined;

  return {
    event: 'message',
    from: senderPhone,
    wa_id: waId,
    message_type: eventType,
    text,
    interactive,
    image_url: imageUrl,
    timestamp: new Date(timestamp * 1000).toISOString(),
    raw: message,
  };
}

function normalizeStatusEvent(status: any, metaPhoneId: string): WebhookInboundEvent {
  return {
    event: 'status',
    from: status.recipient_id,
    wa_id: status.id,
    status: status.status as 'sent' | 'delivered' | 'read' | 'failed',
    timestamp: new Date(status.timestamp * 1000).toISOString(),
    raw: status,
  };
}

async function logInboundToSupabase(traceId: string, event: WebhookInboundEvent) {
  const { error } = await supabaseAdmin.from('chat_logs').insert({
    wa_id: event.wa_id,
    sender_phone: event.from,
    message_body: event.text || JSON.stringify(event.interactive) || '[non-text]',
    direction: 'inbound',
    message_type: event.message_type,
    trace_id: traceId,
    timestamp: event.timestamp,
  });
  if (error) {
    console.error('Error logging inbound to Supabase:', error);
  }
}

async function logStatusToSupabase(traceId: string, event: WebhookInboundEvent) {
  const { error } = await supabaseAdmin.from('chat_logs').insert({
    wa_id: event.wa_id,
    sender_phone: event.from,
    message_body: `[Status: ${event.status}]`,
    direction: 'inbound',
    message_type: 'status',
    trace_id: traceId,
    timestamp: event.timestamp,
  });
  if (error) {
    console.error('Error logging status to Supabase:', error);
  }
}

