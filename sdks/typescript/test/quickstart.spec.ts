import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Ricky } from 'getricky';
import type { Send } from 'getricky';

// The README's quick start, against a fake API, so it keeps compiling and working.
describe('the README quick start', () => {
  it('lists channels, starts a conversation and follows the send', async () => {
    const queued: Send = {
      conversation_id: '9b2e4c61-7a3f-4d18-b5c2-6e0f1a2b3c4d',
      created_at: '2026-10-14T15:30:00.000Z',
      failure_reason: null,
      id: '6a7b8c9d-0e1f-4a2b-9c3d-4e5f6a7b8c9d',
      message_id: null,
      status: 'queued',
    };
    const replies = [
      {
        data: [
          {
            address: '+50760000000',
            connected_at: '2026-10-14T15:30:00.000Z',
            id: '8f3c2a5e-6b1d-4c7a-9e2f-1a2b3c4d5e6f',
            name: 'Casa Nativa',
            type: 'whatsapp',
            whatsapp_business_account_id: '102030405060708',
          },
        ],
        next_cursor: null,
      },
      { data: queued },
      { data: { ...queued, message_id: 'c41d7e2a-5b6f-4a89-8c3d-0e1f2a3b4c5d', status: 'sent' } },
    ];
    const urls: string[] = [];
    const fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      urls.push(new Request(input, init).url);
      return Response.json(replies.shift());
    };
    const ricky = new Ricky('rky_live_test', { fetch });

    const { data: channels } = await ricky.listChannels();
    const whatsapp = channels.find((channel) => channel.type === 'whatsapp');
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
    while (send.status === 'queued') {
      ({ data: send } = await ricky.getSend({ path: { send_id: send.id } }));
    }

    assert.equal(send.status, 'sent');
    assert.deepEqual(urls, [
      'https://getricky.ai/api/v1/channels',
      'https://getricky.ai/api/v1/conversations',
      `https://getricky.ai/api/v1/sends/${queued.id}`,
    ]);
  });

  it('stops at once when the caller aborts', async () => {
    const controller = new AbortController();
    controller.abort();
    const ricky = new Ricky('rky_live_test', {
      fetch: (input, init) => globalThis.fetch(new Request(input, init)),
    });

    await assert.rejects(ricky.listChannels({ signal: controller.signal }), {
      name: 'RickyConnectionError',
    });
  });
});
