# Ricky TypeScript SDK

The official TypeScript and JavaScript client for the [Ricky](https://getricky.ai) REST API: contacts, conversations, messages, templates and webhooks of one organization.

- Guides and reference: <https://getricky.ai/docs/api>
- Source and OpenAPI description: <https://github.com/ricardostmalo/ricky-api>

Node.js 18 or later, ES modules or CommonJS, with types included. No runtime dependencies: it uses the built-in `fetch`.

```bash
# Until it is on npm: build it from sdks/typescript with `npm ci && npm pack`,
# then `npm install ./getricky-0.1.0.tgz`.
npm install getricky
```

## Quick start

Create a key in Ricky under **Settings → API** and keep it on your server. `new Ricky()` reads it from `RICKY_API_KEY` when you pass none.

```ts
import { Ricky } from 'getricky';

const ricky = new Ricky(); // or new Ricky('rky_live_…')

// The channels the organization can send from.
const { data: channels } = await ricky.listChannels();
const whatsapp = channels.find((channel) => channel.type === 'whatsapp');

// Send an approved WhatsApp template to a phone number. Ricky finds or creates
// the contact and its conversation, and answers with the send it queued.
let { data: send } = await ricky.startConversation({
  body: {
    channel_id: whatsapp!.id,
    phone: '+50760001234',
    template: {
      id: '1234567890',
      components: [{ type: 'body', parameters: [{ type: 'text', text: 'Ana' }] }],
    },
  },
  headers: { 'Idempotency-Key': 'order-10482-ready' },
});

// Follow it until the provider accepts it.
while (send.status === 'queued') {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  ({ data: send } = await ricky.getSend({ path: { send_id: send.id } }));
}
console.log(send.status, send.failure_reason);
```

Every operation of the API is a method named after its `operationId` (`listContacts`, `sendMessage`, …). Each takes one object with the parts the operation uses, `{ path, query, body, headers }`, and resolves to the response body as the API sends it: `{ data }` for one resource and `{ data, next_cursor }` for a list. Every request and response is typed, and every schema is exported as a type (`Contact`, `Conversation`, `SendMessage`, …).

## Pagination

`paginate` walks every page of a list operation and yields its items; `.pages()` yields whole pages:

```ts
for await (const contact of ricky.paginate(ricky.listContacts, { query: { tag_id } })) {
  console.log(contact.id, contact.first_name);
}

for await (const page of ricky
  .paginate(ricky.listMessages, { path: { conversation_id } })
  .pages()) {
  console.log(page.data.length);
}
```

## Errors

A failed request rejects with `RickyError`, carrying the API's `code`, the HTTP `status`, the `param` that caused it when known, and the `requestId` to quote to support. A request that never got an answer rejects with `RickyConnectionError`.

```ts
import { RickyError } from 'getricky';

try {
  await ricky.sendMessage({
    path: { conversation_id },
    body: { type: 'text', text: 'Hola' },
  });
} catch (error) {
  if (error instanceof RickyError && error.code === 'outside_messaging_window') {
    // Send an approved template instead.
  } else {
    throw error;
  }
}
```

## Retries and idempotency

Writes that accept an `Idempotency-Key` get a random one unless you pass `headers: { 'Idempotency-Key': … }`. Pass your own, derived from your data, to make a retry from your side safe too: the same key and body replay the first response instead of repeating the write.

Reads, and writes that carry a key, are retried twice on connection errors, `429` and `5xx`, waiting as `Retry-After` says or backing off exponentially. Change it with `new Ricky(key, { maxRetries })`. A write the API may have applied before failing answers `request_processing` on retry: read the resource before trying again.

## Webhooks

`verifyWebhook` checks the `X-Ricky-Signature` and `X-Ricky-Timestamp` headers against the raw body, rejects deliveries more than five minutes old, and returns the event. With Express:

```ts
import express from 'express';
import { verifyWebhook, WebhookVerificationError } from 'getricky';

const app = express();

app.post('/ricky/webhooks', express.raw({ type: 'application/json' }), (req, res) => {
  let event;
  try {
    event = verifyWebhook(req.body, req.headers, process.env.RICKY_WEBHOOK_SECRET!);
  } catch (error) {
    if (error instanceof WebhookVerificationError) return res.sendStatus(401);
    throw error;
  }
  if (event.type === 'message.received') {
    // Queue the work; deduplicate by event.id.
  }
  res.sendStatus(204);
});
```

In a framework built on the Fetch API (Next.js route handlers, Hono), pass `await request.text()` and `request.headers`.

Answer within 10 seconds. Deliveries can repeat, so deduplicate by `event.id`. New event types ship without a new API version: handle the ones you know and ignore the rest.

## Configuration

```ts
new Ricky('rky_live_…', {
  baseUrl: 'https://getricky.ai/api/v1',
  maxRetries: 2,
  fetch: globalThis.fetch, // any fetch implementation
});
```

Cancel a request by passing `signal` from an `AbortController` with its options.

## License

[MIT](LICENSE)
