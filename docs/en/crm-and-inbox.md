# Tags, fields, search and quick replies

URL: https://getricky.ai/en/docs/api/crm-and-inbox

> Organize contacts with tags and fields, search the inbox, mark conversations read and manage quick replies.

These operations do what the Contacts page, the inbox and the quick reply settings do in Ricky, with the same rules.

| Task                                     | Operation                                             | Scope                                         |
| ---------------------------------------- | ----------------------------------------------------- | --------------------------------------------- |
| Create, rename, recolor or delete a tag  | `POST /tags`, `PATCH` and `DELETE /tags/{id}`         | `tags:write`                                  |
| Add or remove tags on up to 100 contacts | `POST /contacts/tags`                                 | `contacts:write`                              |
| Add or remove tags from a conversation   | `PATCH /conversations/{id}/tags`                      | `contacts:write`                              |
| Create or delete a contact field         | `POST /contact-fields`, `DELETE /contact-fields/{id}` | `contacts:write`                              |
| Search contacts                          | `GET /contacts?query=`                                | `contacts:read`                               |
| Search conversations                     | `GET /conversations/search`                           | `conversations:read`                          |
| Search messages                          | `GET /messages/search`                                | `conversations:read`                          |
| Mark a conversation read                 | `POST /conversations/{id}/read`                       | `conversations:write`                         |
| Read and manage quick replies            | `/quick-replies`                                      | `quick_replies:read` or `quick_replies:write` |

`POST /tags` also accepts `contacts:write`, the scope it required before `tags:write` existed.

## Tags

A tag belongs to the organization; contacts carry it. Renaming or recoloring a tag changes it on every contact. Deleting it removes it from every contact and cannot be undone. A name already in use, in any case, answers `409 conflict`.

Tag changes add and remove IDs on top of what the contact has; its other tags stay. To replace every tag of one contact, send `tag_ids` to `PATCH /contacts/{id}`.

```bash
curl -X POST https://getricky.ai/api/v1/contacts/tags \
  -H "Authorization: Bearer $RICKY_API_KEY" \
  -H "Idempotency-Key: $(uuidgen)" \
  -H "Content-Type: application/json" \
  -d '{"contact_ids": ["…", "…"], "add_tag_ids": ["…"], "remove_tag_ids": []}'
```

The answer has one result per contact, in order. `status` is `updated`, `not_found` (the organization has no such contact) or `failed` (retry that contact). A tag ID the organization does not have refuses the whole request with `400 invalid_input` before any contact changes.

In a conversation, tags belong to its contact: `PATCH /conversations/{id}/tags` changes the contact's tags and answers the contact.

## Contact fields

`POST /contact-fields` adds a custom field to every contact. `type` cannot change later; `select` and `multi_select` need `options`. Write values with `custom_values` on a contact, keyed by the field ID. Deleting a field deletes its value on every contact and cannot be undone.

## Search

* Contacts: `GET /contacts?query=` matches the name, phone, email or company, with the other list filters and pagination.
* Conversations: `GET /conversations/search?query=` matches the contact, its name or handle on the channel, or the conversation's messages. Latest activity first.
* Messages: `GET /messages/search?query=` matches words in the text, or in what Ricky derived from a voice note or file. Newest first.

Conversation and message search answer one page of at most `limit` results; `next_cursor` is always `null`. Narrow the text to find older results.

## Mark read

`POST /conversations/{id}/read` marks the conversation read for the whole team through its latest message, as opening it in the inbox does. On WhatsApp, the contact sees the read receipt. Send no body.

## Quick replies

Quick replies are the saved answers operators insert in the inbox. `GET /quick-replies` lists them by title. A title already in use, in any case, answers `409 conflict`. `PATCH` changes only the fields you send. `DELETE` cannot be undone.
