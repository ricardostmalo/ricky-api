// A Ricky webhook receiver for Node.js 18 or later, with no dependencies.
//
//   RICKY_WEBHOOK_SECRET=whsec_... node verify-webhook.mjs
//
// It verifies X-Ricky-Signature over the raw body, rejects timestamps more than
// five minutes away, answers 2xx quickly and ignores deliveries it already saw.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';

const TOLERANCE_SECONDS = 300;

/** True when `signature` is Ricky's signature of this exact body and timestamp. */
export function verifyRickySignature({ body, signature, timestamp, secret, now = Date.now() }) {
  const sentAt = Number(timestamp);
  if (!signature || !Number.isInteger(sentAt)) return false;
  if (Math.abs(Math.floor(now / 1000) - sentAt) > TOLERANCE_SECONDS) return false;
  const expected = Buffer.from(
    `v1=${createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')}`,
  );
  // During a secret rotation the header carries two comma-separated signatures.
  return signature.split(',').some((candidate) => {
    const received = Buffer.from(candidate.trim());
    return expected.length === received.length && timingSafeEqual(expected, received);
  });
}

const seen = new Set(); // Use a durable store in production.

function handle(request, response) {
  const chunks = [];
  request.on('data', (chunk) => chunks.push(chunk));
  request.on('end', () => {
    const body = Buffer.concat(chunks).toString('utf8');
    const valid = verifyRickySignature({
      body,
      secret: process.env.RICKY_WEBHOOK_SECRET,
      signature: request.headers['x-ricky-signature'],
      timestamp: request.headers['x-ricky-timestamp'],
    });
    if (!valid) {
      response.writeHead(401).end();
      return;
    }
    const event = JSON.parse(body);
    if (!seen.has(event.id)) {
      seen.add(event.id);
      // Queue the work; answer within 10 seconds.
      console.log(event.type, event.data);
    }
    response.writeHead(204).end();
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (!process.env.RICKY_WEBHOOK_SECRET) throw new Error('Set RICKY_WEBHOOK_SECRET');
  createServer(handle).listen(3000, () => console.log('Listening on http://localhost:3000'));
}
