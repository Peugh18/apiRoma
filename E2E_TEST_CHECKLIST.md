# E2E Test Checklist - WhatsApp API + Laravel CRM

## Prerequisites
- [ ] roma-api running on localhost:3000
- [ ] Laravel CRM running on localhost:8000
- [ ] ngrok tunnel active and configured in Meta webhook
- [ ] Supabase tables created (chat_logs, app_settings)
- [ ] Meta credentials updated in app_settings
- [ ] Test phone numbers added to Meta sandbox

---

## 1. Text Message Tests

### 1.1 Send Text Message (New Contract)
- [ ] Send POST /api/messages with type: "text"
- [ ] Verify response status: 200
- [ ] Verify response contains wa_id
- [ ] Verify message received on phone
- [ ] Verify chat_logs entry with message_type: "text"
- [ ] Verify trace_id in logs

```bash
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+51959166911",
    "type": "text",
    "text": {"body": "Test text message"}
  }'
```

### 1.2 Send Text Message (Legacy Contract)
- [ ] Send POST /api/messages with legacy payload
- [ ] Verify automatic transformation to new format
- [ ] Verify response status: 200
- [ ] Verify message received on phone

```bash
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "wa_id": "msg_test_001",
    "sender_phone": "+51959166911",
    "message_body": "Legacy test",
    "direction": "outbound"
  }'
```

### 1.3 Idempotency Test
- [ ] Send same message with same external_message_id twice
- [ ] Verify first request returns 200 with wa_id
- [ ] Verify second request returns 200 with same wa_id (idempotency hit)
- [ ] Verify only one entry in chat_logs

---

## 2. Image Message Tests

### 2.1 Send Image with Caption
- [ ] Send POST /api/messages with type: "image"
- [ ] Verify response status: 200
- [ ] Verify image received on phone
- [ ] Verify caption displayed
- [ ] Verify chat_logs entry with message_type: "image"

```bash
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+51959166911",
    "type": "image",
    "image": {
      "link": "https://example.com/test.jpg",
      "caption": "Test image"
    }
  }'
```

---

## 3. Interactive Buttons Tests

### 3.1 Send Interactive Buttons (Valid)
- [ ] Send POST with 3 buttons (max allowed)
- [ ] Verify response status: 200
- [ ] Verify buttons displayed on phone
- [ ] Verify chat_logs entry with message_type: "interactive_button"

```bash
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+51959166911",
    "type": "interactive",
    "interactive": {
      "kind": "button",
      "header": {"type": "text", "text": "Test Header"},
      "body": {"text": "Select an option"},
      "footer": {"text": "Footer text"},
      "buttons": [
        {"id": "opt_1", "title": "Option 1"},
        {"id": "opt_2", "title": "Option 2"},
        {"id": "opt_3", "title": "Option 3"}
      ]
    }
  }'
```

### 3.2 Interactive Buttons - Validation Error (Too Many Buttons)
- [ ] Send POST with 4 buttons (exceeds limit)
- [ ] Verify response status: 500
- [ ] Verify error code: 400
- [ ] Verify error message: "Maximum 3 buttons allowed"

### 3.3 Interactive Buttons - Validation Error (Title Too Long)
- [ ] Send POST with button title > 20 chars
- [ ] Verify response status: 500
- [ ] Verify error code: 400
- [ ] Verify error message about title length

### 3.4 Button Reply Handling
- [ ] Click button on phone
- [ ] Verify webhook receives button_reply
- [ ] Verify normalized event contains reply_type: "button"
- [ ] Verify normalized event contains button id and title
- [ ] Verify Laravel CRM receives normalized event

---

## 4. Interactive List Tests

### 4.1 Send Interactive List (Valid)
- [ ] Send POST with list containing 2 sections
- [ ] Verify response status: 200
- [ ] Verify list displayed on phone
- [ ] Verify chat_logs entry with message_type: "interactive_list"

```bash
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+51959166911",
    "type": "interactive",
    "interactive": {
      "kind": "list",
      "header": {"type": "text", "text": "Catalog"},
      "body": {"text": "Select category"},
      "button": "View Options",
      "sections": [
        {
          "title": "Category 1",
          "rows": [
            {"id": "row_1", "title": "Item 1", "description": "Desc 1"}
          ]
        }
      ]
    }
  }'
```

### 4.2 Interactive List - Validation Error (Too Many Sections)
- [ ] Send POST with 11 sections (exceeds limit)
- [ ] Verify response status: 500
- [ ] Verify error code: 400

### 4.3 List Reply Handling
- [ ] Select row from list on phone
- [ ] Verify webhook receives list_reply
- [ ] Verify normalized event contains reply_type: "list"
- [ ] Verify normalized event contains row id and title
- [ ] Verify Laravel CRM receives normalized event

---

## 5. Template Message Tests

### 5.1 Send Template Message
- [ ] Create template in Meta Console first
- [ ] Send POST with type: "template"
- [ ] Verify response status: 200
- [ ] Verify template received on phone
- [ ] Verify chat_logs entry with message_type: "template"

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
            {"type": "text", "text": "Test Name"}
          ]
        }
      ]
    }
  }'
```

---

## 6. Webhook Inbound Tests

### 6.1 Receive Text Message
- [ ] Send text message from phone to WhatsApp Business number
- [ ] Verify webhook receives event
- [ ] Verify normalized event has event: "message"
- [ ] Verify normalized event has message_type: "text"
- [ ] Verify chat_logs entry with direction: "inbound"
- [ ] Verify Laravel CRM receives event via forwardMessageToLaravel

### 6.2 Receive Image Message
- [ ] Send image from phone
- [ ] Verify webhook receives event
- [ ] Verify normalized event has message_type: "image"
- [ ] Verify caption is included in text field

### 6.3 Receive Button Reply
- [ ] Send interactive buttons from API
- [ ] Click button on phone
- [ ] Verify webhook receives button_reply
- [ ] Verify normalized event has message_type: "interactive_button_reply"
- [ ] Verify interactive object contains id and title

### 6.4 Receive List Reply
- [ ] Send interactive list from API
- [ ] Select row on phone
- [ ] Verify webhook receives list_reply
- [ ] Verify normalized event has message_type: "interactive_list_reply"

### 6.5 Receive Status Update
- [ ] Send message from API
- [ ] Wait for status update (sent/delivered/read)
- [ ] Verify webhook receives status event
- [ ] Verify normalized event has event: "status"
- [ ] Verify normalized event has status field

---

## 7. Error Handling Tests

### 7.1 Invalid Phone ID (Code 100)
- [ ] Temporarily set invalid meta_phone_id in app_settings
- [ ] Send message
- [ ] Verify response status: 500
- [ ] Verify error code: 100
- [ ] Restore correct meta_phone_id

### 7.2 Invalid Token (Code 131030)
- [ ] Temporarily set invalid meta_access_token
- [ ] Send message
- [ ] Verify response status: 500
- [ ] Verify error code: 131030
- [ ] Restore correct token

### 7.3 Recipient Not Allowed (Code 131030)
- [ ] Send message to phone not in sandbox list
- [ ] Verify response status: 500
- [ ] Verify error code: 131030
- [ ] Verify error message about recipient not allowed

### 7.4 24h Window Closed (Code 131047)
- [ ] Wait for 24h window to close with test number
- [ ] Send free-form message
- [ ] Verify response status: 500
- [ ] Verify error code: 131047
- [ ] Verify error message suggests using template

---

## 8. Laravel CRM Integration Tests

### 8.1 Laravel Sends Message (with header)
- [ ] Trigger message send from Laravel CRM
- [ ] Verify Laravel sends header: x-roma-source: laravel
- [ ] Verify roma-api bypasses Meta send
- [ ] Verify roma-api logs to Supabase
- [ ] Verify roma-api broadcasts via Pusher
- [ ] Verify message arrives on phone (sent by Laravel directly)

### 8.2 Laravel Receives Inbound Message
- [ ] Send message from phone
- [ ] Verify webhook normalizes event
- [ ] Verify forwardMessageToLaravel is called
- [ ] Verify Laravel CRM receives event
- [ ] Verify Laravel CRM processes event correctly

### 8.3 Laravel Receives Button Reply
- [ ] Send interactive buttons from API
- [ ] Click button on phone
- [ ] Verify Laravel receives normalized button reply
- [ ] Verify Laravel extracts button id correctly

### 8.4 Laravel Receives List Reply
- [ ] Send interactive list from API
- [ ] Select row on phone
- [ ] Verify Laravel receives normalized list reply
- [ ] Verify Laravel extracts row id correctly

---

## 9. Observability Tests

### 9.1 Trace ID Inspection
- [ ] Send message
- [ ] Extract trace_id from response
- [ ] Call GET /api/messages?trace_id=xxx
- [ ] Verify returns correct log entry

### 9.2 Structured Logging
- [ ] Send message
- [ ] Check server logs
- [ ] Verify JSON structured logs with trace_id
- [ ] Verify logs include latency_ms

### 9.3 Get Recent Messages
- [ ] Send multiple messages
- [ ] Call GET /api/messages?limit=10
- [ ] Verify returns recent messages
- [ ] Verify ordered by timestamp desc

### 9.4 Filter by Phone
- [ ] Send messages to different phones
- [ ] Call GET /api/messages?phone=51959166911
- [ ] Verify returns only messages for that phone

---

## 10. Performance Tests

### 10.1 Concurrent Messages
- [ ] Send 10 messages concurrently
- [ ] Verify all succeed
- [ ] Verify no duplicates in chat_logs
- [ ] Verify all messages arrive on phone

### 10.2 Idempotency Under Load
- [ ] Send same message 5 times concurrently with same external_message_id
- [ ] Verify only 1 message sent to Meta
- [ ] Verify all requests return 200 with same wa_id

---

## 11. Backward Compatibility Tests

### 11.1 Legacy Payload Still Works
- [ ] Send legacy payload from old Laravel version
- [ ] Verify transformation works
- [ ] Verify message sent successfully
- [ ] Verify response compatible with old Laravel

### 11.2 New Payload with Old Laravel
- [ ] Update Laravel to use new payload
- [ ] Verify roma-api accepts new format
- [ ] Verify response includes all new fields

---

## Sign-off Criteria

All tests must pass before deploying to production:

- [ ] All text message tests pass
- [ ] All image message tests pass
- [ ] All interactive button tests pass
- [ ] All interactive list tests pass
- [ ] All template message tests pass
- [ ] All webhook inbound tests pass
- [ ] All error handling tests pass
- [ ] All Laravel integration tests pass
- [ ] All observability tests pass
- [ ] All performance tests pass
- [ ] All backward compatibility tests pass

---

## Test Environment Notes

- Use Meta sandbox for testing (free tier)
- Add test phone numbers to Meta Console before testing
- Use ngrok for local webhook testing
- Clear chat_logs table between test runs if needed
- Monitor Supabase logs for any database errors
- Check roma-api server logs for detailed trace information
