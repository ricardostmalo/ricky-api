import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { verifyWebhook, WebhookVerificationError } from 'getricky';

/** Signed by the server's own signDeveloperWebhook; see sdks/README.md. */
const vector = JSON.parse(
  readFileSync(new URL('../../webhook-vectors.json', import.meta.url), 'utf8'),
) as {
  body: string;
  previous_secret: string;
  rotation_signature: string;
  secret: string;
  signature: string;
  timestamp: string;
};

// The vector's timestamp is fixed; a tolerance this wide only skips the clock check.
const ANY_TIME = Number.MAX_SAFE_INTEGER;

function sign(secret: string, timestamp: string, body: string): string {
  return `v1=${createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')}`;
}

function headersFor(signature: string, timestamp = vector.timestamp) {
  return { 'x-ricky-signature': signature, 'x-ricky-timestamp': timestamp };
}

describe('verifyWebhook', () => {
  it('accepts the server-signed vector and returns the event', () => {
    const event = verifyWebhook(vector.body, headersFor(vector.signature), vector.secret, ANY_TIME);

    assert.equal(event.type, 'message.received');
    assert.equal(event.id, '0e9a1c42-7f3b-4d58-a6e2-91c4b7d3f805');
    assert.equal(event.data.message_id, '9d27e6b1-3c4f-4a80-b5d9-6e1f2a7c8b44');
  });

  it('accepts a Buffer body and a Headers object', () => {
    const headers = new Headers({
      'X-Ricky-Signature': vector.signature,
      'X-Ricky-Timestamp': vector.timestamp,
    });

    const event = verifyWebhook(Buffer.from(vector.body), headers, vector.secret, ANY_TIME);

    assert.equal(event.type, 'message.received');
  });

  it('accepts either signature while a secret rotates', () => {
    const headers = headersFor(vector.rotation_signature);

    assert.ok(verifyWebhook(vector.body, headers, vector.secret, ANY_TIME));
    assert.ok(verifyWebhook(vector.body, headers, vector.previous_secret, ANY_TIME));
  });

  it('rejects a wrong secret, a tampered body and a malformed signature', () => {
    const reject = (body: string, signature: string, secret: string) =>
      assert.throws(
        () => verifyWebhook(body, headersFor(signature), secret, ANY_TIME),
        WebhookVerificationError,
      );

    reject(vector.body, vector.signature, 'whsec_wrong');
    reject(
      vector.body.replace('message.received', 'message.read'),
      vector.signature,
      vector.secret,
    );
    reject(vector.body, vector.signature.slice(0, -2), vector.secret);
    reject(vector.body, vector.signature.replace('v1=', 'v0='), vector.secret);
  });

  it('enforces the timestamp tolerance', () => {
    const now = Math.floor(Date.now() / 1000);
    const body = '{"id":"x","type":"contact.created","data":{}}';
    const at = (timestamp: number) => {
      const stamp = String(timestamp);
      return verifyWebhook(body, headersFor(sign('s', stamp, body), stamp), 's');
    };

    assert.equal(at(now - 299).id, 'x');
    assert.throws(() => at(now - 301), /tolerance/);
    assert.throws(() => at(now + 301), /tolerance/);
  });

  it('returns event types it does not know yet', () => {
    const now = String(Math.floor(Date.now() / 1000));
    const body = '{"id":"x","type":"webhook.test","data":{"webhook_id":"w1"}}';

    const event = verifyWebhook(body, headersFor(sign('s', now, body), now), 's');

    assert.equal(event.type, 'webhook.test');
    assert.equal(event.data.webhook_id, 'w1');
  });

  it('rejects missing headers and non-numeric timestamps', () => {
    assert.throws(() => verifyWebhook(vector.body, {}, vector.secret), WebhookVerificationError);
    assert.throws(
      () => verifyWebhook(vector.body, headersFor(vector.signature, 'yesterday'), vector.secret),
      /Unix timestamp/,
    );
  });
});
