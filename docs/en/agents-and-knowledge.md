# Agents and knowledge

URL: https://getricky.ai/en/docs/api/agents-and-knowledge

> Create AI agents, put them on conversations and keep the information they share up to date.

An agent answers customers with its instructions and capabilities. The knowledge is what the organization's agents share: locations, directory contact cards and files.

Agents need `agents:read` and `agents:write`. Putting an agent on a conversation needs `conversations:write`. Knowledge needs `knowledge:read` and `knowledge:write`.

## 1. Read the options

`GET /agent-options` lists the voices and capabilities Ricky accepts. Use only those values: anything else answers `400 invalid_input`.

```bash
curl https://getricky.ai/api/v1/agent-options \
  -H "Authorization: Bearer $RICKY_API_KEY"
```

A capability with a `family` other than `human_handoff` works only once the organization connects that integration in Ricky. `ricky.handoff.request` needs `handoff_user_ids`: the members who receive the conversation.

## 2. Create an agent

```bash
curl https://getricky.ai/api/v1/agents \
  -H "Authorization: Bearer $RICKY_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: agent-sales-v1" \
  -d '{
    "name": "Sales assistant",
    "instructions": "Greet by name and confirm the order before giving a delivery date.",
    "capabilities": ["ricky.handoff.request"],
    "handoff_user_ids": ["2d4f6a8c-1b3d-4e5f-8a7b-9c0d1e2f3a4b"]
  }'
```

Without `voice`, the agent gets the default of `GET /agent-options`. `PATCH /agents/{agent_id}` changes only the fields you send; `capabilities` and `handoff_user_ids` replace their whole sets. `DELETE /agents/{agent_id}` archives it: its conversations stop being answered by it and the workflows that assign it are paused.

## 3. Put it on a conversation

```bash
curl -X PATCH https://getricky.ai/api/v1/conversations/$CONVERSATION_ID/agent \
  -H "Authorization: Bearer $RICKY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "agent_id": "7e8f9a0b-1c2d-4e3f-a4b5-c6d7e8f9a0b1" }'
```

The response is the conversation with its `agent_id`. The conversation is no longer assigned to a member. `"agent_id": null` turns the AI off for that conversation.

## 4. Locations and directory contacts

`/knowledge/locations` keeps the branches the agents send as a WhatsApp location: name, address, confirmed coordinates, phone, email and hours. `/knowledge/contacts` keeps the contact cards they send; each one needs a display name and a phone or an email. Both accept `GET`, `POST`, `PATCH` and `DELETE`, and Ricky stores phones in E.164.

## 5. Upload a file

A file uploads in three steps, so its bytes never pass through the JSON body.

```bash
curl https://getricky.ai/api/v1/knowledge/files \
  -H "Authorization: Bearer $RICKY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Price list 2026",
    "filename": "prices.pdf",
    "mime_type": "application/pdf",
    "size_bytes": 482133
  }'
```

The response carries the file, `uploading`, and an `upload_url` valid for two hours. Send the bytes there with the same type and size you declared:

```bash
curl -X PUT "$UPLOAD_URL" -H "Content-Type: application/pdf" --data-binary @prices.pdf
```

Then complete it. Ricky checks the bytes, reads the content for the agents and answers the file, `ready`; a long PDF can take minutes.

```bash
curl -X POST https://getricky.ai/api/v1/knowledge/files/$FILE_ID/complete \
  -H "Authorization: Bearer $RICKY_API_KEY"
```

PDF, Word and Excel files go up to 100 MB; JPEG and PNG images up to 5 MB. If Ricky reads no useful content, `extraction_error` says so and the agents cannot consult it, though they can still send it. `GET /knowledge/files/{file_id}` of a `ready` file carries a `download_url` valid for five minutes.
