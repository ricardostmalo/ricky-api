# WhatsApp templates and numbers

URL: https://getricky.ai/en/docs/api/whatsapp

> Create, validate, edit and delete WhatsApp templates, follow Meta's review, fill their variables from contact fields and manage your numbers.

Templates are the messages Meta approves for writing to a customer outside the 24-hour window. The API uses the same rules as Ricky's template editor and reads each template live from Meta.

The key needs `templates:read` to read and validate, and `templates:write` to create, edit or delete, upload header samples and map variables. WhatsApp numbers are read with `conversations:read` and changed with `conversations:write`.

## Validate a draft

`POST /templates/validate` checks a draft without sending it to Meta. Use it before creating a template.

```bash
curl https://getricky.ai/api/v1/templates/validate \
  -H "Authorization: Bearer $RICKY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "channel_id": "8f3c2a5e-6b1d-4c7a-9e2f-1a2b3c4d5e6f",
    "name": "order_ready",
    "language": "en_US",
    "category": "UTILITY",
    "parameter_format": "POSITIONAL",
    "body": {
      "text": "Hi {{1}}, your order {{2}} is ready for pickup.",
      "examples": { "1": "Ana", "2": "10482" }
    },
    "footer": "Casa Nativa",
    "buttons": [{ "type": "QUICK_REPLY", "text": "Thanks" }]
  }'
```

The response is `200`. A good draft answers `valid: true` and the `components` Ricky would send to Meta. Otherwise it answers `valid: false` and, in `errors`, each problem with its field (`param`) and what to change (`message`).

A body that is not a draft, for example without `body`, gets `400 invalid_input`. Meta can still reject a valid draft in its review.

## Create a template

`POST /templates` takes the same body, with `channel_id` required: the template belongs to that number's business account. Send an `Idempotency-Key` so a retry does not submit it twice.

* `parameter_format`: `NAMED` (`{{name}}`) or `POSITIONAL` (`{{1}}`). It cannot change later.
* `header`: `TEXT`, `IMAGE`, `VIDEO`, `DOCUMENT` or `LOCATION`, or `null`. A media header needs a sample; see [Image, video and document headers](#image-video-and-document-headers).
* `body.examples`: one example per variable. Meta reviews them.
* `buttons`: quick replies, up to two links and one phone.

The response is `201` with the template, usually in `status: "PENDING"`. A draft that breaks a rule gets `400 invalid_input` with the first problem. If Meta refuses it, the response is `422 rule_violation` with its reason.

## Image, video and document headers

Meta reviews a media header with a sample file. Upload it in three steps, from the business account that will own the template:

1. `POST /templates/media` with `channel_id`, `mime_type` and `size_bytes` answers an `upload_url` and an `upload_path`. Images are JPEG or PNG up to 5 MB, videos MP4 or 3GPP up to 16 MB, documents PDF up to 100 MB.
2. `PUT` the bytes to `upload_url` with `Content-Type` set to `mime_type`. The URL is valid for two hours.
3. `POST /templates/media/complete` with `channel_id` and `upload_path` sends the file to Meta and answers its `handle`.

```bash
curl https://getricky.ai/api/v1/templates/media/complete \
  -H "Authorization: Bearer $RICKY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "channel_id": "8f3c2a5e-6b1d-4c7a-9e2f-1a2b3c4d5e6f",
    "upload_path": "…/template-samples/…/6f1e2d3c-4b5a-4968-8776-5a4b3c2d1e0f.jpg"
  }'
```

Send the handle as the header: `"header": { "type": "IMAGE", "handle": "4::aW1h…" }`. Ricky deletes its copy of the file once the upload completes, whether or not Meta takes it, so a failed upload starts again from step 1. Each message sent with the template carries its own file in its `header` component.

## Follow Meta's review

`GET /templates/{template_id}` reads the template from Meta. Its `status` is `PENDING` while Meta reviews it, then `APPROVED`, `REJECTED` or `PAUSED`. Only an `APPROVED` template can be sent. See [Sending messages](./sending-messages.md).

`GET /templates` lists the templates of all your business accounts.

## Edit and delete

`PATCH /templates/{template_id}` changes only what you send: `category`, `header`, `body`, `footer` or `buttons` (which replaces every button). Name, language and `parameter_format` do not change. Ricky sends the edited template to review again.

Meta allows edits only for `APPROVED`, `REJECTED` or `PAUSED` templates, and limits how often an approved one changes. When it does not allow the edit, the response is `422 rule_violation`. An edit of a template with an image, video or document header sends `header` again with a new sample `handle`, because Meta does not answer the old one. Templates with buttons Ricky's editor does not build, such as copy-code buttons, cannot be edited through the API.

`DELETE /templates/{template_id}` deletes the template at Meta. Meta deletes it in every language with that name, and the name cannot be used again for 30 days.

## Fill variables from contact fields

A template's variables can take a contact field's value when Ricky sends it to a contact, as in broadcasts. `GET /templates/{template_id}/field-mappings` answers the template's `variables` and its `mappings`.

`PUT /templates/{template_id}/field-mappings` replaces every mapping. Each one names a variable (`component` and `key`, as `variables` lists them) and a `source`: a field every contact has, `{ "kind": "native", "field": "first_name" }`, or a custom field, `{ "kind": "custom", "field_id": "…" }` from `GET /contact-fields`. A variable the template does not have, or a field of another organization, gets `400 invalid_input`. Send `"mappings": []` to remove them all.

Mappings belong to the template's name and language in its business account, so they stay when the template is edited.

## WhatsApp numbers

`GET /whatsapp-numbers` lists the organization's numbers, disconnected ones included. `GET /whatsapp-numbers/{channel_id}` reads one.

Each number carries what Ricky's WhatsApp settings show:

| Field              | What it is                                                                                                                       |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `status`           | The number's status at Meta, for example `CONNECTED`.                                                                            |
| `messaging_health` | Whether Meta lets it send: `available`, `limited` or `blocked`.                                                                  |
| `quality_rating`   | Quality at Meta: `green`, `yellow`, `red`, `not_yet_determined` or `unknown`.                                                    |
| `messaging_limit`  | Messaging limit at Meta, for example `TIER_1K` or `TIER_UNLIMITED`; `UNKNOWN` until Meta reports it.                             |
| `last_synced_at`   | When Ricky last read these details from Meta.                                                                                    |
| `name_status`      | Review status of the display name at Meta, in lowercase, for example `approved`.                                                 |
| `business_profile` | What customers see on the profile: `about`, `description`, `address`, `email`, `vertical`, `websites` and `profile_picture_url`. |

## Manage a number

These writes need `conversations:write`. Each one changes the number at Meta, then answers it as Ricky reads it back:

* `PATCH /whatsapp-numbers/{channel_id}` with `calls_enabled` turns calls to the number on or off.
* `PATCH /whatsapp-numbers/{channel_id}/business-profile` changes only the profile fields you send. `about` takes up to 139 characters, `description` 512, `address` 256, `email` 128, and `websites` up to two URLs. `vertical` takes the values Meta lists, such as `RETAIL`.
* `POST /whatsapp-numbers/{channel_id}/profile-photo` begins a JPEG or PNG photo of up to 5 MB; `PUT` the bytes to `upload_url`, then call `POST /whatsapp-numbers/{channel_id}/profile-photo/complete` with `upload_path`.
* `POST /whatsapp-numbers/{channel_id}/display-name` with `display_name` asks Meta to review a new name and answers `202`. The name changes only if Meta approves it; then `verified_name` and `name_status` change.
* `POST /whatsapp-numbers/{channel_id}/refresh` reads the number's details from Meta now.

When Meta refuses a value, the response is `422 rule_violation` with Meta's reason. A disconnected number also gets `422 rule_violation`.
