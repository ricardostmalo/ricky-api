# Webhooks

URL: https://getricky.ai/en/docs/api/webhooks

> Receive signed events from Ricky, verify them and process each one once.

A webhook is a URL on your system that Ricky sends a `POST` to when an event happens in the organization. Ricky signs every delivery and retries it when it fails.

The key needs the `webhooks:manage` scope.

## Create a webhook

```bash
curl https://getricky.ai/api/v1/webhooks \
  -H "Authorization: Bearer $RICKY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://erp.example.com/webhooks/ricky",
    "event_types": ["message.received", "conversation.closed"]
  }'
```

```json title="201 Created"
{
  "data": {
    "id": "e2c4a6b8-0d1f-4e3a-9b5c-7d9f1a3c5e7b",
    "url": "https://erp.example.com/webhooks/ricky",
    "event_types": ["message.received", "conversation.closed"],
    "status": "active",
    "created_at": "2026-10-14T15:00:00.000Z",
    "disabled_at": null,
    "signing_secret": "whsec_…"
  }
}
```

Store `signing_secret` in your secret manager. Ricky shows it only in this response.

The URL must meet these conditions. Otherwise the response is `400 invalid_input` with `param: "url"`.

* It uses HTTPS on port 443.
* It uses a domain name, not an IP address.
* It carries no user name or password.
* The domain resolves to public addresses.

Ricky checks the URL again on every delivery and does not follow redirects.

## Events

| Event                             | Happens when                                                          | `data`                          |
| --------------------------------- | --------------------------------------------------------------------- | ------------------------------- |
| `message.received`                | A contact sends a message.                                            | `conversation_id`, `message_id` |
| `message.sent`                    | The provider accepts a message from the organization.                 | `conversation_id`, `message_id` |
| `message.delivered`               | An outbound message reaches the recipient's phone.                    | `conversation_id`, `message_id` |
| `message.read`                    | The recipient reads an outbound message.                              | `conversation_id`, `message_id` |
| `message.failed`                  | An outbound message fails for good.                                   | `conversation_id`, `message_id` |
| `conversation.opened`             | A conversation is created or reopened.                                | `conversation_id`               |
| `conversation.closed`             | A conversation is closed.                                             | `conversation_id`               |
| `conversation.assignment_changed` | A conversation is assigned, reassigned or unassigned.                 | `conversation_id`               |
| `contact.created`                 | A contact is created: in Ricky, by the API or with its first message. | `contact_id`                    |
| `contact.updated`                 | A contact's fields, tags or values are saved.                         | `contact_id`                    |

`message.sent` fires for every outbound message, not only the ones sent through the API. Messages a history import brings in fire no `message.*` events. For the cause of a `message.failed`, read the message.

The event carries only IDs. For the content, read the resource through the API: [Get a conversation](https://getricky.ai/en/docs/api/reference/conversations/get-conversation) or [List messages](https://getricky.ai/en/docs/api/reference/messages/list-messages).

## The delivery

```http
POST /webhooks/ricky HTTP/1.1
Host: erp.example.com
Content-Type: application/json
User-Agent: Ricky-Webhooks/1.0
X-Ricky-Delivery-Id: 5b8e0f3a-2c51-4b8e-9d0e-6f1a2b3c4d5e
X-Ricky-Timestamp: 1791992702
X-Ricky-Signature: v1=c4a06466fda49cd8401f485eb542ba41573b96f321758a2376acbffdd44c8ded

{"id":"5b8e0f3a-2c51-4b8e-9d0e-6f1a2b3c4d5e","type":"message.received","occurred_at":"2026-10-14T15:42:10.000Z","organization_id":"0d9c4b7e-1f2a-4c3d-8e5f-6a7b8c9d0e1f","data":{"conversation_id":"3f6d2a10-8b7c-4e1d-9a2f-5c4b3e2d1a09","message_id":"a7e5c3b1-9d8f-4a6e-b2c4-1d3f5e7a9b0c"}}
```

| Header                | Value                                                              |
| --------------------- | ------------------------------------------------------------------ |
| `X-Ricky-Delivery-Id` | Delivery ID. It equals the body's `id`.                            |
| `X-Ricky-Timestamp`   | Unix time, in seconds, of this attempt. It changes on every retry. |
| `X-Ricky-Signature`   | `v1=` followed by the hex HMAC-SHA256.                             |

| Body field        | Description                                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `id`              | Delivery ID. Use it to drop duplicates.                                                                                 |
| `type`            | Event type.                                                                                                             |
| `occurred_at`     | When it happened, in ISO 8601 UTC.                                                                                      |
| `organization_id` | The event's organization.                                                                                               |
| `data`            | `conversation_id` on `message.*` and `conversation.*` events; `message_id` on `message.*`; `contact_id` on `contact.*`. |

## Verify the signature

Verify every delivery before you use it:

1. Read the raw body, as bytes, before parsing it as JSON. A re-serialized body does not match.
2. Reject the delivery if `X-Ricky-Timestamp` is more than 5 minutes away from your clock.
3. Compute the HMAC-SHA256 of `<X-Ricky-Timestamp>.<raw body>`. The key is the full `signing_secret`, including the `whsec_` prefix.
4. Compare the hex result with what follows `v1=`, in constant time. During a secret rotation the header carries two comma-separated signatures: accept the delivery if either matches.

**Node.js**

```js
import { createHmac, timingSafeEqual } from 'node:crypto';
import express from 'express';

const SECRET = process.env.RICKY_WEBHOOK_SECRET; // whsec_…
const TOLERANCE_SECONDS = 5 * 60;

export function verifyRickySignature(rawBody, timestamp, signature, secret = SECRET) {
  if (!timestamp || !signature) return false;
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!(age <= TOLERANCE_SECONDS)) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.`).update(rawBody).digest();
  // During a secret rotation the header carries two comma-separated signatures.
  return signature.split(',').some((candidate) => {
    if (!candidate.startsWith('v1=')) return false;
    const received = Buffer.from(candidate.slice(3), 'hex');
    return received.length === expected.length && timingSafeEqual(received, expected);
  });
}

const app = express();

// express.raw() keeps the body as bytes, exactly as Ricky signed it.
app.post('/webhooks/ricky', express.raw({ type: 'application/json' }), async (req, res) => {
  const valid = verifyRickySignature(
    req.body,
    req.get('X-Ricky-Timestamp'),
    req.get('X-Ricky-Signature'),
  );
  if (!valid) return res.sendStatus(401);
  const event = JSON.parse(req.body.toString('utf8'));
  await saveEventOnce(event); // your code: store it with event.id as a unique key
  res.sendStatus(204);
});
```

**Python**

```python
import hashlib
import hmac
import json
import os
import time

from flask import Flask, request

SECRET = os.environ["RICKY_WEBHOOK_SECRET"].encode()  # whsec_…
TOLERANCE_SECONDS = 5 * 60

def verify_ricky_signature(
    raw_body: bytes, timestamp: str | None, signature: str | None, secret: bytes = SECRET
) -> bool:
    if not timestamp or not signature:
        return False
    try:
        age = abs(time.time() - int(timestamp))
    except ValueError:
        return False
    if age > TOLERANCE_SECONDS:
        return False
    expected = hmac.new(secret, timestamp.encode() + b"." + raw_body, hashlib.sha256).hexdigest()
    # During a secret rotation the header carries two comma-separated signatures.
    return any(
        candidate.startswith("v1=") and hmac.compare_digest(expected.encode(), candidate[3:].encode())
        for candidate in signature.split(",")
    )

app = Flask(__name__)

@app.post("/webhooks/ricky")
def ricky_webhook():
    raw_body = request.get_data()  # the bytes Ricky signed
    if not verify_ricky_signature(
        raw_body,
        request.headers.get("X-Ricky-Timestamp"),
        request.headers.get("X-Ricky-Signature"),
    ):
        return "", 401
    event = json.loads(raw_body)
    save_event_once(event)  # your code: store it with event["id"] as a unique key
    return "", 204
```

### Test your verification

With these exact values, the HMAC must match. The 5-minute check fails at this time, so test it separately or freeze the clock in your test.

| Input     | Value                                                                                             |
| --------- | ------------------------------------------------------------------------------------------------- |
| Secret    | `whsec_test_5YtV0kq9mUz2Rr8Lw3Nf1Hc6Pb4Xa7Ds0Ge2Jo9Ki8`                                           |
| Timestamp | `1791992702`                                                                                      |
| Body      | The body of the example in [The delivery](#the-delivery), with no spaces and no trailing newline. |
| Signature | `v1=c4a06466fda49cd8401f485eb542ba41573b96f321758a2376acbffdd44c8ded`                             |

## Respond

* Answer with any `2xx` status within 10 seconds. Ricky closes the connection at 10 seconds and counts it as a failure.
* Store the event and respond. Do the heavy work afterwards, outside the request.
* A redirect, a non-`2xx` status, a network error or a response larger than 64 KiB counts as a failure.

## Cadence and retries

Ricky sends each event as soon as it happens, usually within a few seconds.

When an attempt fails, Ricky waits before the next one: at least 30 seconds after the first failure, doubling each time, up to 1 hour. Each retry leaves at its time. After 10 failed attempts, the delivery becomes `failed`.

## Duplicates and order

* The same delivery can arrive more than once, for example when your server answered after the 10 seconds. Drop duplicates by `id`.
* Deliveries can arrive in a different order than the events. Order them by `occurred_at` and read the current state through the API before acting.

## Delivery log

`GET /webhooks/{webhook_id}/deliveries` returns the 100 most recent deliveries of a webhook.

```json title="200 OK"
{
  "data": [
    {
      "id": "5b8e0f3a-2c51-4b8e-9d0e-6f1a2b3c4d5e",
      "event_type": "message.received",
      "status": "failed",
      "attempts": 10,
      "last_response_status": 503,
      "last_error": "HTTP 503",
      "created_at": "2026-10-14T15:42:10.000Z",
      "next_attempt_at": "2026-10-15T00:12:41.000Z",
      "delivered_at": null
    }
  ],
  "next_cursor": null
}
```

| `status`     | Meaning                                                      |
| ------------ | ------------------------------------------------------------ |
| `pending`    | Waiting for its next attempt, at `next_attempt_at` or later. |
| `processing` | Ricky is sending it.                                         |
| `delivered`  | Your server answered `2xx`.                                  |
| `failed`     | It used up its 10 attempts.                                  |

## Manual retry

After fixing your server, queue a `failed` delivery again:

```bash
curl -X POST https://getricky.ai/api/v1/webhooks/e2c4a6b8-0d1f-4e3a-9b5c-7d9f1a3c5e7b/deliveries/5b8e0f3a-2c51-4b8e-9d0e-6f1a2b3c4d5e/retry \
  -H "Authorization: Bearer $RICKY_API_KEY"
```

The delivery goes back to `pending` with 10 fresh attempts and leaves at once. Only `failed` deliveries of an active webhook can be retried; any other gets `404 not_found`.

## Disable a webhook

`DELETE /webhooks/{webhook_id}` stops new and pending deliveries. A disabled webhook cannot be enabled again: create another one. Disabling it twice answers `404 not_found`.

## Send a test event

To check your endpoint without waiting for a real event:

```bash
curl -X POST https://getricky.ai/api/v1/webhooks/e2c4a6b8-0d1f-4e3a-9b5c-7d9f1a3c5e7b/test \
  -H "Authorization: Bearer $RICKY_API_KEY"
```

```json title="200 OK"
{
  "data": { "delivered": true, "response_status": 200, "error": null, "duration_ms": 184 }
}
```

Ricky sends a `webhook.test` event at once, signed like any other, with `data.webhook_id`. The response tells you what your endpoint answered. The test is not recorded as a delivery and is not retried.

## Rotate the secret

```bash
curl -X POST https://getricky.ai/api/v1/webhooks/e2c4a6b8-0d1f-4e3a-9b5c-7d9f1a3c5e7b/rotate-secret \
  -H "Authorization: Bearer $RICKY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"expire_previous_after_hours": 24}'
```

The response carries the new `signing_secret`; Ricky shows it only in this response. For the hours you choose, 0 to 72 (24 without a body), every delivery carries two signatures: `v1=<new>,v1=<previous>`. Deploy the new secret within that window; the verification above accepts either. With `0`, the previous secret stops signing at once.
