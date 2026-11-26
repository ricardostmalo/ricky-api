import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';

import { Ricky, RickyConnectionError, RickyError } from 'getricky';
import type { Channel, Contact, Send } from 'getricky';

const API_KEY = 'rky_live_test';

type Reply = Response | (() => Response) | Error;

/** A fake `fetch` that records every request and answers from a script. */
function fakeFetch(...replies: Reply[]) {
  const requests: Request[] = [];
  const fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    requests.push(new Request(input, init));
    const reply = replies.shift();
    if (reply === undefined) throw new Error('Unexpected request');
    if (reply instanceof Error) throw reply;
    return typeof reply === 'function' ? reply() : reply;
  };
  return { fetch: fetch as typeof globalThis.fetch, requests };
}

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json', ...headers },
    status,
  });
}

function apiError(status: number, code: string, extra: Record<string, string> = {}): Response {
  return json(status, {
    error: { code, message: `${code} happened`, request_id: 'req_1', ...extra },
  });
}

const channel: Channel = {
  address: '+50760000000',
  connected_at: '2026-10-14T15:30:00.000Z',
  id: '8f3c2a5e-6b1d-4c7a-9e2f-1a2b3c4d5e6f',
  name: 'Casa Nativa',
  type: 'whatsapp',
  whatsapp_business_account_id: '102030405060708',
};

const send: Send = {
  conversation_id: '5b0c3f1e-8d2a-4e7b-9c61-2f4a8e9d1b37',
  created_at: '2026-10-14T15:30:00.000Z',
  failure_reason: null,
  id: '0e9a1c42-7f3b-4d58-a6e2-91c4b7d3f805',
  message_id: null,
  status: 'queued',
};

describe('Ricky client', () => {
  it('sends the API key as a bearer token to the default base URL', async () => {
    const { fetch, requests } = fakeFetch(json(200, { data: [channel], next_cursor: null }));
    const ricky = new Ricky(API_KEY, { fetch });

    const { data } = await ricky.listChannels();

    assert.deepEqual(data, [channel]);
    assert.equal(requests[0]?.url, 'https://getricky.ai/api/v1/channels');
    assert.equal(requests[0]?.headers.get('authorization'), `Bearer ${API_KEY}`);
  });

  it('uses a custom base URL and fills path parameters', async () => {
    const { fetch, requests } = fakeFetch(json(200, { data: send }));
    const ricky = new Ricky(API_KEY, { baseUrl: 'http://localhost:3000/api/v1', fetch });

    await ricky.getSend({ path: { send_id: send.id } });

    assert.equal(requests[0]?.url, `http://localhost:3000/api/v1/sends/${send.id}`);
  });

  it('reads the key from RICKY_API_KEY and refuses to start without one', () => {
    const saved = process.env.RICKY_API_KEY;
    try {
      delete process.env.RICKY_API_KEY;
      assert.throws(() => new Ricky(), /RICKY_API_KEY/);
      process.env.RICKY_API_KEY = API_KEY;
      assert.ok(new Ricky());
    } finally {
      if (saved === undefined) delete process.env.RICKY_API_KEY;
      else process.env.RICKY_API_KEY = saved;
    }
  });

  it('adds a random Idempotency-Key to writes that accept one', async () => {
    const { fetch, requests } = fakeFetch(json(202, { data: send }), json(202, { data: send }));
    const ricky = new Ricky(API_KEY, { fetch });
    const body = {
      channel_id: channel.id,
      phone: '+50760001234',
      template: { id: '1234567890' },
    };

    await ricky.startConversation({ body });
    await ricky.startConversation({ body });

    const keys = requests.map((request) => request.headers.get('idempotency-key'));
    assert.match(keys[0] ?? '', /^[0-9a-f-]{36}$/);
    assert.notEqual(keys[0], keys[1]);
    assert.deepEqual(await requests[0]?.json(), body);
  });

  it('keeps the Idempotency-Key the caller passes', async () => {
    const { fetch, requests } = fakeFetch(json(202, { data: send }));
    const ricky = new Ricky(API_KEY, { fetch });

    await ricky.sendMessage({
      body: { text: 'Hola', type: 'text' },
      headers: { 'Idempotency-Key': 'order-10482-ready' },
      path: { conversation_id: send.conversation_id },
    });

    assert.equal(requests[0]?.headers.get('idempotency-key'), 'order-10482-ready');
  });

  it('sends no Idempotency-Key to operations that do not take one', async () => {
    const { fetch, requests } = fakeFetch(json(201, { data: {} }));
    const ricky = new Ricky(API_KEY, { fetch });

    await ricky.createWebhook({
      body: { event_types: ['message.received'], url: 'https://example.com/hook' },
    });

    assert.equal(requests[0]?.headers.has('idempotency-key'), false);
  });

  it('rejects with a RickyError carrying the code, status, param and request ID', async () => {
    const { fetch } = fakeFetch(apiError(400, 'invalid_input', { param: 'phone' }));
    const ricky = new Ricky(API_KEY, { fetch });

    const error = await ricky.getContact({ path: { contact_id: 'x' } }).catch((e: unknown) => e);

    assert.ok(error instanceof RickyError);
    assert.equal(error.status, 400);
    assert.equal(error.code, 'invalid_input');
    assert.equal(error.param, 'phone');
    assert.equal(error.requestId, 'req_1');
    assert.equal(error.message, 'invalid_input happened');
  });

  it('reports a non-JSON error with a null code and the X-Request-Id header', async () => {
    const { fetch } = fakeFetch(
      new Response('Bad gateway', { headers: { 'X-Request-Id': 'req_2' }, status: 502 }),
    );
    const ricky = new Ricky(API_KEY, { fetch, maxRetries: 0 });

    const error = await ricky.listTags().catch((e: unknown) => e);

    assert.ok(error instanceof RickyError);
    assert.equal(error.status, 502);
    assert.equal(error.code, null);
    assert.equal(error.requestId, 'req_2');
  });

  it('retries a read after 429, waiting for Retry-After', async () => {
    const limited = apiError(429, 'rate_limited');
    limited.headers.set('Retry-After', '1');
    const { fetch, requests } = fakeFetch(limited, json(200, { data: [], next_cursor: null }));
    const ricky = new Ricky(API_KEY, { fetch });

    const started = Date.now();
    const { data } = await ricky.listMembers();

    assert.deepEqual(data, []);
    assert.equal(requests.length, 2);
    assert.ok(Date.now() - started >= 950, 'waited for Retry-After');
  });

  it('retries a keyed write after 503 with the same Idempotency-Key and body', async () => {
    const unavailable = apiError(503, 'unavailable');
    unavailable.headers.set('Retry-After', '0');
    const { fetch, requests } = fakeFetch(unavailable, json(202, { data: send }));
    const ricky = new Ricky(API_KEY, { fetch });

    const { data } = await ricky.sendMessage({
      body: { text: 'Hola', type: 'text' },
      path: { conversation_id: send.conversation_id },
    });

    assert.equal(data.id, send.id);
    assert.equal(requests.length, 2);
    assert.equal(
      requests[0]?.headers.get('idempotency-key'),
      requests[1]?.headers.get('idempotency-key'),
    );
    assert.deepEqual(await requests[1]?.json(), { text: 'Hola', type: 'text' });
  });

  it('never retries a write without an Idempotency-Key', async () => {
    const limited = apiError(429, 'rate_limited');
    limited.headers.set('Retry-After', '0');
    const { fetch, requests } = fakeFetch(limited);
    const ricky = new Ricky(API_KEY, { fetch });

    const error = await ricky
      .createWebhook({ body: { event_types: ['message.received'], url: 'https://example.com' } })
      .catch((e: unknown) => e);

    assert.ok(error instanceof RickyError);
    assert.equal(error.code, 'rate_limited');
    assert.equal(requests.length, 1);
  });

  it('gives up after maxRetries and surfaces the last error', async () => {
    const replies = [1, 2, 3].map(() => {
      const response = apiError(500, 'internal_error');
      response.headers.set('Retry-After', '0');
      return response;
    });
    const { fetch, requests } = fakeFetch(...replies);
    const ricky = new Ricky(API_KEY, { fetch, maxRetries: 2 });

    const error = await ricky.listTemplates().catch((e: unknown) => e);

    assert.ok(error instanceof RickyError);
    assert.equal(error.code, 'internal_error');
    assert.equal(requests.length, 3);
  });

  it('wraps a network failure in RickyConnectionError after retrying', async () => {
    const { fetch, requests } = fakeFetch(
      new TypeError('fetch failed'),
      new TypeError('fetch failed'),
    );
    const ricky = new Ricky(API_KEY, { fetch, maxRetries: 1 });

    const error = await ricky.listChannels().catch((e: unknown) => e);

    assert.ok(error instanceof RickyConnectionError);
    assert.equal(requests.length, 2);
  });

  it('paginates items across pages, passing next_cursor back as cursor', async () => {
    const contact = (id: string) => ({ id }) as Contact;
    const { fetch, requests } = fakeFetch(
      json(200, { data: [contact('a'), contact('b')], next_cursor: 'c1' }),
      json(200, { data: [contact('c')], next_cursor: null }),
    );
    const ricky = new Ricky(API_KEY, { fetch });

    const ids: string[] = [];
    for await (const item of ricky.paginate(ricky.listContacts, { query: { page_size: 2 } })) {
      ids.push(item.id);
    }

    assert.deepEqual(ids, ['a', 'b', 'c']);
    const urls = requests.map((request) => new URL(request.url));
    assert.equal(urls[0]?.searchParams.get('cursor'), null);
    assert.equal(urls[1]?.searchParams.get('cursor'), 'c1');
    assert.equal(urls[1]?.searchParams.get('page_size'), '2');
  });

  it('paginates whole pages of an operation with path parameters', async () => {
    const { fetch, requests } = fakeFetch(
      json(200, { data: [{ id: 'm1' }], next_cursor: 'c1' }),
      json(200, { data: [{ id: 'm2' }], next_cursor: null }),
    );
    const ricky = new Ricky(API_KEY, { fetch });

    const pages = [];
    for await (const page of ricky
      .paginate(ricky.listMessages, { path: { conversation_id: send.conversation_id } })
      .pages()) {
      pages.push(page.data.map((message) => message.id));
    }

    assert.deepEqual(pages, [['m1'], ['m2']]);
    assert.ok(requests[1]?.url.includes(`/conversations/${send.conversation_id}/messages`));
  });

  it('loads as CommonJS too', () => {
    const require = createRequire(import.meta.url);
    const cjs = require('getricky') as typeof import('getricky');
    assert.equal(typeof cjs.Ricky, 'function');
    assert.equal(typeof cjs.verifyWebhook, 'function');
  });
});
