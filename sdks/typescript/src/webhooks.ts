import { createHmac, timingSafeEqual } from 'node:crypto';

import { WebhookVerificationError } from './errors.js';
import type { WebhookEvent as PublishedWebhookEvent } from './generated/types.gen.js';

/**
 * The JSON Ricky posts to a webhook endpoint. `type` is open: new event types
 * ship without a new API version, so handle the ones you know and ignore the
 * rest.
 */
export type WebhookEvent = Omit<PublishedWebhookEvent, 'type' | 'data'> & {
  type: PublishedWebhookEvent['type'] | (string & {});
  data: PublishedWebhookEvent['data'] & Record<string, unknown>;
};

/** Request headers as `Headers`, or the plain object Node.js, Express and most frameworks give. */
export type WebhookHeaders = Headers | Record<string, string | string[] | undefined>;

/**
 * Verifies a delivery and returns its event. Pass the raw request body exactly
 * as received, before any JSON parsing.
 *
 * `X-Ricky-Signature` holds one `v1=<hex>` value, or several separated by
 * commas while a signing secret is being rotated; the delivery is valid when
 * any of them is the HMAC-SHA256 of `<X-Ricky-Timestamp>.<body>` with
 * `secret`. Deliveries whose timestamp is more than `tolerance` seconds from
 * now are rejected, which defeats replays.
 *
 * @throws {WebhookVerificationError} when the delivery must be rejected.
 */
export function verifyWebhook(
  payload: string | Uint8Array,
  headers: WebhookHeaders,
  secret: string,
  tolerance = 300,
): WebhookEvent {
  if (typeof payload !== 'string' && !(payload instanceof Uint8Array)) {
    throw new WebhookVerificationError('Pass the raw request body, not parsed JSON.');
  }
  if (!secret) throw new WebhookVerificationError('The webhook signing secret is empty.');
  const timestamp = header(headers, 'x-ricky-timestamp');
  const signatures = header(headers, 'x-ricky-signature');
  if (!timestamp || !signatures) {
    throw new WebhookVerificationError('Missing X-Ricky-Timestamp or X-Ricky-Signature header.');
  }
  if (!/^\d+$/.test(timestamp)) {
    throw new WebhookVerificationError('X-Ricky-Timestamp is not a Unix timestamp.');
  }
  if (Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp)) > tolerance) {
    throw new WebhookVerificationError('X-Ricky-Timestamp is outside the tolerance.');
  }
  const body = typeof payload === 'string' ? Buffer.from(payload, 'utf8') : Buffer.from(payload);
  const expected = Buffer.from(
    `v1=${createHmac('sha256', secret).update(`${timestamp}.`).update(body).digest('hex')}`,
  );
  const matches = signatures
    .split(',')
    .map((candidate) => Buffer.from(candidate.trim()))
    .filter((candidate) => candidate.length === expected.length)
    .some((candidate) => timingSafeEqual(candidate, expected));
  if (!matches) throw new WebhookVerificationError('No signature matches this payload.');
  try {
    return JSON.parse(body.toString('utf8')) as WebhookEvent;
  } catch {
    throw new WebhookVerificationError('The payload is not JSON.');
  }
}

function header(headers: WebhookHeaders, name: string): string | undefined {
  if (headers instanceof Headers) return headers.get(name) ?? undefined;
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === name) return Array.isArray(value) ? value.join(',') : value;
  }
  return undefined;
}
