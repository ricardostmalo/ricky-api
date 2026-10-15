# Introduction

URL: https://getricky.ai/en/docs/api

> Connect your systems to your organization's contacts, conversations and messages.

The Ricky API is a REST API over HTTPS. Each key belongs to one organization and sees only its data. Use it to read and update contacts, start WhatsApp conversations with templates, send messages and receive events by webhook.

## Base URL

```text
https://getricky.ai/api/v1
```

Paths in this documentation are relative to that URL.

## Conventions

| Topic          | Rule                                                                                                                                                  |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Format         | JSON in UTF-8. A request with a body sends `Content-Type: application/json` and is at most 64 KiB.                                                    |
| Names          | Fields and parameters in snake\_case: `primary_phone`, `next_cursor`.                                                                                 |
| IDs            | UUIDs. Template IDs are Meta's and are strings.                                                                                                       |
| Dates          | ISO 8601 in UTC, for example `2026-10-14T15:30:00.000Z`. Dates without a time, such as `birthday`, use `YYYY-MM-DD`.                                  |
| Phone numbers  | `primary_phone` and a WhatsApp channel's `address` are E.164, for example `+50760001234`. A WhatsApp `external_id` is the same number in digits only. |
| Responses      | A resource arrives in `data`. A list arrives in `data`, together with `next_cursor`.                                                                  |
| Errors         | Every non-2xx response has the shape `{ "error": { … } }`. See [Errors](./errors.md).                                                         |
| Unknown fields | A body with a field that does not exist gets `400 invalid_input`. Responses may gain new fields: your code must ignore the ones it does not know.     |

## Versioning

The version is part of the path: `/v1`. Within `v1`, Ricky may ship compatible changes at any time: new endpoints, new optional request fields, new response fields, and new values in enumerations, error codes and event types. Your integration must tolerate those values without failing.

A breaking change only ships in a new path version. Ricky announces it in the [Changelog](./changelog.md).

## Resources

| Resource      | Contents                                                                   | Reference                                                                |
| ------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Contacts      | People in the CRM and their custom fields.                                 | [Contacts](https://getricky.ai/en/docs/api/reference/contacts/list-contacts)                |
| Conversations | Threads with a contact on one channel: start, read, assign, close, reopen. | [Conversations](https://getricky.ai/en/docs/api/reference/conversations/list-conversations) |
| Messages      | Read and send messages, and follow each send.                              | [Messages](https://getricky.ai/en/docs/api/reference/messages/list-messages)                |
| Catalogs      | Channels, members, tags and templates that other operations use by ID.     | [Catalogs](https://getricky.ai/en/docs/api/reference/catalogs/list-channels)                |
| Webhooks      | Event subscriptions and the log of their deliveries.                       | [Webhooks](https://getricky.ai/en/docs/api/reference/webhooks/list-webhooks)                |

The reference is generated from the API contract. The complete OpenAPI 3.1 document is at [`https://getricky.ai/openapi.json`](https://getricky.ai/openapi.json). Use it to generate a client or import it into your API testing tool.

## First request

1. Create a key in **Settings → API** with the `contacts:read` scope. See [Authentication](./authentication.md).
2. Store the key in an environment variable on your server.
3. List contacts:

```bash
curl "https://getricky.ai/api/v1/contacts?page_size=1" \
  -H "Authorization: Bearer $RICKY_API_KEY"
```

```json title="200 OK"
{
  "data": [
    {
      "id": "c1f0a8e2-5b3d-4c7a-9e21-7d6b4a3f2e10",
      "first_name": "Ana",
      "last_name": "Pérez",
      "primary_email": "ana.perez@example.com",
      "primary_phone": "+50760001234",
      "company": null,
      "job_title": null,
      "birthday": "1990-03-21",
      "city": "Panamá",
      "region": null,
      "country": "Panamá",
      "street_address": null,
      "postal_code": null,
      "website_url": null,
      "linkedin_url": null,
      "source": "Tienda Costa del Este",
      "notes": null,
      "owner_user_id": "2d4f6a8c-0e1b-4c3d-9e5f-7a9b1c3d5e7f",
      "lead_status": null,
      "lifecycle_stage": "customer",
      "custom_values": {
        "6b5a4c3d-2e1f-4a0b-9c8d-7e6f5a4b3c2d": "Costa del Este"
      },
      "identities": [
        {
          "id": "9a2b7c4d-1e3f-4a5b-8c6d-0e1f2a3b4c5d",
          "channel_type": "whatsapp",
          "external_id": "50760001234",
          "display_name": "Ana Pérez",
          "username": null
        }
      ],
      "tags": [
        {
          "id": "4e7d2c1b-8a9f-4b3e-a1c2-d3e4f5a6b7c8",
          "name": "Cliente frecuente",
          "color": "teal"
        }
      ],
      "last_activity_at": "2026-10-14T15:42:10.512Z",
      "last_activity_preview": "Gracias, ahí estaré.",
      "last_conversation_id": "3f6d2a10-8b7c-4e1d-9a2f-5c4b3e2d1a09",
      "updated_at": "2026-10-14T15:42:10.512Z"
    }
  ],
  "next_cursor": "eyJ0IjoiMjAyNi0xMC0xNFQxNTo0MjoxMC41MTJaIn0"
}
```

`next_cursor` leads to the next page. See [Pagination](./pagination.md).

## Next steps

- [Authentication](./authentication.md): Keys, scopes and expiry.
- [Sending messages](./sending-messages.md): Templates, replies and following each send.
- [Webhooks](./webhooks.md): HMAC-signed events and retries.
- [Errors](./errors.md): Error shape and code catalog.
