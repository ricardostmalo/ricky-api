# Changelog

Also at https://getricky.ai/en/docs/api/changelog.

This page records changes to the API. A breaking change only ships in a new path version and is announced here.

## November 27, 2026

Creating or replacing a complete conversation workflow through REST, the assistant or MCP now checks the same graph rules as draft saves. Give every step a unique non-empty id and a supported kind. Connect all steps from the entry using exits the configured step can take. Every target must exist, every condition must have a kind, and every comparison must name its field. The first violation returns `invalid_input` with its path. A rejected replacement preserves the current definition. A deprecated `branch` step is checked as the `decision` it becomes.

## November 26, 2026

The `name` of a `decision` branch is optional. The editor numbers unnamed branches in the order they are checked. Publication reserves the fallback labels “Si no”, “Otherwise”, “If none match” and “Si ninguna coincide”, ignoring case and surrounding whitespace.

## November 24, 2026

**Conditions, `schedule` and `decision`.** A conversation workflow has a single `condition` that decides whether each occurrence of the trigger runs it: a comparison (`kind: "compare"`, with `field`, `operator` and its value in `values`, `value`, `business_hours` or `name`) or an `all` or `any` group of conditions, three levels deep at most. The channel (`channel`), the hours (`time`), who has the conversation (`assignee`: `person` with `user_id`, `agent` with `agent_id`, or `nobody`), its status (`conversation_status`), the AI (`ai`), the first message (`message_first`), the message type (`message_type`), its text (`message_text`) and its sender (`message_sender`) are comparisons. Without a `channel` comparison, the workflow runs on every channel, including channels connected later. The `schedule` trigger replaces `at_time`: it runs at one or more times (`schedule.times`, each with `time` and `weekdays`) in the `schedule.timezone` zone, and its `condition` needs an `assignee` `is` comparison. The `decision` step replaces `branch`: it checks 1 to 10 branches in order (`branches`, each with `id`, `name`, `condition` and `next`), goes on through the first whose condition holds and, when none holds, through its `next`. A branch can also compare a saved answer with `variable`. See [Workflows](https://getricky.ai/en/docs/api/workflows#conditions).

**Fields responses no longer carry.** This is an incompatible change within v1, made because no integration had called the workflow operations since November 10, 2026. Responses no longer include `channel_ids`, `message_filters`, `sent_message_filters`, `at_time`, `conversation_filters`, the hours `condition` (`inside_business_hours` and `outside_business_hours`) or `branch` steps. An integration that reads them must read `condition`, `schedule` and `decision` steps. Requests still accept them, deprecated, as well as the `at_time` trigger, and Ricky stores them as the equivalent `condition`, `schedule` and `decision`. See [Deprecated fields](https://getricky.ai/en/docs/api/workflows#deprecated-fields).

## November 23, 2026 (night)

**«At a time» and «When a chat is assigned to someone» replace `assigned_to`.** The `assigned_to` trigger and its `assigned_user_ids` field are removed: no workflow used them. Two new triggers turn the AI on or off in conversations that stay assigned to their member, with the `turn_on_ai` (with `agent_id`) and `turn_off_ai` steps, which only they take. `at_time` runs once a day at `at_time.time` (quarter hours), on the days of `at_time.weekdays` in the `at_time.timezone` zone, on each conversation assigned then to one of `conversation_filters.assigned_user_ids`; it has no `condition`. `conversation_assigned` runs when a conversation is assigned to a member (any member, or one of `conversation_filters.assigned_user_ids`) while its `condition` holds; the assignment an AI handoff makes does not run it. `conversation_filters.only_open` limits both to open conversations. When the AI turns on, if the contact wrote last within the last 23 hours, the agent answers at once.

## November 23, 2026 (afternoon)

**«Chat assigned to» replaces `team_away`.** The `team_away` trigger and its `coverage` field are removed: no workflow used them. The `assigned_to` trigger takes `assigned_user_ids` (the members whose conversations it reaches), a required hours `condition` and a single `turn_on_ai` step with `agent_id`. While a conversation is assigned to one of those members and the hours hold, that agent answers it without changing the assignment; when the hours begin to hold, it answers those already waiting for a reply whose customer wrote in the last 23 hours.

## November 23, 2026

**Weekly coverage, by person.** Backward-compatible change to v1. The `coverage` of a `team_away` workflow takes `team_hours` instead of `starts_at` and `ends_at`: the agent covers every week outside those hours, and each closing starts a period. `assigned_user_ids` limits the coverage to the conversations assigned to those members. When each period starts, the agent answers the conversations already waiting for a reply whose customer wrote in the last 23 hours.

## November 16, 2026

**When a message is sent.** Backward-compatible change to v1. The `message_sent` trigger starts a flow when an outgoing message passes `sent_message_filters`: `senders` (who sent it: `person`, `ai`, `automation`, `broadcast` or `external_app`) and, optionally, `text_contains`, compared ignoring case, accents and repeated spaces. It runs on the next 15-minute deadline sweep, unless the contact replied first. It takes no `condition`.

## November 15, 2026

**Closing unanswered conversations.** Workflows accept `team_message_unanswered` with `inactivity_seconds` and any conversation flow. The trigger starts the flow; closing is an explicit `close_conversation` step. Each new team message starts the wait; a customer reply cancels the close. Due closes run on the next 15-minute deadline sweep. Scheduled workflows expose `close_after_send`: close only when that send opened the chat and no later message arrived; configure this option in Ricky's editor.

**Conversation inactivity.** The `conversation_inactive` trigger starts a flow after `inactivity_seconds` without a message or reaction from either side. Every new message or reaction restarts the timer, even when the latest message came from the customer. Closing remains a separate `close_conversation` step.

## November 13, 2026

**Conversations waiting for a reply.** Backward-compatible change to v1. `GET /conversations?awaiting_reply=true` lists the conversations waiting for the team's reply: open, with the contact's message last, reactions aside. They are the ones `GET /reports/dashboard` counts in `awaiting_reply`. `last_message_from=customer` is unchanged. See [Inbox](https://getricky.ai/en/docs/api/inbox).

## November 12, 2026

**Google Ads trends and comparison.** `/ads/google/campaigns` adds daily series, an equal-length previous period, totals and relative changes, cost per click/conversion, and campaign channel type. Zero denominators and unavailable reads remain null. The Ads report and connectors use the same data.

**Google Ads report correction.** `/ads/google/campaigns` returns campaign metrics reported by Google Ads. The custom WhatsApp message-code mechanism and its `conversation_code`, `conversation_count` and `recent_conversation_ids` fields have been removed. Google-reported `conversions` remains available.

## November 11, 2026

**Ad attribution.** Compatible change to v1. Conversations answer `first_ad_referral` and `latest_ad_referral`, messages `ad_referral`, and contacts `first_ad_referral` and `last_ad_referral`: the Meta ad the customer came from, with the ad ID and what Meta sent with it, and the ad's name, campaign and ad set from Ricky's Meta Ads sync in `resolved`. `GET /conversations` and `GET /contacts` filter by `ad_id`, `campaign_id`, `ad_set_id`, `referred_after` and `referred_before`; `GET /conversations` also by `last_activity_after` and `last_activity_before`. `GET /ads/conversations` lists each conversation an ad brought in a period with what happened after, with `conversations:read`. The `message.received` webhook carries `ad_id` when the message came from an ad. See [Ad attribution](https://getricky.ai/en/docs/api/ad-attribution).

## November 8, 2026

**Who answers a call.** Compatible change to v1. A conversation workflow takes the `call_received` `trigger` and the `answer_call` (`agent_id`) and `decline_call` (`text`) steps: it decides whether an AI agent answers a WhatsApp call or Ricky rejects it and writes to the caller. See [Workflows](https://getricky.ai/en/docs/api/workflows#steps).

**Business hours per day.** Compatible change to v1. A workflow's `business_hours` takes each weekday's ranges in `days` and holidays in `closed_dates`, and a `branch` step can check the hours with `business_hours` instead of an answer. `start`, `end` and `weekdays` are still accepted and still answered, deprecated. See [Workflows](https://getricky.ai/en/docs/api/workflows#business-hours).

## November 4, 2026

**Location photos.** Compatible change to v1. A location can have one optional photo: `POST /knowledge/locations/{location_id}/photo`, `PUT` the bytes to the `upload_url`, then `POST /knowledge/locations/{location_id}/photo/complete`; `DELETE /knowledge/locations/{location_id}/photo` removes it. Locations answer `photo`, `null` when they have none. See [Agents and knowledge](https://getricky.ai/en/docs/api/agents-and-knowledge#location-photo).

## November 3, 2026

**The AI answers until someone takes the handoff.** Compatible with v1. While `active_handoff` is open, the AI agent keeps answering even though `assigned_user_id` is already the member. A handoff also ends when a member writes to the customer or assigns the conversation to themselves, and the `conversation.handoff_resolved` webhook arrives in those cases.

## November 2, 2026

**Full text of knowledge files.** `GET /knowledge/files/{file_id}/reading` answers everything Ricky read from a `ready` file, page by page for a PDF, in Markdown: the text the agents consult. Files no longer answer `preview`, the first piece of that text; no integration read it. See [Agents and knowledge](https://getricky.ai/en/docs/api/agents-and-knowledge#5-upload-a-file).

**No contact owner.** Compatible change to v1. Contacts no longer have an owner: the responsible member belongs to each conversation (`assigned_user_id`). A contact's `owner_user_id` is deprecated and always returns `null`; sending it when creating or editing a contact is accepted and ignored. The `owner_user_id` filter of `GET /contacts` is deprecated and returns no contacts. `sync_contact_owner` when assigning a conversation is deprecated and ignored; assigning one or many conversations no longer changes anything on the contact.

## October 31, 2026

**No stages on contacts.** Contacts no longer return `lifecycle_stage`, `GET /contacts` no longer filters by `lifecycle_stage`, and a broadcast's `filter` audience no longer accepts or returns it; sending it when creating or editing a contact or a broadcast gets `400 invalid_input`. No customer used stages. `GET /contacts` now sorts by name, A to Z.

**Meta Ads, live.** Compatible change to v1. `GET /ads/campaigns`, `GET /ads/ad-sets`, `GET /ads/ads` and `GET /ads/insights` read the organization's connected Meta ad accounts live from Meta, read-only, with the `reports:read` scope. See [Reports](https://getricky.ai/en/docs/api/reports#meta-ads-live).

## October 26, 2026

**Ads report.** Compatible change to v1. The `previous` period of `GET /reports/ads` also answers `impressions` and `clicks`, so they compare with the period like spend and conversations.

## October 23, 2026

**Web chat.** Compatible change to v1. Channels, conversations, contact identities and reports can carry the channel type `webchat`: the chat a company puts on its website. Channel filters also accept `webchat`. If your integration treats channel types as a closed list, add this value.

**No model on agents.** Ricky chooses each agent's model. Agents no longer answer `model`, `GET /agent-options` no longer answers `models` or `default_model`, and creating or updating an agent with `model` answers `400 invalid_input`. No integration used these fields.

## October 19, 2026

**Appointment states.** Compatible change to v1. `GET /workflows/{workflow_id}/reminders/state-options` lists the Odoo appointment states an appointment reminder workflow can remind. See [Workflows](https://getricky.ai/en/docs/api/workflows#appointment-states).

**WhatsApp media headers, variable mappings and number settings.** Compatible changes to v1.

- **Media headers.** Templates take `IMAGE`, `VIDEO` and `DOCUMENT` headers. `POST /templates/media` and `POST /templates/media/complete` upload the sample Meta reviews and answer its `handle`. An edit that keeps a media header sends it again with a new `handle`. See [WhatsApp templates and numbers](https://getricky.ai/en/docs/api/whatsapp#image-video-and-document-headers).
- **Variables from contact fields.** `GET` and `PUT /templates/{template_id}/field-mappings` read and replace the contact fields that fill a template's variables.
- **Manage numbers.** `PATCH /whatsapp-numbers/{channel_id}` turns calls on or off. `PATCH /whatsapp-numbers/{channel_id}/business-profile` edits the business profile, `/profile-photo` sets the profile photo in three steps, `/display-name` asks Meta to review a new display name and `/refresh` reads the number from Meta. They require `conversations:write`.
- **More on each number.** WhatsApp numbers also answer `name_status` and `business_profile`.

**Inbox.** Compatible changes to v1.

- **Inbox filters.** `GET /conversations` accepts `channel_id`, `tag_id`, `unread`, `pending_handoff`, `last_message_from`, `agent_id` and `unassigned`. Each conversation carries `unread` and `active_handoff`. See [Inbox](https://getricky.ai/en/docs/api/inbox).
- **Bulk assignment.** `POST /conversations/assignments` assigns up to 100 conversations and answers one result per conversation.
- **Handoffs.** `POST /conversations/{conversation_id}/handoff/resolve` gives the conversation back to the AI agent or leaves it with the member.
- **Unread.** `DELETE /conversations/{conversation_id}/read` marks a conversation unread.
- **Quote a message.** `POST /conversations/{conversation_id}/messages` accepts `reply_to_message_id` on WhatsApp text and files.
- **Received files.** `POST /conversations/{conversation_id}/messages/{message_id}/media` stores the file of a received message now and answers its `url`.

**Webhooks.** Compatible changes to v1.

- **New events.** `conversation.agent_changed`, `conversation.handoff_requested`, `conversation.handoff_resolved`, `contact.tags_changed`, `broadcast.completed`, `broadcast.failed`, `template.status_changed`, `workflow.execution_failed` and `knowledge_file.ready`. See [Webhooks](https://getricky.ai/en/docs/api/webhooks#events).
- **New `data` fields.** `broadcast_id`, `template_id`, `workflow_id`, `workflow_execution_id` and `knowledge_file_id`, each only on its events.
- **More event types per webhook.** A webhook accepts all 19 event types at once.

**Broadcast audiences and scheduled workflows.** Compatible changes to v1.

- **Personalized broadcasts.** `POST /broadcasts` accepts `mappings`, which fill template variables from each recipient's contact fields and are saved on the template, as in the composer. See [Broadcasts](https://getricky.ai/en/docs/api/broadcasts).
- **Audience preview.** `POST /broadcasts/preview` counts the numbers an audience reaches without creating a broadcast. It requires `broadcasts:read`.
- **Scheduled workflows.** `POST /workflows/{workflow_id}/header-media` sets the header file of a scheduled workflow. `GET /workflows/{workflow_id}/reminders/preview` and `GET /workflows/{workflow_id}/reminders/history` show what an Odoo appointment reminder workflow will send on a coming day and what it sent on a past one. See [Workflows](https://getricky.ai/en/docs/api/workflows#scheduled-workflows).

**Broadcasts.** Compatible changes to v1.

- **Broadcasts.** `GET /broadcasts`, `POST /broadcasts` and `GET /broadcasts/{broadcast_id}` list, create and read WhatsApp broadcasts with how many recipients are in each delivery status. A broadcast sends now or at `scheduled_at`, up to 7 days ahead, to a contact filter, chosen contacts or phone numbers. See [Broadcasts](https://getricky.ai/en/docs/api/broadcasts).
- **Cancel and follow.** `POST /broadcasts/{broadcast_id}/cancel` cancels a scheduled broadcast before it starts. `GET /broadcasts/{broadcast_id}/recipients` lists each number and where its message stands.
- **New scopes.** `broadcasts:read` and `broadcasts:write`.

**Workflows.** Compatible changes to v1.

- **Manage workflows.** `GET /workflows`, `POST /workflows`, `GET`, `PATCH` and `DELETE /workflows/{workflow_id}`, `POST /workflows/{workflow_id}/activate` and `POST /workflows/{workflow_id}/pause`. Ricky checks each definition with the rules of the workflow editor. See [Workflows](https://getricky.ai/en/docs/api/workflows).
- **Executions.** `GET /workflows/{workflow_id}/executions` lists a workflow's runs with their status, attempts and errors.
- **New scopes.** `workflows:read` and `workflows:write`.

**Reports.** Compatible changes to v1.

- **Report operations.** `GET /reports/dashboard`, `/reports/conversations`, `/reports/messages`, `/reports/responses`, `/reports/resolutions`, `/reports/team`, `/reports/broadcasts` and `/reports/ads` answer the numbers of each Reports tab, with its filters and its definitions, for a period of America/Panama days. See [Reports](https://getricky.ai/en/docs/api/reports).
- **New scope.** `reports:read`.

**AI agents and knowledge.** Compatible changes to v1.

- **Agents.** `GET /agents`, `POST /agents`, `GET`, `PATCH` and `DELETE /agents/{agent_id}` list, create, read, update and archive AI agents. `GET /agent-options` lists the models, voices and capabilities they accept. They require `agents:read` or `agents:write`.
- **The agent of a conversation.** `PATCH /conversations/{conversation_id}/agent` makes an agent answer a conversation or, with `null`, turns the AI off. It requires `conversations:write`.
- **Knowledge.** `/knowledge/locations` and `/knowledge/contacts` create, read, update and delete locations and directory contacts. `/knowledge/files` uploads files in three steps, reads, updates and deletes them. They require `knowledge:read` or `knowledge:write`. See [Agents and knowledge](https://getricky.ai/docs/api/agents-and-knowledge).

**Tags, contact fields, search, read marks and quick replies.** Compatible changes to v1.

- **Tags.** `PATCH` and `DELETE /tags/{tag_id}` rename, recolor and delete a tag on every contact. They require the new `tags:write` scope, which `POST /tags` now also accepts besides `contacts:write`.
- **Tags on many contacts.** `POST /contacts/tags` adds and removes the same tags on up to 100 contacts. `PATCH /conversations/{conversation_id}/tags` changes the tags of a conversation's contact.
- **Contact fields.** `POST /contact-fields` and `DELETE /contact-fields/{field_id}` create and delete custom fields.
- **Search.** `GET /conversations/search` and `GET /messages/search` search by text. Contacts are searched with `GET /contacts?query=`.
- **Read marks.** `POST /conversations/{conversation_id}/read` marks a conversation read, as opening it in the inbox does.
- **Quick replies.** `GET` and `POST /quick-replies`, `GET`, `PATCH` and `DELETE /quick-replies/{quick_reply_id}`, with the new `quick_replies:read` and `quick_replies:write` scopes. See [Tags, fields, search and quick replies](https://getricky.ai/en/docs/api/crm-and-inbox).

**WhatsApp templates and numbers.** Compatible changes to v1.

- **Manage templates.** `POST /templates` submits a template to Meta's review; `GET`, `PATCH` and `DELETE /templates/{template_id}` read it with its review status, edit it and delete it. `POST /templates/validate` checks a draft with the template editor's rules without submitting it. See [WhatsApp templates and numbers](https://getricky.ai/en/docs/api/whatsapp).
- **WhatsApp numbers.** `GET /whatsapp-numbers` and `GET /whatsapp-numbers/{channel_id}` answer each number's status, quality rating and messaging limit. They need `conversations:read`.
- **Components in Meta's format.** Templates carry `components` with Meta's keys, for example `example.body_text`. Before, nested keys came in camelCase.
- **New scope.** `templates:write`.

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
