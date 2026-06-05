// WhatsApp Message Types for roma-api

export type MessageType = 'text' | 'image' | 'interactive' | 'template';

export interface TextContent {
  body: string;
}

export interface ImageContent {
  link: string;
  caption?: string;
}

export interface Button {
  id: string;
  title: string;
}

export interface ListRow {
  id: string;
  title: string;
  description?: string;
}

export interface ListSection {
  title: string;
  rows: ListRow[];
}

export interface InteractiveContent {
  kind: 'button' | 'list';
  header?: {
    type: 'text' | 'image' | 'video' | 'document';
    text?: string;
    image?: { link: string };
  };
  body: {
    text: string;
  };
  footer?: {
    text: string;
  };
  button?: string; // For list: "Seleccionar"
  buttons?: Button[]; // For button
  sections?: ListSection[]; // For list
}

export interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  text?: string;
  parameters?: any[];
}

export interface TemplateContent {
  name: string;
  language: string;
  components: TemplateComponent[];
}

export interface MessageContext {
  source: string;
  conversation_id?: string;
  message_id?: string;
}

export interface SendMessageRequest {
  to: string;
  type: MessageType;
  text?: TextContent;
  image?: ImageContent;
  interactive?: InteractiveContent;
  template?: TemplateContent;
  context?: MessageContext;
}

// Legacy payload for backward compatibility
export interface LegacyMessageRequest {
  wa_id?: string;
  sender_phone: string;
  message_body: string;
  direction: 'inbound' | 'outbound';
}

export interface SendMessageResponse {
  ok: boolean;
  provider: 'meta';
  status: 'accepted' | 'sent' | 'failed';
  wa_id?: string;
  provider_message_id?: string;
  meta_phone_id: string;
  trace_id: string;
  raw?: any;
  error?: {
    code?: number;
    message: string;
    type?: string;
  };
}

// Webhook inbound types
export type WebhookEventType = 'message' | 'status';
export type WebhookMessageType =
  | 'text'
  | 'image'
  | 'audio'
  | 'video'
  | 'sticker'
  | 'document'
  | 'interactive_button_reply'
  | 'interactive_list_reply';

export interface InteractiveReply {
  reply_type: 'button' | 'list';
  id: string;
  title: string;
}

export interface WebhookInboundEvent {
  event: WebhookEventType;
  from: string;
  wa_id: string;
  message_type?: WebhookMessageType;
  text?: string;
  interactive?: InteractiveReply;
  image_url?: string;
  media_url?: string;
  mime_type?: string;
  status?: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  raw: any;
}

// Meta API error codes
export interface MetaError {
  code: number;
  message: string;
  type: string;
  error_data?: any;
  fbtrace_id?: string;
}

export const META_ERROR_CODES = {
  INVALID_PHONE_ID: 100,
  INVALID_TOKEN: 131030,
  RECIPIENT_NOT_ALLOWED: 131030,
  MESSAGE_WINDOW_CLOSED: 131047,
  RATE_LIMIT: 429,
  INTERNAL_ERROR: 500,
} as const;
