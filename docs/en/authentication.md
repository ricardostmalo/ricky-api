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

Each operation requires one scope. A key without it gets `403 insufficient_scope`. `POST /tags` also accepts `contacts:write`, the scope it required before `tags:write` existed.

| Scope                 | Allows                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------- |
| `contacts:read`       | Read contacts and contact fields.                                                                       |
| `contacts:write`      | Create and update contacts, add notes to them, change their tags, and create and delete contact fields. |
| `conversations:read`  | Read and search conversations, messages, channels and WhatsApp numbers.                                 |
| `conversations:write` | Assign, close, reopen and mark conversations read, set their AI agent, and manage WhatsApp numbers.     |
| `messages:send`       | Start conversations, send messages and read sends.                                                      |
| `templates:read`      | Read WhatsApp templates and validate drafts.                                                            |
| `templates:write`     | Create, edit and delete WhatsApp templates, upload their header samples and map their variables.        |
| `members:read`        | Read the members of the organization.                                                                   |
| `tags:read`           | Read contact tags.                                                                                      |
| `webhooks:manage`     | Create, list and disable webhooks; read and retry their deliveries.                                     |
| `workflows:read`      | Read workflows, their executions, and appointment reminder previews and history.                        |
| `workflows:write`     | Create, edit, activate, pause and delete workflows, and set a scheduled workflow's header file.         |
| `reports:read`        | Read the numbers of the Reports pages.                                                                  |
| `agents:read`         | Read agents and their configuration options.                                                            |
| `agents:write`        | Create, update and archive agents.                                                                      |
| `knowledge:read`      | Read knowledge locations, directory contacts and files.                                                 |
| `knowledge:write`     | Create, update and delete knowledge locations, directory contacts and files.                            |
| `tags:write`          | Create, edit and delete tags.                                                                           |
| `quick_replies:read`  | Read quick replies.                                                                                     |
| `quick_replies:write` | Create, update and delete quick replies.                                                                |
| `broadcasts:read`     | Read broadcasts, their counts and each recipient's delivery status, and preview an audience.            |
| `broadcasts:write`    | Create, schedule and cancel broadcasts.                                                                 |

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
| [Create a tag](https://getricky.ai/en/docs/api/reference/catalogs/create-tag) | `POST /tags` | `tags:write` or, on older keys, `contacts:write` |
| [List webhooks](https://getricky.ai/en/docs/api/reference/webhooks/list-webhooks) | `GET /webhooks` | `webhooks:manage` |
| [Create a webhook](https://getricky.ai/en/docs/api/reference/webhooks/create-webhook) | `POST /webhooks` | `webhooks:manage` |
| [Disable a webhook](https://getricky.ai/en/docs/api/reference/webhooks/disable-webhook) | `DELETE /webhooks/{webhook_id}` | `webhooks:manage` |
| [Send a test event](https://getricky.ai/en/docs/api/reference/webhooks/test-webhook) | `POST /webhooks/{webhook_id}/test` | `webhooks:manage` |
| [Rotate the signing secret](https://getricky.ai/en/docs/api/reference/webhooks/rotate-webhook-secret) | `POST /webhooks/{webhook_id}/rotate-secret` | `webhooks:manage` |
| [List deliveries](https://getricky.ai/en/docs/api/reference/webhooks/list-webhook-deliveries) | `GET /webhooks/{webhook_id}/deliveries` | `webhooks:manage` |
| [Retry a delivery](https://getricky.ai/en/docs/api/reference/webhooks/retry-webhook-delivery) | `POST /webhooks/{webhook_id}/deliveries/{delivery_id}/retry` | `webhooks:manage` |
| [List workflows](https://getricky.ai/en/docs/api/reference/workflows/list-workflows) | `GET /workflows` | `workflows:read` |
| [Create a workflow](https://getricky.ai/en/docs/api/reference/workflows/create-workflow) | `POST /workflows` | `workflows:write` |
| [Get a workflow](https://getricky.ai/en/docs/api/reference/workflows/get-workflow) | `GET /workflows/{workflow_id}` | `workflows:read` |
| [Update a workflow](https://getricky.ai/en/docs/api/reference/workflows/update-workflow) | `PATCH /workflows/{workflow_id}` | `workflows:write` |
| [Delete a workflow](https://getricky.ai/en/docs/api/reference/workflows/delete-workflow) | `DELETE /workflows/{workflow_id}` | `workflows:write` |
| [Activate a workflow](https://getricky.ai/en/docs/api/reference/workflows/activate-workflow) | `POST /workflows/{workflow_id}/activate` | `workflows:write` |
| [Pause a workflow](https://getricky.ai/en/docs/api/reference/workflows/pause-workflow) | `POST /workflows/{workflow_id}/pause` | `workflows:write` |
| [List executions](https://getricky.ai/en/docs/api/reference/workflows/list-workflow-executions) | `GET /workflows/{workflow_id}/executions` | `workflows:read` |
| [Set the header file of a scheduled workflow](https://getricky.ai/en/docs/api/reference/workflows/upload-workflow-header-media) | `POST /workflows/{workflow_id}/header-media` | `workflows:write` |
| [Preview appointment reminders](https://getricky.ai/en/docs/api/reference/workflows/preview-workflow-reminders) | `GET /workflows/{workflow_id}/reminders/preview` | `workflows:read` |
| [Get appointment reminder history](https://getricky.ai/en/docs/api/reference/workflows/get-workflow-reminder-history) | `GET /workflows/{workflow_id}/reminders/history` | `workflows:read` |
| [List the Odoo appointment states](https://getricky.ai/en/docs/api/reference/workflows/list-workflow-reminder-states) | `GET /workflows/{workflow_id}/reminders/state-options` | `workflows:read` |
| [Get the live dashboard](https://getricky.ai/en/docs/api/reference/reports/get-dashboard-report) | `GET /reports/dashboard` | `reports:read` |
| [Get the conversations report](https://getricky.ai/en/docs/api/reference/reports/get-conversations-report) | `GET /reports/conversations` | `reports:read` |
| [Get the messages report](https://getricky.ai/en/docs/api/reference/reports/get-messages-report) | `GET /reports/messages` | `reports:read` |
| [Get the responses report](https://getricky.ai/en/docs/api/reference/reports/get-responses-report) | `GET /reports/responses` | `reports:read` |
| [Get the resolutions report](https://getricky.ai/en/docs/api/reference/reports/get-resolutions-report) | `GET /reports/resolutions` | `reports:read` |
| [Get the team report](https://getricky.ai/en/docs/api/reference/reports/get-team-report) | `GET /reports/team` | `reports:read` |
| [Get the broadcasts report](https://getricky.ai/en/docs/api/reference/reports/get-broadcasts-report) | `GET /reports/broadcasts` | `reports:read` |
| [Get the ads report](https://getricky.ai/en/docs/api/reference/reports/get-ads-report) | `GET /reports/ads` | `reports:read` |
| [List agents](https://getricky.ai/en/docs/api/reference/agents/list-agents) | `GET /agents` | `agents:read` |
| [Create an agent](https://getricky.ai/en/docs/api/reference/agents/create-agent) | `POST /agents` | `agents:write` |
| [Get an agent](https://getricky.ai/en/docs/api/reference/agents/get-agent) | `GET /agents/{agent_id}` | `agents:read` |
| [Update an agent](https://getricky.ai/en/docs/api/reference/agents/update-agent) | `PATCH /agents/{agent_id}` | `agents:write` |
| [Archive an agent](https://getricky.ai/en/docs/api/reference/agents/archive-agent) | `DELETE /agents/{agent_id}` | `agents:write` |
| [Get agent options](https://getricky.ai/en/docs/api/reference/agents/get-agent-options) | `GET /agent-options` | `agents:read` |
| [Set the AI agent of a conversation](https://getricky.ai/en/docs/api/reference/conversations/assign-conversation-agent) | `PATCH /conversations/{conversation_id}/agent` | `conversations:write` |
| [List locations](https://getricky.ai/en/docs/api/reference/knowledge/list-knowledge-locations) | `GET /knowledge/locations` | `knowledge:read` |
| [Create a location](https://getricky.ai/en/docs/api/reference/knowledge/create-knowledge-location) | `POST /knowledge/locations` | `knowledge:write` |
| [Get a location](https://getricky.ai/en/docs/api/reference/knowledge/get-knowledge-location) | `GET /knowledge/locations/{location_id}` | `knowledge:read` |
| [Update a location](https://getricky.ai/en/docs/api/reference/knowledge/update-knowledge-location) | `PATCH /knowledge/locations/{location_id}` | `knowledge:write` |
| [Delete a location](https://getricky.ai/en/docs/api/reference/knowledge/delete-knowledge-location) | `DELETE /knowledge/locations/{location_id}` | `knowledge:write` |
| [List directory contacts](https://getricky.ai/en/docs/api/reference/knowledge/list-knowledge-contacts) | `GET /knowledge/contacts` | `knowledge:read` |
| [Create a directory contact](https://getricky.ai/en/docs/api/reference/knowledge/create-knowledge-contact) | `POST /knowledge/contacts` | `knowledge:write` |
| [Get a directory contact](https://getricky.ai/en/docs/api/reference/knowledge/get-knowledge-contact) | `GET /knowledge/contacts/{knowledge_contact_id}` | `knowledge:read` |
| [Update a directory contact](https://getricky.ai/en/docs/api/reference/knowledge/update-knowledge-contact) | `PATCH /knowledge/contacts/{knowledge_contact_id}` | `knowledge:write` |
| [Delete a directory contact](https://getricky.ai/en/docs/api/reference/knowledge/delete-knowledge-contact) | `DELETE /knowledge/contacts/{knowledge_contact_id}` | `knowledge:write` |
| [List files](https://getricky.ai/en/docs/api/reference/knowledge/list-knowledge-files) | `GET /knowledge/files` | `knowledge:read` |
| [Upload a file](https://getricky.ai/en/docs/api/reference/knowledge/create-knowledge-file) | `POST /knowledge/files` | `knowledge:write` |
| [Complete an upload](https://getricky.ai/en/docs/api/reference/knowledge/complete-knowledge-file) | `POST /knowledge/files/{file_id}/complete` | `knowledge:write` |
| [Get a file](https://getricky.ai/en/docs/api/reference/knowledge/get-knowledge-file) | `GET /knowledge/files/{file_id}` | `knowledge:read` |
| [Update a file](https://getricky.ai/en/docs/api/reference/knowledge/update-knowledge-file) | `PATCH /knowledge/files/{file_id}` | `knowledge:write` |
| [Delete a file](https://getricky.ai/en/docs/api/reference/knowledge/delete-knowledge-file) | `DELETE /knowledge/files/{file_id}` | `knowledge:write` |
| [Change tags on many contacts](https://getricky.ai/en/docs/api/reference/contacts/change-contacts-tags) | `POST /contacts/tags` | `contacts:write` |
| [Create a contact field](https://getricky.ai/en/docs/api/reference/contacts/create-contact-field) | `POST /contact-fields` | `contacts:write` |
| [Delete a contact field](https://getricky.ai/en/docs/api/reference/contacts/delete-contact-field) | `DELETE /contact-fields/{field_id}` | `contacts:write` |
| [Update a tag](https://getricky.ai/en/docs/api/reference/catalogs/update-tag) | `PATCH /tags/{tag_id}` | `tags:write` |
| [Delete a tag](https://getricky.ai/en/docs/api/reference/catalogs/delete-tag) | `DELETE /tags/{tag_id}` | `tags:write` |
| [Search conversations](https://getricky.ai/en/docs/api/reference/conversations/search-conversations) | `GET /conversations/search` | `conversations:read` |
| [Change the tags of a conversation's contact](https://getricky.ai/en/docs/api/reference/conversations/change-conversation-tags) | `PATCH /conversations/{conversation_id}/tags` | `contacts:write` |
| [Mark a conversation read](https://getricky.ai/en/docs/api/reference/conversations/mark-conversation-read) | `POST /conversations/{conversation_id}/read` | `conversations:write` |
| [Search messages](https://getricky.ai/en/docs/api/reference/messages/search-messages) | `GET /messages/search` | `conversations:read` |
| [List quick replies](https://getricky.ai/en/docs/api/reference/quick-replies/list-quick-replies) | `GET /quick-replies` | `quick_replies:read` |
| [Create a quick reply](https://getricky.ai/en/docs/api/reference/quick-replies/create-quick-reply) | `POST /quick-replies` | `quick_replies:write` |
| [Get a quick reply](https://getricky.ai/en/docs/api/reference/quick-replies/get-quick-reply) | `GET /quick-replies/{quick_reply_id}` | `quick_replies:read` |
| [Update a quick reply](https://getricky.ai/en/docs/api/reference/quick-replies/update-quick-reply) | `PATCH /quick-replies/{quick_reply_id}` | `quick_replies:write` |
| [Delete a quick reply](https://getricky.ai/en/docs/api/reference/quick-replies/delete-quick-reply) | `DELETE /quick-replies/{quick_reply_id}` | `quick_replies:write` |
| [List templates](https://getricky.ai/en/docs/api/reference/whats-app/list-templates) | `GET /templates` | `templates:read` |
| [Get a template](https://getricky.ai/en/docs/api/reference/whats-app/get-template) | `GET /templates/{template_id}` | `templates:read` |
| [Validate a template draft](https://getricky.ai/en/docs/api/reference/whats-app/validate-template) | `POST /templates/validate` | `templates:read` |
| [Create a template](https://getricky.ai/en/docs/api/reference/whats-app/create-template) | `POST /templates` | `templates:write` |
| [Edit a template](https://getricky.ai/en/docs/api/reference/whats-app/update-template) | `PATCH /templates/{template_id}` | `templates:write` |
| [Delete a template](https://getricky.ai/en/docs/api/reference/whats-app/delete-template) | `DELETE /templates/{template_id}` | `templates:write` |
| [List WhatsApp numbers](https://getricky.ai/en/docs/api/reference/whats-app/list-whats-app-numbers) | `GET /whatsapp-numbers` | `conversations:read` |
| [Get a WhatsApp number](https://getricky.ai/en/docs/api/reference/whats-app/get-whats-app-number) | `GET /whatsapp-numbers/{channel_id}` | `conversations:read` |
| [Upload a header sample](https://getricky.ai/en/docs/api/reference/whats-app/create-template-media-upload) | `POST /templates/media` | `templates:write` |
| [Complete a header sample](https://getricky.ai/en/docs/api/reference/whats-app/complete-template-media-upload) | `POST /templates/media/complete` | `templates:write` |
| [Get the field mappings of a template](https://getricky.ai/en/docs/api/reference/whats-app/get-template-field-mappings) | `GET /templates/{template_id}/field-mappings` | `templates:read` |
| [Set the field mappings of a template](https://getricky.ai/en/docs/api/reference/whats-app/replace-template-field-mappings) | `PUT /templates/{template_id}/field-mappings` | `templates:write` |
| [Update a WhatsApp number](https://getricky.ai/en/docs/api/reference/whats-app/update-whats-app-number) | `PATCH /whatsapp-numbers/{channel_id}` | `conversations:write` |
| [Edit a business profile](https://getricky.ai/en/docs/api/reference/whats-app/update-whats-app-business-profile) | `PATCH /whatsapp-numbers/{channel_id}/business-profile` | `conversations:write` |
| [Upload a profile photo](https://getricky.ai/en/docs/api/reference/whats-app/create-profile-photo-upload) | `POST /whatsapp-numbers/{channel_id}/profile-photo` | `conversations:write` |
| [Complete a profile photo](https://getricky.ai/en/docs/api/reference/whats-app/complete-profile-photo-upload) | `POST /whatsapp-numbers/{channel_id}/profile-photo/complete` | `conversations:write` |
| [Request a display name change](https://getricky.ai/en/docs/api/reference/whats-app/request-whats-app-display-name) | `POST /whatsapp-numbers/{channel_id}/display-name` | `conversations:write` |
| [Refresh a WhatsApp number](https://getricky.ai/en/docs/api/reference/whats-app/refresh-whats-app-number) | `POST /whatsapp-numbers/{channel_id}/refresh` | `conversations:write` |
| [List broadcasts](https://getricky.ai/en/docs/api/reference/broadcasts/list-broadcasts) | `GET /broadcasts` | `broadcasts:read` |
| [Create a broadcast](https://getricky.ai/en/docs/api/reference/broadcasts/create-broadcast) | `POST /broadcasts` | `broadcasts:write` |
| [Get a broadcast](https://getricky.ai/en/docs/api/reference/broadcasts/get-broadcast) | `GET /broadcasts/{broadcast_id}` | `broadcasts:read` |
| [Cancel a scheduled broadcast](https://getricky.ai/en/docs/api/reference/broadcasts/cancel-broadcast) | `POST /broadcasts/{broadcast_id}/cancel` | `broadcasts:write` |
| [List broadcast recipients](https://getricky.ai/en/docs/api/reference/broadcasts/list-broadcast-recipients) | `GET /broadcasts/{broadcast_id}/recipients` | `broadcasts:read` |
| [Assign many conversations](https://getricky.ai/en/docs/api/reference/conversations/assign-conversations) | `POST /conversations/assignments` | `conversations:write` |
| [Resolve a handoff](https://getricky.ai/en/docs/api/reference/conversations/resolve-conversation-handoff) | `POST /conversations/{conversation_id}/handoff/resolve` | `conversations:write` |
| [Mark a conversation unread](https://getricky.ai/en/docs/api/reference/conversations/mark-conversation-unread) | `DELETE /conversations/{conversation_id}/read` | `conversations:write` |
| [Fetch a message's file](https://getricky.ai/en/docs/api/reference/messages/fetch-message-media) | `POST /conversations/{conversation_id}/messages/{message_id}/media` | `conversations:read` |
| [Preview a broadcast audience](https://getricky.ai/en/docs/api/reference/broadcasts/preview-broadcast-audience) | `POST /broadcasts/preview` | `broadcasts:read` |

## Authentication responses

| Situation                                                             | Response                 |
| --------------------------------------------------------------------- | ------------------------ |
| The header is missing or malformed, or the key expired or was revoked | `401 unauthorized`       |
| The key lacks the operation's scope                                   | `403 insufficient_scope` |
| The key made more than 120 requests this minute                       | `429 rate_limited`       |

The **Request log** in **Settings → API** shows your keys' requests from the last 30 days, with their status, error code, duration and request ID. It never stores bodies or headers, and requests without a valid key are not in it.

See [Errors](./errors.md) and [Idempotency, rate limits and retries](./idempotency-and-rate-limits.md).
