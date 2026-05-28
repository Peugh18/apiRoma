# WhatsApp API Examples - roma-api

## Base URL
```
http://localhost:3000/api/messages
```

## 1. Text Message

```bash
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+51959166911",
    "type": "text",
    "text": {
      "body": "Hola, este es un mensaje de prueba"
    },
    "context": {
      "source": "laravel_crm",
      "conversation_id": "conv_123"
    }
  }'
```

**Response:**
```json
{
  "ok": true,
  "provider": "meta",
  "status": "sent",
  "wa_id": "wamid.HBgLNTE5NTkxNjY5MTEVAgARGBIyODhBRTVBOTBBMzU3MDEyNTQA",
  "provider_message_id": "wamid.HBgLNTE5NTkxNjY5MTEVAgARGBIyODhBRTVBOTBBMzU3MDEyNTQA",
  "meta_phone_id": "1200045469848616",
  "trace_id": "trace_1715184000000_abc123"
}
```

---

## 2. Image Message

```bash
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+51959166911",
    "type": "image",
    "image": {
      "link": "https://example.com/image.jpg",
      "caption": "Mira esta imagen"
    },
    "context": {
      "source": "laravel_crm"
    }
  }'
```

---

## 3. Interactive Buttons (Max 3 buttons)

```bash
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+51959166911",
    "type": "interactive",
    "interactive": {
      "kind": "button",
      "header": {
        "type": "text",
        "text": "Selecciona una opción"
      },
      "body": {
        "text": "¿Qué tipo de vestido buscas?"
      },
      "footer": {
        "text": "Responde para continuar"
      },
      "buttons": [
        {
          "id": "opt_fiesta",
          "title": "Vestidos de fiesta"
        },
        {
          "id": "opt_casual",
          "title": "Casuales"
        },
        {
          "id": "opt_formal",
          "title": "Formales"
        }
      ]
    },
    "context": {
      "source": "laravel_crm"
    }
  }'
```

**Constraints:**
- Max 3 buttons
- Button title max 20 characters
- Header text max 60 characters
- Body text max 1024 characters
- Footer text max 60 characters

---

## 4. Interactive List (Max 10 sections, 10 rows each)

```bash
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+51959166911",
    "type": "interactive",
    "interactive": {
      "kind": "list",
      "header": {
        "type": "text",
        "text": "Catálogo de productos"
      },
      "body": {
        "text": "Selecciona la categoría que te interesa"
      },
      "footer": {
        "text": "Toca para ver opciones"
      },
      "button": "Ver opciones",
      "sections": [
        {
          "title": "Vestidos",
          "rows": [
            {
              "id": "row_fiesta",
              "title": "Vestidos de fiesta",
              "description": "Colección elegante"
            },
            {
              "id": "row_casual",
              "title": "Casuales",
              "description": "Para el día a día"
            }
          ]
        },
        {
          "title": "Accesorios",
          "rows": [
            {
              "id": "row_bolsos",
              "title": "Bolsos",
              "description": "Bolsos de mano"
            }
          ]
        }
      ]
    },
    "context": {
      "source": "laravel_crm"
    }
  }'
```

**Constraints:**
- Button text max 20 characters
- Max 10 sections
- Max 10 rows per section
- Section title max 24 characters
- Row title max 24 characters
- Row description max 72 characters

---

## 5. Template Message (for 24h window closed)

```bash
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+51959166911",
    "type": "template",
    "template": {
      "name": "order_confirmation",
      "language": "es",
      "components": [
        {
          "type": "body",
          "parameters": [
            {
              "type": "text",
              "text": "Juan Pérez"
            },
            {
              "type": "text",
              "text": "ORD-12345"
            }
          ]
        }
      ]
    },
    "context": {
      "source": "laravel_crm"
    }
  }'
```

---

## 6. Legacy Payload (Backward Compatibility)

```bash
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "wa_id": "msg_12345",
    "sender_phone": "+51959166911",
    "message_body": "Mensaje legacy",
    "direction": "outbound"
  }'
```

**Note:** This is automatically transformed to the new format internally.

---

## 7. Inspect Trace

```bash
curl http://localhost:3000/api/messages?trace_id=trace_1715184000000_abc123
```

---

## 8. Get Recent Messages

```bash
curl http://localhost:3000/api/messages?limit=20
```

---

## 9. Filter by Phone Number

```bash
curl http://localhost:3000/api/messages?phone=51959166911&limit=10
```

---

## Error Responses

### 400 - Validation Error
```json
{
  "ok": false,
  "provider": "meta",
  "status": "failed",
  "meta_phone_id": "1200045469848616",
  "trace_id": "trace_...",
  "error": {
    "code": 400,
    "message": "Button title exceeds 20 characters",
    "type": "ValidationError"
  }
}
```

### 131030 - Invalid Token / Recipient Not Allowed
```json
{
  "ok": false,
  "provider": "meta",
  "status": "failed",
  "meta_phone_id": "1200045469848616",
  "trace_id": "trace_...",
  "error": {
    "code": 131030,
    "message": "Recipient phone number not in allowed list",
    "type": "OAuthException"
  }
}
```

### 131047 - 24h Window Closed
```json
{
  "ok": false,
  "provider": "meta",
  "status": "failed",
  "meta_phone_id": "1200045469848616",
  "trace_id": "trace_...",
  "error": {
    "code": 131047,
    "message": "Message window closed - Consider using a template message",
    "type": "OAuthException"
  }
}
```

### 100 - Invalid Phone ID
```json
{
  "ok": false,
  "provider": "meta",
  "status": "failed",
  "meta_phone_id": "1134614116398339",
  "trace_id": "trace_...",
  "error": {
    "code": 100,
    "message": "Unsupported post request. Object with ID '1134614116398339' does not exist",
    "type": "GraphMethodException"
  }
}
```
