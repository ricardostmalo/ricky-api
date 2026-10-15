# Pagination

URL: https://getricky.ai/en/docs/api/pagination

> Walk lists with page_size, cursor and next_cursor.

Every list answers with the same shape:

```json
{
  "data": [],
  "next_cursor": "eyJ0IjoiMjAyNi0xMC0xNFQxNTo0MjoxMC41MTJaIn0"
}
```

`next_cursor` is `null` on the last page.

## Parameters

| Parameter   | Description                                                                                |
| ----------- | ------------------------------------------------------------------------------------------ |
| `page_size` | Items per page, from 1 to 100. Defaults to 50.                                             |
| `cursor`    | The `next_cursor` of the previous page, unchanged. It is opaque: do not build or parse it. |

On conversations and messages, a cursor Ricky did not issue gets `400 invalid_input` with `param: "cursor"`. Keep the same filters on every page of a walk.

## Walk a list

1. Request the first page without `cursor`.
2. If `next_cursor` is not `null`, request the next page with `cursor=<next_cursor>`.
3. Stop when `next_cursor` is `null`.

A page may hold fewer items than `page_size`. Decide the end only by `next_cursor`.

```bash
curl "https://getricky.ai/api/v1/conversations?status=open&page_size=100" \
  -H "Authorization: Bearer $RICKY_API_KEY"

curl "https://getricky.ai/api/v1/conversations?status=open&page_size=100&cursor=eyJ0IjoiMjAyNi0xMC0xNFQxNTo0MjoxMC41MTJaIn0" \
  -H "Authorization: Bearer $RICKY_API_KEY"
```

## Paginated lists

| Operation                                       | Parameters                                                                              | Order                     |
| ----------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------- |
| `GET /contacts`                                 | `page_size`, `cursor`, `query`, `tag_id`, `owner_user_id`, `lifecycle_stage`, `channel` | Latest `updated_at` first |
| `GET /conversations`                            | `page_size`, `cursor`, `status`, `assigned_user_id`                                     | Latest activity first     |
| `GET /conversations/{conversation_id}/messages` | `cursor`                                                                                | Newest message first      |

The message list does not take `page_size`: Ricky sets the size of each page.

## Complete lists

These lists return everything in one response. Their `next_cursor` is always `null`.

| Operation                               | Contents                                      |
| --------------------------------------- | --------------------------------------------- |
| `GET /channels`                         | Every connected channel.                      |
| `GET /contact-fields`                   | Every custom contact field.                   |
| `GET /members`                          | Every member of the organization.             |
| `GET /tags`                             | Every contact tag.                            |
| `GET /templates`                        | Every WhatsApp template, read live from Meta. |
| `GET /webhooks`                         | The 100 most recent webhooks.                 |
| `GET /webhooks/{webhook_id}/deliveries` | The 100 most recent deliveries of a webhook.  |
