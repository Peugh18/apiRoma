import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { broadcastChatMessage } from '@/lib/pusher';
import { MetaWhatsAppClient } from '@/lib/meta-client';
import { verifyRomaSyncToken } from '@/lib/whatsapp-auth';
import {
  isLegacyOutboundPayload,
  legacyToSendRequest,
  outboundPreview,
} from '@/lib/whatsapp-contract';
import { LegacyMessageRequest, SendMessageRequest, SendMessageResponse } from '@/types/whatsapp';

async function getSettings() {
  const { data } = await supabaseAdmin.from('app_settings').select('*').eq('id', 1).single();
  return data;
}

async function checkIdempotency(messageId: string): Promise<SendMessageResponse | null> {
  const { data } = await supabaseAdmin
    .from('chat_logs')
    .select('*')
    .eq('external_message_id', messageId)
    .single();

  if (data) {
    return {
      ok: true,
      provider: 'meta',
      status: 'accepted',
      wa_id: data.wa_id,
      provider_message_id: data.wa_id,
      meta_phone_id: data.meta_phone_id || '',
      trace_id: data.trace_id || '',
    };
  }
  return null;
}

function logEvent(traceId: string, level: 'info' | 'error' | 'warn', event: string, data: Record<string, unknown>) {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      trace_id: traceId,
      level,
      event,
      ...data,
    })
  );
}

// POST /api/messages — contrato: { to, type, text|image|interactive|template, context }
export async function POST(request: Request) {
  const startTime = Date.now();
  const traceId = `trace_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  try {
    const auth = verifyRomaSyncToken(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const payload = (await request.json()) as Record<string, unknown>;

    logEvent(traceId, 'info', 'request_received', {
      type: payload.type,
      to: payload.to,
      has_interactive: Boolean(payload.interactive),
    });

    let sendMessageRequest: SendMessageRequest;
    let externalMessageId: string | undefined;

    if (isLegacyOutboundPayload(payload)) {
      sendMessageRequest = legacyToSendRequest(payload as unknown as LegacyMessageRequest);
      externalMessageId = (payload as { wa_id?: string }).wa_id;
      logEvent(traceId, 'info', 'legacy_payload_transformed', { type: sendMessageRequest.type });
    } else {
      sendMessageRequest = payload as unknown as SendMessageRequest;
      externalMessageId = sendMessageRequest.context?.message_id;
    }

    if (externalMessageId) {
      const existing = await checkIdempotency(externalMessageId);
      if (existing) {
        return NextResponse.json(existing, { status: 200 });
      }
    }

    const settings = await getSettings();
    if (!settings) {
      return NextResponse.json(
        {
          ok: false,
          provider: 'meta',
          status: 'failed',
          meta_phone_id: '',
          trace_id: traceId,
          error: { code: 500, message: 'System unconfigured', type: 'ClientError' },
        },
        { status: 500 }
      );
    }

    const metaClient = new MetaWhatsAppClient({
      meta_phone_id: settings.meta_phone_id,
      meta_access_token: settings.meta_access_token,
    });

    logEvent(traceId, 'info', 'sending_to_meta', {
      to: sendMessageRequest.to,
      type: sendMessageRequest.type,
    });

    const metaResponse = await metaClient.sendMessage(sendMessageRequest);
    const preview = outboundPreview(sendMessageRequest);

    logEvent(traceId, 'info', 'meta_response', {
      ok: metaResponse.ok,
      wa_id: metaResponse.wa_id,
      latency_ms: Date.now() - startTime,
    });

    if (metaResponse.ok && metaResponse.wa_id) {
      await logToSupabase(traceId, {
        wa_id: metaResponse.wa_id,
        sender_phone: sendMessageRequest.to,
        message_body: preview,
        direction: 'outbound',
        message_type: sendMessageRequest.type,
        trace_id: traceId,
        external_message_id: externalMessageId,
        meta_phone_id: metaResponse.meta_phone_id,
        status: metaResponse.status,
      });

      await broadcastChatMessage({
        wa_id: metaResponse.wa_id,
        sender_phone: sendMessageRequest.to,
        message_body: preview,
        direction: 'outbound',
      });
    }

    return NextResponse.json(metaResponse, {
      status: metaResponse.ok ? 200 : 500,
    });
  } catch (err) {
    logEvent(traceId, 'error', 'exception', {
      error: err instanceof Error ? err.message : 'Unknown error',
      latency_ms: Date.now() - startTime,
    });
    return NextResponse.json(
      {
        ok: false,
        provider: 'meta',
        status: 'failed',
        meta_phone_id: '',
        trace_id: traceId,
        error: { code: 500, message: 'Internal Server Error', type: 'ServerError' },
      },
      { status: 500 }
    );
  }
}

async function logToSupabase(traceId: string, data: Record<string, unknown>) {
  const { error } = await supabaseAdmin.from('chat_logs').insert(data);
  if (error) {
    logEvent(traceId, 'error', 'supabase_insert_failed', { error: String(error.message) });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const traceId = searchParams.get('trace_id');

    if (traceId) {
      const { data, error } = await supabaseAdmin
        .from('chat_logs')
        .select('*')
        .eq('trace_id', traceId)
        .single();

      if (error) {
        return NextResponse.json({ error: 'Trace not found' }, { status: 404 });
      }

      return NextResponse.json({ data }, { status: 200 });
    }

    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10', 10), 1), 100);
    const phoneFilter = searchParams.get('phone')?.replace(/\D/g, '') || null;

    let query = supabaseAdmin
      .from('chat_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (phoneFilter) {
      query = query.like('sender_phone', `%${phoneFilter}%`);
    }

    const { data: logs, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      status: 'API is running',
      contract_version: 1,
      supported_outbound_types: ['text', 'image', 'interactive', 'template'],
      latest_messages: logs || [],
    });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
