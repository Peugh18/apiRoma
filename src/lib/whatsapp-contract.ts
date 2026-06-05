import {
  LegacyMessageRequest,
  SendMessageRequest,
  WebhookInboundEvent,
} from '@/types/whatsapp';

export const ROMA_CONTRACT_VERSION = 1;
export const CRM_SOURCE = 'laravel_crm';

/** Legacy solo si no hay contrato nuevo (to + type). */
export function isLegacyOutboundPayload(payload: Record<string, unknown>): boolean {
  return (
    'sender_phone' in payload &&
    'message_body' in payload &&
    'direction' in payload &&
    !('to' in payload && 'type' in payload)
  );
}

export function legacyToSendRequest(legacy: LegacyMessageRequest): SendMessageRequest {
  return {
    to: legacy.sender_phone,
    type: 'text',
    text: { body: legacy.message_body },
    context: {
      source: CRM_SOURCE,
      message_id: legacy.wa_id,
    },
  };
}

export function outboundPreview(req: SendMessageRequest): string {
  if (req.type === 'text') {
    return req.text?.body ?? '';
  }
  if (req.type === 'image') {
    return req.image?.caption ?? '📷 Imagen';
  }
  if (req.type === 'interactive') {
    const body = req.interactive?.body;
    if (typeof body === 'string') {
      return body;
    }
    return body?.text ?? '🔘 Mensaje interactivo';
  }
  if (req.type === 'template') {
    return `📋 Plantilla: ${req.template?.name ?? 'template'}`;
  }
  return '[non-text]';
}

/** Payload que roma-api envía al CRM — mismo shape que espera RomaSyncController. */
export function toCrmInboundPayload(event: WebhookInboundEvent): Record<string, unknown> {
  if (event.event === 'status') {
    return {
      event: 'status',
      wa_id: event.wa_id,
      sender_phone: event.from,
      status: event.status,
      direction: 'inbound',
      timestamp: event.timestamp,
      roma_contract_version: ROMA_CONTRACT_VERSION,
    };
  }

  return {
    wa_id: event.wa_id,
    sender_phone: event.from,
    message_body: event.text ?? event.interactive?.title ?? '',
    direction: 'inbound',
    message_type: event.message_type,
    interactive: event.interactive,
    image_url: event.image_url,
    media_url: event.media_url,
    mime_type: event.mime_type,
    timestamp: event.timestamp,
    raw: event.raw,
    roma_contract_version: ROMA_CONTRACT_VERSION,
  };
}
