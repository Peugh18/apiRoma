import { WebhookInboundEvent } from '@/types/whatsapp';
import { toCrmInboundPayload } from '@/lib/whatsapp-contract';

/**
 * Envía mensajes al CRM Laravel cuando el webhook llega a roma-api.
 */
export async function forwardMessageToLaravel(payload: WebhookInboundEvent | Record<string, unknown>) {
  const baseUrl = process.env.LARAVEL_MESSAGES_URL;
  if (!baseUrl) {
    console.warn('[laravel-sync] LARAVEL_MESSAGES_URL no configurada — el CRM no recibirá mensajes');
    return;
  }

  const url = baseUrl.replace(/\/$/, '');

  const transformedPayload =
    payload && typeof payload === 'object' && 'event' in payload && 'from' in payload && 'wa_id' in payload
      ? toCrmInboundPayload(payload as WebhookInboundEvent)
      : payload;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const token = process.env.ROMA_SYNC_TOKEN;
    if (token) {
      headers['X-Roma-Sync-Token'] = token;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(transformedPayload),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[laravel-sync] CRM ingest falló:', res.status, text);
    } else {
      console.log('[laravel-sync] Mensaje enviado al CRM:', transformedPayload.direction, transformedPayload.sender_phone);
    }
  } catch (err) {
    console.error('[laravel-sync] CRM no alcanzable (¿Laravel en :8000?):', err);
  }
}
