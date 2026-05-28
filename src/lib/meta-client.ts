import {
  SendMessageRequest,
  SendMessageResponse,
  MetaError,
  META_ERROR_CODES,
  InteractiveContent,
} from '@/types/whatsapp';

interface MetaSettings {
  meta_phone_id: string;
  meta_access_token: string;
}

interface SendResult {
  success: boolean;
  wa_id?: string;
  error?: MetaError;
}

export class MetaWhatsAppClient {
  private settings: MetaSettings;
  private baseUrl = 'https://graph.facebook.com/v18.0';

  constructor(settings: MetaSettings) {
    this.settings = settings;
  }

  private async callMeta(endpoint: string, payload: any): Promise<SendResult> {
    const url = `${this.baseUrl}/${this.settings.meta_phone_id}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.settings.meta_access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || {
            code: response.status,
            message: 'Unknown error',
            type: 'Unknown',
          },
        };
      }

      // Extract message ID from successful response
      if (data.messages && data.messages[0]) {
        return {
          success: true,
          wa_id: data.messages[0].id,
        };
      }

      return {
        success: false,
        error: {
          code: 500,
          message: 'No message ID in response',
          type: 'InvalidResponse',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 500,
          message: error instanceof Error ? error.message : 'Network error',
          type: 'NetworkError',
        },
      };
    }
  }

  async sendText(to: string, body: string): Promise<SendResult> {
    const payload = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'text',
      text: { body },
    };

    return this.callMeta('/messages', payload);
  }

  async sendImage(to: string, link: string, caption?: string): Promise<SendResult> {
    const payload = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'image',
      image: {
        link,
        ...(caption && { caption }),
      },
    };

    return this.callMeta('/messages', payload);
  }

  /**
   * Acepta formato interno (kind/buttons) o formato Meta (type/action) desde Laravel.
   */
  normalizeInteractive(input: unknown): InteractiveContent | null {
    if (!input || typeof input !== 'object') {
      return null;
    }

    const raw = input as Record<string, unknown>;

    if (raw.kind === 'button' || raw.kind === 'list') {
      return raw as unknown as InteractiveContent;
    }

    if (raw.type === 'button' && raw.action && typeof raw.action === 'object') {
      const action = raw.action as { buttons?: Array<{ reply?: { id: string; title: string }; id?: string; title?: string }> };
      const buttons = (action.buttons ?? []).map((btn) => ({
        id: String(btn.reply?.id ?? btn.id ?? ''),
        title: String(btn.reply?.title ?? btn.title ?? ''),
      })).filter((b) => b.id && b.title);

      return {
        kind: 'button',
        body: (raw.body as InteractiveContent['body']) ?? { text: '' },
        footer: raw.footer as InteractiveContent['footer'],
        buttons,
      };
    }

    if (raw.type === 'list' && raw.action && typeof raw.action === 'object') {
      const action = raw.action as {
        button?: string;
        sections?: Array<{ title: string; rows: Array<{ id: string; title: string; description?: string }> }>;
      };

      return {
        kind: 'list',
        body: (raw.body as InteractiveContent['body']) ?? { text: '' },
        footer: raw.footer as InteractiveContent['footer'],
        button: action.button,
        sections: action.sections ?? [],
      };
    }

    return null;
  }

  private buildMetaHeader(header?: InteractiveContent['header']): Record<string, unknown> | undefined {
    if (!header) {
      return undefined;
    }
    if (header.type === 'image' && header.image?.link) {
      return { type: 'image', image: { link: header.image.link } };
    }
    if (header.text?.trim()) {
      return { type: 'text', text: header.text.substring(0, 60) };
    }
    return undefined;
  }

  async sendInteractiveButtons(
    to: string,
    header: InteractiveContent['header'] | undefined,
    body: string,
    footer: string,
    buttons: Array<{ id: string; title: string }>
  ): Promise<SendResult> {
    // Validation: max 3 buttons
    if (buttons.length > 3) {
      return {
        success: false,
        error: {
          code: 400,
          message: 'Maximum 3 buttons allowed',
          type: 'ValidationError',
        },
      };
    }

    // Validation: button title max 20 chars
    for (const btn of buttons) {
      if (btn.title.length > 20) {
        return {
          success: false,
          error: {
            code: 400,
            message: `Button title "${btn.title}" exceeds 20 characters`,
            type: 'ValidationError',
          },
        };
      }
    }

    const interactive: Record<string, unknown> = {
      type: 'button',
      body: {
        text: body.substring(0, 1024),
      },
      action: {
        buttons: buttons.map((btn) => ({
          type: 'reply',
          reply: {
            id: btn.id,
            title: btn.title,
          },
        })),
      },
    };

    const metaHeader = this.buildMetaHeader(header);
    if (metaHeader) {
      interactive.header = metaHeader;
    }

    if (footer.trim()) {
      interactive.footer = {
        text: footer.substring(0, 60),
      };
    }

    const payload = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'interactive',
      interactive,
    };

    return this.callMeta('/messages', payload);
  }

  async sendInteractiveList(
    to: string,
    header: InteractiveContent['header'] | undefined,
    body: string,
    footer: string,
    buttonText: string,
    sections: Array<{ title: string; rows: Array<{ id: string; title: string; description?: string }> }>
  ): Promise<SendResult> {
    // Validation: button text max 20 chars
    if (buttonText.length > 20) {
      return {
        success: false,
        error: {
          code: 400,
          message: 'Button text exceeds 20 characters',
          type: 'ValidationError',
        },
      };
    }

    // Validation: max 10 sections
    if (sections.length > 10) {
      return {
        success: false,
        error: {
          code: 400,
          message: 'Maximum 10 sections allowed',
          type: 'ValidationError',
        },
      };
    }

    // Validation: max 10 rows per section
    for (const section of sections) {
      if (section.rows.length > 10) {
        return {
          success: false,
          error: {
            code: 400,
            message: `Section "${section.title}" exceeds 10 rows`,
            type: 'ValidationError',
          },
        };
      }

      // Validation: row title max 24 chars, description max 72 chars
      for (const row of section.rows) {
        if (row.title.length > 24) {
          return {
            success: false,
            error: {
              code: 400,
              message: `Row title "${row.title}" exceeds 24 characters`,
              type: 'ValidationError',
            },
          };
        }
        if (row.description && row.description.length > 72) {
          return {
            success: false,
            error: {
              code: 400,
              message: `Row description exceeds 72 characters`,
              type: 'ValidationError',
            },
          };
        }
      }
    }

    const interactive: Record<string, unknown> = {
      type: 'list',
      body: {
        text: body.substring(0, 1024),
      },
      action: {
        button: buttonText,
        sections: sections.map((section) => ({
          title: section.title.substring(0, 24),
          rows: section.rows.map((row) => ({
            id: row.id,
            title: row.title,
            ...(row.description && { description: row.description }),
          })),
        })),
      },
    };

    const metaHeader = this.buildMetaHeader(header);
    if (metaHeader) {
      interactive.header = metaHeader;
    }

    if (footer.trim()) {
      interactive.footer = {
        text: footer.substring(0, 60),
      };
    }

    const payload = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'interactive',
      interactive,
    };

    return this.callMeta('/messages', payload);
  }

  async sendTemplate(
    to: string,
    templateName: string,
    language: string,
    components: any[]
  ): Promise<SendResult> {
    const payload = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: language },
        components,
      },
    };

    return this.callMeta('/messages', payload);
  }

  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    const traceId = this.generateTraceId();
    const normalizedPhone = request.to.replace(/\D/g, '');

    let result: SendResult;

    switch (request.type) {
      case 'text':
        if (!request.text) {
          return this.errorResponse(traceId, 400, 'Text content required');
        }
        result = await this.sendText(normalizedPhone, request.text.body);
        break;

      case 'image':
        if (!request.image) {
          return this.errorResponse(traceId, 400, 'Image content required');
        }
        result = await this.sendImage(normalizedPhone, request.image.link, request.image.caption);
        break;

      case 'interactive': {
        const interactive = this.normalizeInteractive(request.interactive);
        if (!interactive) {
          return this.errorResponse(traceId, 400, 'Interactive content required or invalid format');
        }
        const bodyText =
          typeof interactive.body === 'string'
            ? interactive.body
            : interactive.body?.text ?? '';
        if (interactive.kind === 'button') {
          if (!interactive.buttons || interactive.buttons.length === 0) {
            return this.errorResponse(traceId, 400, 'Buttons required for interactive button');
          }
          result = await this.sendInteractiveButtons(
            normalizedPhone,
            interactive.header,
            bodyText,
            interactive.footer?.text || '',
            interactive.buttons
          );
        } else if (interactive.kind === 'list') {
          if (!interactive.sections || interactive.sections.length === 0) {
            return this.errorResponse(traceId, 400, 'Sections required for interactive list');
          }
          result = await this.sendInteractiveList(
            normalizedPhone,
            interactive.header,
            bodyText,
            interactive.footer?.text || '',
            interactive.button || 'Seleccionar',
            interactive.sections
          );
        } else {
          return this.errorResponse(traceId, 400, 'Invalid interactive kind');
        }
        break;
      }

      case 'template':
        if (!request.template) {
          return this.errorResponse(traceId, 400, 'Template content required');
        }
        result = await this.sendTemplate(
          normalizedPhone,
          request.template.name,
          request.template.language,
          request.template.components
        );
        break;

      default:
        return this.errorResponse(traceId, 400, 'Invalid message type');
    }

    if (result.success && result.wa_id) {
      return {
        ok: true,
        provider: 'meta',
        status: 'sent',
        wa_id: result.wa_id,
        provider_message_id: result.wa_id,
        meta_phone_id: this.settings.meta_phone_id,
        trace_id: traceId,
      };
    }

    if (result.error) {
      // Check for specific error codes to suggest templates
      if (result.error.code === META_ERROR_CODES.MESSAGE_WINDOW_CLOSED) {
        return {
          ok: false,
          provider: 'meta',
          status: 'failed',
          meta_phone_id: this.settings.meta_phone_id,
          trace_id: traceId,
          error: {
            code: result.error.code,
            message: result.error.message + ' - Consider using a template message',
            type: result.error.type,
          },
        };
      }

      return {
        ok: false,
        provider: 'meta',
        status: 'failed',
        meta_phone_id: this.settings.meta_phone_id,
        trace_id: traceId,
        error: result.error,
      };
    }

    return this.errorResponse(traceId, 500, 'Unknown error');
  }

  private errorResponse(traceId: string, code: number, message: string): SendMessageResponse {
    return {
      ok: false,
      provider: 'meta',
      status: 'failed',
      meta_phone_id: this.settings.meta_phone_id,
      trace_id: traceId,
      error: {
        code,
        message,
        type: 'ClientError',
      },
    };
  }

  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  isRetryableError(error?: MetaError): boolean {
    if (!error) return false;

    // Retry on rate limits (429)
    if (error.code === META_ERROR_CODES.RATE_LIMIT) return true;

    // Retry on server errors (5xx)
    if (error.code >= 500 && error.code < 600) return true;

    // Retry on network errors
    if (error.type === 'NetworkError') return true;

    // Do NOT retry on client errors (4xx except 429)
    // Do NOT retry on auth errors, invalid IDs, etc.
    return false;
  }
}
