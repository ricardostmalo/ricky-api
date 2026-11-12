---
name: ricky
description: Work in Ricky, the customer-conversation platform (getricky.ai), on behalf of a business that uses it - read and act on its WhatsApp, Instagram and Messenger inbox, contacts, broadcasts, workflows, AI agents and reports, safely. Use when a person asks an AI agent (Claude Code, Codex, Claude, ChatGPT) to look something up in Ricky, answer or follow up customers, analyze conversations or ads, or automate work for a company that uses Ricky. For code against the REST API, also load the ricky-api skill.
---

# Ricky

Ricky is a shared inbox and CRM where a company's team and its AI agents talk with customers on WhatsApp, Instagram, Messenger, voice and web chat. Companies use it for sales and support: answer chats, assign them, send WhatsApp templates and broadcasts, run workflows, and read reports, including which Meta ad brought each chat.

## Two ways in

| Way | Who it acts as | Use it for |
| --- | --- | --- |
| **Connector** for Claude and ChatGPT: MCP server `https://getricky.ai/api/mcp`, connected under **Settings → My account** in Ricky | The person who connected it, with their role's permissions | Questions and actions a person asks in a chat with an assistant |
| **REST API** `https://getricky.ai/api/v1` with an organization key from **Settings → API** (owners and admins create keys) | The organization, limited to the key's scopes | Scripts, reports, integrations and Claude Code or Codex work; see the `ricky-api` skill |

Each connection and each key belongs to one organization. Confirm which organization you are in before you read or change anything, and never mix data of two organizations.

## Rules that protect the business

- **Read before you act.** Look up the conversation, contact or template, show what you found, and act only on what the person asked for, in their words.
- **A message to a customer is irreversible.** Send one only when the person explicitly asked for that message to that customer. A question such as "should we tell her?" is not an instruction to send. Never send tests to real customers.
- **WhatsApp's 24-hour window.** Free text reaches a customer only within 24 hours of their last message; after that only an approved template can start the conversation again (`outside_messaging_window`). Broadcasts and templates cost the business money at Meta.
- **Never delete or bulk-change without a clear instruction.** Closing, reassigning, retagging or editing many conversations or contacts changes what the team sees; describe the change and its size first.
- **Keep customer data in Ricky.** Do not paste phone numbers, names or chats into other tools or public places unless the person asked for that destination.
- **Use the narrowest access.** For analysis, a key with **View only** is enough and cannot change anything.

## What Ricky knows, and what it does not

- Conversations, messages (with media and voice-note transcripts), contacts with tags and custom fields, members, AI agents, templates, broadcasts, workflows and their executions.
- **Where a customer came from.** When someone writes from a Click to WhatsApp, Instagram or Messenger ad, Meta sends the ad ID with the message. Ricky shows it on the message (`ad_referral`), the conversation (`first_ad_referral`, `latest_ad_referral`) and the contact (`first_ad_referral` first touch, `last_ad_referral` last touch), and `GET /ads/conversations` lists every conversation an ad brought with what happened after. The ad's name, campaign and ad set (`resolved`) come from Ricky's sync of the connected Meta ad account, not from the message.
- **Meta Ads.** With Meta Ads connected, campaigns, ad sets, ads and their spend and results are read live from Meta (`/ads/*`), and the Ads report puts spend next to the conversations each ad brought.
- **Sales.** Ricky records a sale only when a member closes a conversation as a sale (`close_category: "sale"`), without an amount. Revenue, payments and appointments live in the business's own systems; say so instead of estimating them.
- Reports use America/Panama days; Meta's figures use the ad account's time zone. State the period and the definition with every number.

## Common requests

- **"Who came from our ads this month, and what did they ask?"** List `GET /ads/conversations?from=…&to=…`, read the first message of each row (`message_text`) and, where needed, the conversation's messages; group by `ad_referral.ad_id` or `ad_referral.resolved.campaign_name`; join spend from `GET /ads/insights?level=ad`.
- **"Find the chat with Ana."** Search conversations (`GET /conversations/search?query=Ana`) or contacts (`GET /contacts?query=Ana`), then read the messages.
- **"What is waiting for us?"** `GET /conversations?status=open&last_message_from=customer`, or the live dashboard `GET /reports/dashboard`.
- **"Send the order-ready template to this number."** Confirm the template, the variables and the number with the person, then `POST /conversations` with an `Idempotency-Key`, and follow `GET /sends/{send_id}` until it is `sent` or `failed`.

## When something fails

Every error has a stable `code` and a `request_id`. `insufficient_scope` means the key lacks a scope: an admin adds it in **Settings → API**. `rule_violation` explains a business rule (for example, Meta Ads not connected). `upstream_error` means Meta or another provider failed; retry later. Quote the `request_id` when reporting a problem to Ricky (ricardo@getricky.ai).

Guides: <https://getricky.ai/en/docs/api>. Contract: <https://getricky.ai/openapi.json>.
