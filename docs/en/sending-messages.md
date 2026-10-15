# Sending messages

URL: https://getricky.ai/en/docs/api/sending-messages

> Start WhatsApp conversations with templates, follow each send, and reply with text or files inside the reply window.

This guide walks through the flow of a business system, for example an ERP that tells a customer their glasses are ready:

1. Choose the channel and the template.
2. Send the template to the customer's phone.
3. Follow the send.
4. Receive the customer's reply.
5. Reply with text while the window is open.
6. Send a file.

The key needs the `conversations:read`, `templates:read` and `messages:send` scopes.

## 1. Choose the channel and the template

List the channels and take the `id` of the WhatsApp number you will write from.

```bash
curl https://getricky.ai/api/v1/channels \
  -H "Authorization: Bearer $RICKY_API_KEY"
```

```json title="200 OK"
{
  "data": [
    {
      "id": "0b6f2c1e-7d4a-4c8e-9f3b-2a1d5e6c7b80",
      "type": "whatsapp",
      "name": "Óptica Central",
      "address": "+50720001000",
      "whatsapp_business_account_id": "102938475610293",
      "connected_at": "2026-09-02T14:10:00.000Z"
    }
  ],
  "next_cursor": null
}
```

List the templates. Ricky reads them live from Meta.

```bash
curl https://getricky.ai/api/v1/templates \
  -H "Authorization: Bearer $RICKY_API_KEY"
```

```json title="200 OK"
{
  "data": [
    {
      "id": "1478523690147852",
      "name": "pedido_listo",
      "language": "es",
      "category": "UTILITY",
      "status": "APPROVED",
      "whatsapp_business_account_id": "102938475610293",
      "parameter_format": "POSITIONAL",
      "components": [
        {
          "type": "BODY",
          "text": "Hola {{1}}, tus lentes están listos en {{2}}. Puedes retirarlos desde el {{3}}."
        },
        {
          "type": "FOOTER",
          "text": "Óptica Central"
        }
      ]
    }
  ],
  "next_cursor": null
}
```

Use a template that meets three conditions:

* `status` is `APPROVED`. Ricky rejects any other with `422 rule_violation`.
* `whatsapp_business_account_id` matches the channel's.
* You know its variables: `{{1}}`, `{{2}}`… when `parameter_format` is `POSITIONAL`, or `{{name}}` when it is `NAMED`.

## 2. Send the template

`POST /conversations` sends a template to a phone number. Ricky finds or creates the contact and reuses that number's conversation on that channel. You do not need to create the contact first. `phone` carries the country code, for example `+50760001234`.

```bash
curl https://getricky.ai/api/v1/conversations \
  -H "Authorization: Bearer $RICKY_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: pedido-48213-listo" \
  -d '{
    "channel_id": "0b6f2c1e-7d4a-4c8e-9f3b-2a1d5e6c7b80",
    "phone": "+50760001234",
    "template": {
      "id": "1478523690147852",
      "components": [
        {
          "type": "body",
          "parameters": [
            { "type": "text", "text": "Ana" },
            { "type": "text", "text": "Óptica Central Costa del Este" },
            { "type": "text", "text": "viernes 16 de octubre" }
          ]
        }
      ]
    }
  }'
```

```json title="202 Accepted"
{
  "data": {
    "id": "8f0c2d4e-6a1b-4c3d-8e9f-0a1b2c3d4e5f",
    "conversation_id": "3f6d2a10-8b7c-4e1d-9a2f-5c4b3e2d1a09",
    "status": "queued",
    "message_id": null,
    "failure_reason": null,
    "created_at": "2026-10-14T15:30:02.118Z"
  }
}
```

`202` means Ricky accepted the send and queued it. It does not yet mean WhatsApp accepted it. Keep `id` (the send ID) and `conversation_id`.

Derive the `Idempotency-Key` from your own data, such as the order number. Then, if your system restarts and repeats the send, Ricky does not send the message twice. See [Idempotency](./idempotency-and-rate-limits.md).

### Template variables

`components` uses the WhatsApp Cloud API format. Each item fills the variables of one part of the template:

| `type`   | Use                                                                                                           |
| -------- | ------------------------------------------------------------------------------------------------------------- |
| `header` | Header variables: text, or an `image`, `video` or `document` file with its public HTTPS `link`.               |
| `body`   | Body variables, in order.                                                                                     |
| `button` | Variables of one button. Set `sub_type` (`url` or `quick_reply`) and `index`, the button position from `"0"`. |

In a `NAMED` template, each text parameter carries `parameter_name`:

```json
{
  "type": "body",
  "parameters": [{ "type": "text", "parameter_name": "nombre", "text": "Ana" }]
}
```

A header with an image and a button with a variable URL:

```json
[
  {
    "type": "header",
    "parameters": [{ "type": "image", "image": { "link": "https://example.com/lentes.jpg" } }]
  },
  {
    "type": "button",
    "sub_type": "url",
    "index": "0",
    "parameters": [{ "type": "text", "text": "48213" }]
  }
]
```

Send a template without variables with `"components": []` or without `components`.

### Common errors

| Response             | Cause                                                                                                                         |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `404 not_found`      | The channel does not exist or is disconnected, or the template does not exist.                                                |
| `422 rule_violation` | The channel is not WhatsApp, or the template is not `APPROVED`.                                                               |
| `502 upstream_error` | Ricky could not read the templates from Meta. Follow [Unknown state](./idempotency-and-rate-limits.md#unknown-state). |

## 3. Follow the send

Read the send by its `id`:

```bash
curl https://getricky.ai/api/v1/sends/8f0c2d4e-6a1b-4c3d-8e9f-0a1b2c3d4e5f \
  -H "Authorization: Bearer $RICKY_API_KEY"
```

```json title="200 OK"
{
  "data": {
    "id": "8f0c2d4e-6a1b-4c3d-8e9f-0a1b2c3d4e5f",
    "conversation_id": "3f6d2a10-8b7c-4e1d-9a2f-5c4b3e2d1a09",
    "status": "sent",
    "message_id": "a7e5c3b1-9d8f-4a6e-b2c4-1d3f5e7a9b0c",
    "failure_reason": null,
    "created_at": "2026-10-14T15:30:02.118Z"
  }
}
```

| `status` | Meaning                                                            |
| -------- | ------------------------------------------------------------------ |
| `queued` | Ricky is still handing it to the provider and retries when needed. |
| `sent`   | The provider accepted the message.                                 |
| `failed` | It failed for good. `failure_reason` explains why.                 |

Poll with growing waits, for example at 2, 4 and 8 seconds, until the status is no longer `queued`.

Once the status is `sent`, `message_id` is the message in the conversation: the same `id` the message list shows and the `message.sent` webhook carries.

`sent` does not mean delivered or read. For that, read the message with `GET /conversations/{conversation_id}/messages/{message_id}`: each outbound message carries its `status`, for example `sent`, `delivered`, `read` or `failed`, and the times `sent_at`, `delivered_at` and `read_at`.

## 4. Receive the reply

Subscribe a webhook to the `message.received` event. See [Webhooks](./webhooks.md).

```json title="message.received event"
{
  "id": "5b8e0f3a-2c51-4b8e-9d0e-6f1a2b3c4d5e",
  "type": "message.received",
  "occurred_at": "2026-10-14T15:42:10.000Z",
  "organization_id": "0d9c4b7e-1f2a-4c3d-8e5f-6a7b8c9d0e1f",
  "data": {
    "conversation_id": "3f6d2a10-8b7c-4e1d-9a2f-5c4b3e2d1a09",
    "message_id": "a7e5c3b1-9d8f-4a6e-b2c4-1d3f5e7a9b0c"
  }
}
```

Ricky sends the event as soon as the message arrives, usually within a few seconds.

The event does not carry the text. Read the message with its `message_id`:

```bash
curl https://getricky.ai/api/v1/conversations/3f6d2a10-8b7c-4e1d-9a2f-5c4b3e2d1a09/messages/a7e5c3b1-9d8f-4a6e-b2c4-1d3f5e7a9b0c \
  -H "Authorization: Bearer $RICKY_API_KEY"
```

```json title="200 OK"
{
  "data": {
    "id": "a7e5c3b1-9d8f-4a6e-b2c4-1d3f5e7a9b0c",
    "conversation_id": "3f6d2a10-8b7c-4e1d-9a2f-5c4b3e2d1a09",
    "direction": "inbound",
    "type": "text",
    "text": "Gracias, paso el viernes en la tarde.",
    "sender": { "type": "contact", "name": null },
    "status": "delivered",
    "media": null,
    "provider_message_id": "wamid.HBgLNTA3NjAwMDEyMzQVAgASGBQzRUIwRDFCMkM0RTZGOEEwQjlDMgA=",
    "created_at": "2026-10-14T15:42:11.204Z",
    "sent_at": "2026-10-14T15:42:10.000Z",
    "delivered_at": null,
    "read_at": null,
    "failed_at": null,
    "edited_at": null,
    "deleted_at": null
  }
}
```

When the message carries a file, `media.url` is a signed link valid for one hour, signed again on every read. It is `null` until Ricky has downloaded the file.

To read the whole conversation, list its messages with `GET /conversations/{conversation_id}/messages`. The list starts with the newest.

## 5. Reply with text

While the WhatsApp window is open, reply with text in the same conversation. The window lasts 24 hours from the customer's last message.

```bash
curl https://getricky.ai/api/v1/conversations/3f6d2a10-8b7c-4e1d-9a2f-5c4b3e2d1a09/messages \
  -H "Authorization: Bearer $RICKY_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: pedido-48213-respuesta-1" \
  -d '{ "type": "text", "text": "Perfecto, Ana. Te esperamos el viernes." }'
```

The response is `202` with a send, as in step 2. Follow it with `GET /sends/{send_id}`.

With the window closed, Ricky answers `422 outside_messaging_window`:

```json title="422 Unprocessable Entity"
{
  "error": {
    "code": "outside_messaging_window",
    "message": "…",
    "request_id": "7c1e9a3b-5d2f-4e8a-b6c0-1f3d5a7b9e2c"
  }
}
```

In that case, send a template in the same conversation:

```bash
curl https://getricky.ai/api/v1/conversations/3f6d2a10-8b7c-4e1d-9a2f-5c4b3e2d1a09/messages \
  -H "Authorization: Bearer $RICKY_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: pedido-48213-recordatorio" \
  -d '{
    "type": "template",
    "template": {
      "id": "1478523690147852",
      "components": [
        {
          "type": "body",
          "parameters": [
            { "type": "text", "text": "Ana" },
            { "type": "text", "text": "Óptica Central Costa del Este" },
            { "type": "text", "text": "viernes 16 de octubre" }
          ]
        }
      ]
    }
  }'
```

Templates only exist on WhatsApp: in an Instagram or Messenger conversation, a template gets `422 rule_violation`. On those channels, send text inside each channel's reply window. Text takes up to 4096 characters; on Messenger, up to 2000.

## 6. Send a file

Inside the reply window, send an image, a video, an audio file or a document. Publish the file at a public HTTPS URL; Ricky downloads it before answering and sends it to the customer.

```bash
curl https://getricky.ai/api/v1/conversations/3f6d2a10-8b7c-4e1d-9a2f-5c4b3e2d1a09/messages \
  -H "Authorization: Bearer $RICKY_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: pedido-48213-factura" \
  -d '{
    "type": "media",
    "media": {
      "url": "https://example.com/pedidos/48213/factura.pdf",
      "kind": "document",
      "caption": "Factura del pedido 48213",
      "filename": "factura-48213.pdf"
    }
  }'
```

The response is `202` with a send, as with text.

| Field      | Rule                                                                                            |
| ---------- | ----------------------------------------------------------------------------------------------- |
| `url`      | Public HTTPS on port 443, with a host name. Ricky does not follow redirects.                    |
| `kind`     | `image`, `video`, `audio` or `document`. The file's `Content-Type` must be a type of that kind. |
| `caption`  | Up to 1024 characters. WhatsApp only, and not on audio.                                         |
| `filename` | The name the customer sees for a document. Without it, Ricky uses the last segment of `url`.    |

Types and sizes each channel accepts:

| `kind`     | WhatsApp                                      | Instagram                     |
| ---------- | --------------------------------------------- | ----------------------------- |
| `image`    | JPEG or PNG, up to 5 MB.                      | JPEG, PNG or GIF, up to 8 MB. |
| `video`    | MP4 or 3GP, up to 16 MB.                      | MP4 or MOV, up to 25 MB.      |
| `audio`    | AAC, MP3, M4A, OGG or Opus, up to 16 MB.      | AAC, M4A or WAV, up to 25 MB. |
| `document` | PDF, Word, Excel or PowerPoint, up to 100 MB. | PDF, up to 25 MB.             |

Ricky refuses the file with `400 invalid_input` and `param: "media.url"` when the URL is not public, the host redirects or does not answer `2xx` within 30 seconds, or the type or size does not fit the table. Messenger does not accept files through the API: a file there gets `422 rule_violation`. Outside the WhatsApp window, a file gets `422 outside_messaging_window`, like text.
