# Changelog

Also at https://getricky.ai/docs/api/changelog.

This page records changes to the API. A breaking change only ships in a new path version and is announced here.

## October 14, 2026

**First public release of the v1 API reference.**

- **Published contract.** The OpenAPI 3.1 document is at [`https://getricky.ai/openapi.json`](https://getricky.ai/openapi.json). Ricky generates it from the same contract that validates every request. The reference in this documentation comes from that document.
- **Conventions.** Requests and responses use JSON with snake_case fields. A body with an unknown field gets `400 invalid_input`.
- **Lists.** Every list answers `{ "data": [...], "next_cursor": ... }`. See [Pagination](/en/docs/api/pagination).
- **Errors.** Every error answers `{ "error": { "code", "message", "param", "request_id" } }`, with a stable code catalog. See [Errors](/en/docs/api/errors).
- **Starting conversations.** `POST /conversations` sends a WhatsApp template to a phone number and creates the contact and the conversation when they do not exist.
- **Templates in conversations.** `POST /conversations/{conversation_id}/messages` accepts `type: "template"`.
- **Following sends.** Sends answer `202` with a send. `GET /sends/{send_id}` reports whether the provider accepted it and, once it did, the `message_id` of the message.
- **Contact filters.** `GET /contacts` filters by `query`, `tag_id`, `owner_user_id`, `lifecycle_stage` and `channel`.
- **Catalogs.** `GET /channels` lists the connected channels. `GET /contact-fields` lists the custom fields that key `custom_values`.
- **Webhooks.** The `data` field of every event carries `conversation_id` and, on `message.*` events, `message_id`.
