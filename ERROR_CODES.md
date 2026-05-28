# Meta WhatsApp API Error Codes - roma-api

## Error Response Format

All errors from roma-api follow this format:

```json
{
  "ok": false,
  "provider": "meta",
  "status": "failed",
  "meta_phone_id": "1200045469848616",
  "trace_id": "trace_1715184000000_abc123",
  "error": {
    "code": 100,
    "message": "Error description",
    "type": "ErrorType"
  }
}
```

---

## Client Errors (4xx) - No Retry

### Code 100 - Invalid Object ID
**Type:** `GraphMethodException`  
**Retry:** NO  
**Cause:** The `meta_phone_id` configured in `app_settings` does not exist in Meta.  
**Solution:** Update `meta_phone_id` in Supabase with the correct Phone Number ID from Meta Console.

```json
{
  "code": 100,
  "message": "Unsupported post request. Object with ID '1134614116398339' does not exist",
  "type": "GraphMethodException"
}
```

---

### Code 131030 - Invalid Token / Recipient Not Allowed
**Type:** `OAuthException`  
**Retry:** NO  
**Cause:** 
- Access token is invalid or expired
- Recipient phone number is not in the allowed list (sandbox mode)

**Solution:**
- Generate a new access token in Meta Console
- Add recipient phone number to test numbers in WhatsApp API Setup

```json
{
  "code": 131030,
  "message": "Recipient phone number not in allowed list",
  "type": "OAuthException"
}
```

---

### Code 131047 - 24h Message Window Closed
**Type:** `OAuthException`  
**Retry:** NO  
**Cause:** Attempting to send a free-form message when the 24-hour conversation window is closed.  
**Solution:** Use a template message instead.

```json
{
  "code": 131047,
  "message": "Message window closed - Consider using a template message",
  "type": "OAuthException"
}
```

---

### Code 400 - Validation Error
**Type:** `ValidationError`  
**Retry:** NO  
**Cause:** Payload validation failed (e.g., button title too long, too many buttons).  
**Solution:** Fix the payload according to Meta constraints.

```json
{
  "code": 400,
  "message": "Button title exceeds 20 characters",
  "type": "ValidationError"
}
```

**Common Validation Constraints:**
- Interactive buttons: Max 3 buttons, title max 20 chars
- Interactive list: Max 10 sections, 10 rows per section
- Row title: Max 24 chars, description max 72 chars
- Header text: Max 60 chars
- Body text: Max 1024 chars
- Footer text: Max 60 chars

---

## Server Errors (5xx) - Retry

### Code 429 - Rate Limit
**Type:** `RateLimitError`  
**Retry:** YES (exponential backoff)  
**Cause:** Too many requests to Meta API.  
**Solution:** Implement rate limiting and retry with exponential backoff.

```json
{
  "code": 429,
  "message": "Rate limit exceeded",
  "type": "RateLimitError"
}
```

---

### Code 500 - Internal Server Error
**Type:** `NetworkError` or `ServerError`  
**Retry:** YES  
**Cause:** 
- Network timeout
- Meta API internal error
- Unknown error

```json
{
  "code": 500,
  "message": "Network error",
  "type": "NetworkError"
}
```

---

## roma-api Specific Errors

### System Unconfigured
**Code:** 500  
**Type:** `ClientError`  
**Cause:** Settings not found in `app_settings` table.  
**Solution:** Ensure `app_settings` table exists and has a row with `id=1`.

```json
{
  "code": 500,
  "message": "System unconfigured",
  "type": "ClientError"
}
```

---

### Internal Server Error
**Code:** 500  
**Type:** `ServerError`  
**Cause:** Unexpected error in roma-api code.  
**Solution:** Check server logs with `trace_id`.

```json
{
  "code": 500,
  "message": "Internal Server Error",
  "type": "ServerError"
}
```

---

## Retry Logic

The `MetaWhatsAppClient.isRetryableError()` method determines if an error should be retried:

```typescript
isRetryableError(error?: MetaError): boolean {
  // Retry on rate limits (429)
  if (error?.code === 429) return true;
  
  // Retry on server errors (5xx)
  if (error?.code >= 500 && error?.code < 600) return true;
  
  // Retry on network errors
  if (error?.type === 'NetworkError') return true;
  
  // Do NOT retry on client errors (4xx except 429)
  return false;
}
```

**Retry Strategy:**
- Rate limit (429): Exponential backoff starting at 1s, max 30s
- Server errors (5xx): Up to 3 retries with exponential backoff
- Network errors: Up to 3 retries with exponential backoff

---

## Error Handling in Laravel CRM

When Laravel receives an error from roma-api:

1. **Check `error.code`** to determine the type
2. **Log the `trace_id`** for debugging
3. **Handle based on error type:**
   - Code 100: Alert admin to update `meta_phone_id`
   - Code 131030: Alert admin to update token or add recipient
   - Code 131047: Switch to template message
   - Code 400: Fix payload validation
   - Code 429/5xx: Implement retry logic in Laravel job
4. **Update message status** in CRM database to `failed`

---

## Monitoring

Monitor these metrics for error rates:

- Total messages sent
- Messages failed by error code
- Average latency per message type
- Idempotency hit rate (duplicate requests)

Use `GET /api/messages?trace_id=xxx` to inspect failed requests.
