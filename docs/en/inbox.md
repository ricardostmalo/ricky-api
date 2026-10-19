# Inbox

URL: https://getricky.ai/en/docs/api/inbox

> Filter conversations as the inbox does, assign them in bulk, resolve handoffs, mark them unread, quote messages and fetch received files.

These operations do what the Ricky inbox does, with the same rules.

| Task                                 | Operation                                              | Scope                 |
| ------------------------------------ | ------------------------------------------------------ | --------------------- |
| Filter conversations                 | `GET /conversations?…`                                 | `conversations:read`  |
| Assign up to 100 conversations       | `POST /conversations/assignments`                      | `conversations:write` |
| Resolve an AI agent's handoff        | `POST /conversations/{id}/handoff/resolve`             | `conversations:write` |
| Mark a conversation unread           | `DELETE /conversations/{id}/read`                      | `conversations:write` |
| Reply quoting a message              | `POST /conversations/{id}/messages`                    | `messages:send`       |
| Fetch the file of a received message | `POST /conversations/{id}/messages/{message_id}/media` | `conversations:read`  |

## Filters

`GET /conversations` takes the inbox's filters. They combine; send the same ones with `cursor` on every page.

| Parameter                    | Only conversations                                           |
| ---------------------------- | ------------------------------------------------------------ |
| `status`                     | `open` or `closed`                                           |
| `channel_id`                 | on that channel, including earlier connections of the number |
| `tag_id`                     | whose contact has that tag                                   |
| `unread=true`                | with messages the team has not read                          |
| `pending_handoff=true`       | with a handoff to a person not resolved yet                  |
| `last_message_from=customer` | whose latest message came from the contact                   |
| `assigned_user_id`           | assigned to that member                                      |
| `agent_id`                   | that AI agent answers, with no member assigned               |
| `unassigned=true`            | with no member and no AI agent                               |

`assigned_user_id`, `agent_id` and `unassigned=true` exclude each other: sending more than one answers `400 invalid_input`. A channel or tag the organization does not have answers an empty list.

Each conversation carries `unread` and `active_handoff`, the handoff waiting or `null`.

## Bulk assignment

`POST /conversations/assignments` makes members responsible for up to 100 conversations, each once. Each member also becomes the contact's owner, as when assigning one at a time.

```bash
curl -X POST https://getricky.ai/api/v1/conversations/assignments \
  -H "Authorization: Bearer $RICKY_API_KEY" \
  -H "Idempotency-Key: $(uuidgen)" \
  -H "Content-Type: application/json" \
  -d '{"assignments": [{"conversation_id": "…", "assigned_user_id": "…"}]}'
```

The answer has one result per conversation, in order. `status` is `assigned`, `not_found` (the organization has no such conversation) or `failed` (retry that conversation). A member outside the organization refuses the whole request with `400 invalid_input` before any conversation changes. See `GET /members`.

## Handoffs

When an AI agent asks for a person to take over, `active_handoff` carries the reason, the summary and the responsible member. `POST /conversations/{id}/handoff/resolve` ends it:

* `{"resolution": "returned_to_ai"}` gives the conversation back to the agent that asked and unassigns the member.
* `{"resolution": "stayed_with_human"}` leaves it with the member.

A conversation with no handoff waiting answers `422 rule_violation`, and so does `returned_to_ai` when no AI agent asked for it. The answer is the conversation with `active_handoff: null`.

## Mark unread

`DELETE /conversations/{id}/read` marks it unread for the whole team. The contact sees nothing. `POST` on the same path marks it read.

## Quote a message

On WhatsApp, a text or a file can quote a message of the same conversation with `reply_to_message_id`, the `id` from `GET /conversations/{id}/messages`:

```json
{ "type": "text", "text": "Sí, ya están listos.", "reply_to_message_id": "…" }
```

A message of another conversation, one WhatsApp did not send, or a channel other than WhatsApp answers `400 invalid_input` with `param: "reply_to_message_id"`.

## Received files

Ricky stores the file of each message it receives in the background; until then `media.url` is `null`. `POST /conversations/{id}/messages/{message_id}/media` stores it now from the provider and answers the message with its `url`, signed for one hour. A file already stored answers at once.

The provider keeps files for a limited time (about 30 days on WhatsApp). A message without a received file, or whose file the provider says expired, answers `422 rule_violation`; other provider failures answer `502 upstream_error`.
