# Idempotency, rate limits and retries

URL: https://getricky.ai/en/docs/api/idempotency-and-rate-limits

> Repeat writes without duplicating effects, and stay within the request limit.

## Idempotency-Key

The `Idempotency-Key` header is optional. It makes retries safe: if a request is cut off and your system repeats it with the same key, Ricky does not repeat the effect. A message is not sent twice and a contact is not created twice. Without the header, the request runs normally.

We recommend sending it with every message send. These operations accept it:

| Operation | Endpoint | Scope |
| --- | --- | --- |
| [Create a contact](https://getricky.ai/en/docs/api/reference/contacts/create-contact) | `POST /contacts` | `contacts:write` |
| [Update a contact](https://getricky.ai/en/docs/api/reference/contacts/update-contact) | `PATCH /contacts/{contact_id}` | `contacts:write` |
| [Add a note to a contact](https://getricky.ai/en/docs/api/reference/contacts/add-contact-note) | `POST /contacts/{contact_id}/notes` | `contacts:write` |
| [Start a conversation](https://getricky.ai/en/docs/api/reference/conversations/start-conversation) | `POST /conversations` | `messages:send` |
| [Assign a conversation](https://getricky.ai/en/docs/api/reference/conversations/assign-conversation) | `PATCH /conversations/{conversation_id}/assignment` | `conversations:write` |
| [Close a conversation](https://getricky.ai/en/docs/api/reference/conversations/close-conversation) | `POST /conversations/{conversation_id}/close` | `conversations:write` |
| [Reopen a conversation](https://getricky.ai/en/docs/api/reference/conversations/reopen-conversation) | `POST /conversations/{conversation_id}/reopen` | `conversations:write` |
| [Send a message](https://getricky.ai/en/docs/api/reference/messages/send-message) | `POST /conversations/{conversation_id}/messages` | `messages:send` |
| [Create a tag](https://getricky.ai/en/docs/api/reference/catalogs/create-tag) | `POST /tags` | `contacts:write` |

Creating or disabling a webhook and retrying a delivery do not use this header.

### Rules

* You choose the value: a UUID v4 or, better, an ID from your system for that action, such as `order-10482-ready`, so a retry from your system reuses the same key. It must be 8 to 200 characters long. Do not use personal data such as an email or a phone number.
* The idempotency key is scoped to your API key. Another API key can use the same value without conflict.
* Ricky compares the method, the path and the body. Repeat all three exactly when you retry.
* A value out of range gets `400 invalid_input` with `param: "Idempotency-Key"`.

```bash
curl https://getricky.ai/api/v1/contacts \
  -H "Authorization: Bearer $RICKY_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed" \
  -d '{"first_name": "Ana", "last_name": "Pérez", "primary_phone": "+507 6000-1234"}'
```

### What Ricky answers when a key repeats

| First attempt                          | Repeat with the same key and the same request                                              |
| -------------------------------------- | ------------------------------------------------------------------------------------------ |
| Ended with `2xx`                       | The same response and status, with the `Idempotency-Replayed: true` header. No new effect. |
| Still processing                       | `409 request_processing` with `Retry-After: 5`.                                            |
| Ended with `4xx`                       | Ricky releases the key. The repeat is processed as a new request.                          |
| Ended with `5xx` or without a response | `409 request_processing`. The effect may or may not have happened.                         |

The same key with another method, another path or another body gets `409 idempotency_conflict`.

### Unknown state

After a `5xx`, Ricky does not know whether the effect happened, so the same key keeps answering `409 request_processing`. Do this:

1. Read the resource to learn whether the write happened. For example, after sending a message, list the conversation's messages.
2. If it happened, do nothing else.
3. If it did not happen, repeat the write with a new `Idempotency-Key`.

A new key always creates a new effect. Use one only when you know the first attempt did not happen. If you cannot tell, contact support with the `X-Request-Id`.

## Rate limit

Each API key allows 120 requests per minute. The window is the clock minute: it resets at second 0 of every minute.

Every response to a valid key, success or error, includes:

| Header                  | Value                                          |
| ----------------------- | ---------------------------------------------- |
| `X-RateLimit-Limit`     | Requests per minute: `120`.                    |
| `X-RateLimit-Remaining` | Requests left in the current minute.           |
| `X-RateLimit-Reset`     | Unix time, in seconds, when the window resets. |

Over the limit, the response is `429 rate_limited` with `Retry-After`, in seconds, and the same `X-RateLimit-*` headers. Wait that long before sending another request with that key.

If you need to process many records, spread the requests over time and read `X-RateLimit-Remaining` before each batch.

## Retries

Retry only what can succeed unchanged. Wait longer between attempts: exponential backoff with random jitter, for example 1, 2, 4, 8 and 16 seconds, up to 5 attempts. If the response carries `Retry-After`, wait at least that long.

| Response                 | Read (`GET`)               | Write with `Idempotency-Key`                                                                         |
| ------------------------ | -------------------------- | ---------------------------------------------------------------------------------------------------- |
| Network error or timeout | Retry.                     | Retry with the same key.                                                                             |
| `429 rate_limited`       | Retry after `Retry-After`. | Retry with the same key after `Retry-After`.                                                         |
| `409 request_processing` | Does not apply.            | Retry with the same key after `Retry-After`. If it persists, follow [Unknown state](#unknown-state). |
| `500`, `502` or `503`    | Retry.                     | Follow [Unknown state](#unknown-state).                                                              |
| Any other `4xx`          | Fix the request.           | Fix the request.                                                                                     |
