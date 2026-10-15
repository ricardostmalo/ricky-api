# Authentication

URL: https://getricky.ai/en/docs/api/authentication

> Create keys with the fewest scopes and send them from your server.

Every request carries an organization API key in the `Authorization` header. The key decides which organization you see and which operations you can call.

## Create a key

Only owners and admins of the organization can create and revoke keys.

1. Open **Settings → API** in Ricky.
2. Enter a name that identifies the integration, for example `Store ERP`.
3. Select only the scopes the integration needs.
4. Choose the expiry: 90 days or 1 year.
5. Select **Create key** and copy the key.

Ricky shows the full key once and stores only its SHA-256 digest. If you lose it, create another one.

A key has the form `rky_live_` followed by 43 characters.

## Send the key

```bash
curl https://getricky.ai/api/v1/members \
  -H "Authorization: Bearer rky_live_…"
```

Use the key only on your server. Never put it in a web page, a mobile app, a URL or a log. Keep it in a secret manager or an environment variable.

## Lifetime

The key belongs to the organization, not to a person. It keeps working when its creator leaves the organization or changes role; what the key does is recorded under that person's name. It stops working only in these cases:

* Someone revokes it in **Settings → API**. The effect is immediate.
* It reaches its expiry date.

When someone who knew the key leaves your team, rotate it.

A key that no longer works gets `401 unauthorized`.

To rotate a key, create the new one, deploy it to your server and revoke the old one.

## Scopes

Each operation requires one scope. A key without it gets `403 insufficient_scope`.

| Scope                 | Allows                                                              |
| --------------------- | ------------------------------------------------------------------- |
| `contacts:read`       | Read contacts and contact fields.                                   |
| `contacts:write`      | Create and update contacts, add notes to them and create tags.      |
| `conversations:read`  | Read conversations, messages and channels.                          |
| `conversations:write` | Assign, close and reopen conversations.                             |
| `messages:send`       | Start conversations, send messages and read sends.                  |
| `templates:read`      | Read WhatsApp templates.                                            |
| `members:read`        | Read the members of the organization.                               |
| `tags:read`           | Read contact tags.                                                  |
| `webhooks:manage`     | Create, list and disable webhooks; read and retry their deliveries. |

The table below is generated from the API contract: it is the exact list of operations and the scope each one requires.

| Operation | Endpoint | Scope |
| --- | --- | --- |
| [List contacts](https://getricky.ai/en/docs/api/reference/contacts/list-contacts) | `GET /contacts` | `contacts:read` |
| [Create a contact](https://getricky.ai/en/docs/api/reference/contacts/create-contact) | `POST /contacts` | `contacts:write` |
| [Get a contact](https://getricky.ai/en/docs/api/reference/contacts/get-contact) | `GET /contacts/{contact_id}` | `contacts:read` |
| [Update a contact](https://getricky.ai/en/docs/api/reference/contacts/update-contact) | `PATCH /contacts/{contact_id}` | `contacts:write` |
| [Add a note to a contact](https://getricky.ai/en/docs/api/reference/contacts/add-contact-note) | `POST /contacts/{contact_id}/notes` | `contacts:write` |
| [List contact fields](https://getricky.ai/en/docs/api/reference/contacts/list-contact-fields) | `GET /contact-fields` | `contacts:read` |
| [List conversations](https://getricky.ai/en/docs/api/reference/conversations/list-conversations) | `GET /conversations` | `conversations:read` |
| [Start a conversation](https://getricky.ai/en/docs/api/reference/conversations/start-conversation) | `POST /conversations` | `messages:send` |
| [Get a conversation](https://getricky.ai/en/docs/api/reference/conversations/get-conversation) | `GET /conversations/{conversation_id}` | `conversations:read` |
| [Assign a conversation](https://getricky.ai/en/docs/api/reference/conversations/assign-conversation) | `PATCH /conversations/{conversation_id}/assignment` | `conversations:write` |
| [Close a conversation](https://getricky.ai/en/docs/api/reference/conversations/close-conversation) | `POST /conversations/{conversation_id}/close` | `conversations:write` |
| [Reopen a conversation](https://getricky.ai/en/docs/api/reference/conversations/reopen-conversation) | `POST /conversations/{conversation_id}/reopen` | `conversations:write` |
| [List messages](https://getricky.ai/en/docs/api/reference/messages/list-messages) | `GET /conversations/{conversation_id}/messages` | `conversations:read` |
| [Get a message](https://getricky.ai/en/docs/api/reference/messages/get-message) | `GET /conversations/{conversation_id}/messages/{message_id}` | `conversations:read` |
| [Send a message](https://getricky.ai/en/docs/api/reference/messages/send-message) | `POST /conversations/{conversation_id}/messages` | `messages:send` |
| [Get a send](https://getricky.ai/en/docs/api/reference/messages/get-send) | `GET /sends/{send_id}` | `messages:send` |
| [List channels](https://getricky.ai/en/docs/api/reference/catalogs/list-channels) | `GET /channels` | `conversations:read` |
| [List members](https://getricky.ai/en/docs/api/reference/catalogs/list-members) | `GET /members` | `members:read` |
| [List tags](https://getricky.ai/en/docs/api/reference/catalogs/list-tags) | `GET /tags` | `tags:read` |
| [Create a tag](https://getricky.ai/en/docs/api/reference/catalogs/create-tag) | `POST /tags` | `contacts:write` |
| [List templates](https://getricky.ai/en/docs/api/reference/catalogs/list-templates) | `GET /templates` | `templates:read` |
| [List webhooks](https://getricky.ai/en/docs/api/reference/webhooks/list-webhooks) | `GET /webhooks` | `webhooks:manage` |
| [Create a webhook](https://getricky.ai/en/docs/api/reference/webhooks/create-webhook) | `POST /webhooks` | `webhooks:manage` |
| [Disable a webhook](https://getricky.ai/en/docs/api/reference/webhooks/disable-webhook) | `DELETE /webhooks/{webhook_id}` | `webhooks:manage` |
| [Send a test event](https://getricky.ai/en/docs/api/reference/webhooks/test-webhook) | `POST /webhooks/{webhook_id}/test` | `webhooks:manage` |
| [Rotate the signing secret](https://getricky.ai/en/docs/api/reference/webhooks/rotate-webhook-secret) | `POST /webhooks/{webhook_id}/rotate-secret` | `webhooks:manage` |
| [List deliveries](https://getricky.ai/en/docs/api/reference/webhooks/list-webhook-deliveries) | `GET /webhooks/{webhook_id}/deliveries` | `webhooks:manage` |
| [Retry a delivery](https://getricky.ai/en/docs/api/reference/webhooks/retry-webhook-delivery) | `POST /webhooks/{webhook_id}/deliveries/{delivery_id}/retry` | `webhooks:manage` |

## Authentication responses

| Situation                                                             | Response                 |
| --------------------------------------------------------------------- | ------------------------ |
| The header is missing or malformed, or the key expired or was revoked | `401 unauthorized`       |
| The key lacks the operation's scope                                   | `403 insufficient_scope` |
| The key made more than 120 requests this minute                       | `429 rate_limited`       |

See [Errors](./errors.md) and [Idempotency, rate limits and retries](./idempotency-and-rate-limits.md).
