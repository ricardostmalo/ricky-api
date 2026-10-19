# Broadcasts

URL: https://getricky.ai/en/docs/api/broadcasts

> Send an approved WhatsApp template to many numbers, now or at a set time, and follow each delivery.

A broadcast sends one approved WhatsApp template to many numbers, like **WhatsApp → Broadcasts** in Ricky. Reading and previewing an audience need the `broadcasts:read` scope; creating and canceling need `broadcasts:write`.

| Operation                                   | What it does                                                    |
| ------------------------------------------- | --------------------------------------------------------------- |
| `GET /broadcasts`                           | Broadcasts newest first, with their delivery counts.            |
| `POST /broadcasts`                          | Creates a broadcast that sends now or at `scheduled_at`.        |
| `POST /broadcasts/preview`                  | Counts the numbers an audience reaches, without creating one.   |
| `GET /broadcasts/{broadcast_id}`            | One broadcast with its delivery counts.                         |
| `POST /broadcasts/{broadcast_id}/cancel`    | Cancels a scheduled broadcast before it starts.                 |
| `GET /broadcasts/{broadcast_id}/recipients` | Each number and where its message stands, filterable by status. |

## 1. Choose the channel and the template

`channel_id` is a WhatsApp channel from `GET /channels`. `template.id` is a template from `GET /templates` whose status is `APPROVED`; `template.components` fills its variables exactly as when [sending a template](./sending-messages.md). Variables the template maps to contact fields in Ricky are filled per contact.

To fill a variable with each recipient's own data, send `mappings`, as the composer in Ricky does:

```json
"mappings": [
  { "component": "body", "key": "1", "source": { "type": "contact", "field": "first_name" } },
  { "component": "body", "key": "2", "source": { "type": "custom_field", "field_id": "3c9d…" } }
]
```

`key` is the variable's number or name; for a URL button, the button's index. `source` is a contact field (`first_name`, `company`, `city`, …) or a custom field from `GET /contact-fields`. Ricky saves the mappings on the template, replacing the ones it had, so the next broadcasts of that template use them too. Omit `mappings` to keep the saved ones; send `[]` to clear them. A recipient without a contact, or with the field empty, receives the text you sent in `template.components`. A `field_id` of another organization gets `404 not_found` with `param: "mappings"`.

## 2. Choose the audience

* `{ "type": "filter", "tag_id": "…", "lifecycle_stage": "customer", "query": "…" }`: every contact that matches all the filters you send. With no filter, every contact.
* `{ "type": "contacts", "contact_ids": ["…"] }`: the contacts you list, up to 1,000. A contact of another organization gets `404 not_found`.
* `{ "type": "phones", "phones": ["+50760001234"] }`: numbers with country code, up to 2,000.

Ricky fixes the recipient list when it creates the broadcast. It uses each contact's phone, or its WhatsApp number, skips contacts without one, and sends once per number, up to 5,000. An audience with no number to send to gets `422 rule_violation`.

To know the size before creating it, send the same `audience` to `POST /broadcasts/preview`:

```bash
curl https://getricky.ai/api/v1/broadcasts/preview \
  -H "Authorization: Bearer $RICKY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "audience": { "type": "filter", "tag_id": "5a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d" } }'
```

It answers `{ "data": { "recipients": 118, "skipped": 3 } }`: the numbers it would go to now and the contacts or numbers left out for lacking a valid WhatsApp number. It creates nothing, and the list can change before you create the broadcast.

## 3. Send now or schedule

```bash
curl https://getricky.ai/api/v1/broadcasts \
  -H "Authorization: Bearer $RICKY_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: promo-octubre-2026" \
  -d '{
    "channel_id": "8f3c2a5e-6b1d-4c7a-9e2f-1a2b3c4d5e6f",
    "template": {
      "id": "1234567890",
      "components": [{ "type": "body", "parameters": [{ "type": "text", "text": "20%" }] }]
    },
    "audience": { "type": "filter", "tag_id": "5a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d" },
    "scheduled_at": "2026-10-20T14:00:00Z"
  }'
```

The answer is `201` with the broadcast. Without `scheduled_at` it is `queued` and starts at once. With it, it is `scheduled` until that time, which must be in the future and at most 7 days ahead. Ricky checks the template at Meta when you create the broadcast.

## 4. Cancel a scheduled broadcast

`POST /broadcasts/{broadcast_id}/cancel` with no body moves a `scheduled` broadcast to `canceled`; nothing is sent. Once it is `queued`, sending or finished, or already canceled, the answer is `409 conflict`.

## 5. Follow the deliveries

`status` moves from `scheduled` or `queued` to `sending` and `completed`, once every message was handed to WhatsApp. `counts` has how many recipients are in each delivery status:

| Status      | Meaning                                                    |
| ----------- | ---------------------------------------------------------- |
| `pending`   | Not sent yet, or WhatsApp has not answered yet.            |
| `sent`      | Accepted by WhatsApp, not yet delivered.                   |
| `delivered` | Delivered to the phone, not yet read.                      |
| `read`      | Read by the recipient.                                     |
| `failed`    | Not delivered; `failure_reason` on the recipient says why. |

`GET /broadcasts/{broadcast_id}/recipients?status=failed` lists the numbers in one status, in number order, with the conversation and the message each one received. Statuses change as WhatsApp reports them, so read again to see them move. Both lists use [cursor pagination](./pagination.md).

To know when a message is delivered or read without asking, subscribe to the `message.delivered`, `message.read` and `message.failed` [webhooks](./webhooks.md): each broadcast message is a message in its conversation.
