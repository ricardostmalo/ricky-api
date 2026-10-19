# Changelog

Also at https://getricky.ai/en/docs/api/changelog.

This page records changes to the API. A breaking change only ships in a new path version and is announced here.

## October 19, 2026

**Workflows.** Compatible changes to v1.

- **Manage workflows.** `GET /workflows`, `POST /workflows`, `GET`, `PATCH` and `DELETE /workflows/{workflow_id}`, `POST /workflows/{workflow_id}/activate` and `POST /workflows/{workflow_id}/pause`. Ricky checks each definition with the rules of the workflow editor. See [Workflows](https://getricky.ai/en/docs/api/workflows).
- **Executions.** `GET /workflows/{workflow_id}/executions` lists a workflow's runs with their status, attempts and errors.
- **New scopes.** `workflows:read` and `workflows:write`.

## October 15, 2026

**Immediate webhooks, new events, files, single messages, tags and notes.** Compatible changes to v1.

- **Immediate webhooks.** Ricky sends each event as soon as it happens, within seconds, and each retry at its time. Before, it sent them in passes every 15 minutes.
- **New events.** `message.delivered`, `message.read`, `message.failed`, `contact.created` and `contact.updated`. Contact events carry `contact_id` in `data`. A webhook accepts up to 10 event types.
- **History imports.** Messages a history import brings in no longer fire `message.*` events.
- **Optional `Idempotency-Key`.** Writes no longer require the header. Without it the request runs; with it a retry does not repeat the effect. A value out of range gets `400 invalid_input`; the `missing_idempotency_key` code no longer exists.
- **Webhook tools.** `POST /webhooks/{webhook_id}/test` sends a `webhook.test` event and returns what your endpoint answered. `POST /webhooks/{webhook_id}/rotate-secret` replaces the signing secret; for the window you choose, every delivery carries the new and the previous signature.
- **Organization keys.** A key keeps working when its creator leaves the organization. Only revocation and expiry end it.
- **Sending files.** `POST /conversations/{conversation_id}/messages` accepts `type: "media"` with the public HTTPS URL of an image, a video, an audio file or a document. Ricky downloads it and sends it on WhatsApp or Instagram. See [Sending messages](https://getricky.ai/en/docs/api/sending-messages#6-send-a-file).
- **Reading one message.** `GET /conversations/{conversation_id}/messages/{message_id}` answers one message as the list shows it, with `media.url` signed again.
- **Creating tags.** `POST /tags` creates a contact tag. It requires `contacts:write`. A name already in use gets `409 conflict`.
- **Adding notes.** `POST /contacts/{contact_id}/notes` adds text at the end of a contact's notes and answers the contact. It requires `contacts:write`.

## October 14, 2026

**First public release of the v1 API reference.**

- **Published contract.** The OpenAPI 3.1 document is at [`https://getricky.ai/openapi.json`](https://getricky.ai/openapi.json). Ricky generates it from the same contract that validates every request. The reference in this documentation comes from that document.
- **Conventions.** Requests and responses use JSON with snake_case fields. A body with an unknown field gets `400 invalid_input`.
- **Lists.** Every list answers `{ "data": [...], "next_cursor": ... }`. See [Pagination](https://getricky.ai/en/docs/api/pagination).
- **Errors.** Every error answers `{ "error": { "code", "message", "param", "request_id" } }`, with a stable code catalog. See [Errors](https://getricky.ai/en/docs/api/errors).
- **Starting conversations.** `POST /conversations` sends a WhatsApp template to a phone number and creates the contact and the conversation when they do not exist.
- **Templates in conversations.** `POST /conversations/{conversation_id}/messages` accepts `type: "template"`.
- **Following sends.** Sends answer `202` with a send. `GET /sends/{send_id}` reports whether the provider accepted it and, once it did, the `message_id` of the message.
- **Contact filters.** `GET /contacts` filters by `query`, `tag_id`, `owner_user_id`, `lifecycle_stage` and `channel`.
- **Catalogs.** `GET /channels` lists the connected channels. `GET /contact-fields` lists the custom fields that key `custom_values`.
- **Webhooks.** The `data` field of every event carries `conversation_id` and, on `message.*` events, `message_id`.
