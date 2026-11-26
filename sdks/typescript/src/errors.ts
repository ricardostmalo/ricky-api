import type { Error as ErrorBody } from './generated/types.gen.js';

/** A stable error code from the API's catalog. New codes may appear at any time. */
export type RickyErrorCode = ErrorBody['error']['code'] | (string & {});

/**
 * The API answered with an error. `code` is stable and safe to branch on;
 * `message` is for people. `code` and `requestId` are null only when the
 * response did not come from the API itself (a proxy page, for example).
 */
export class RickyError extends Error {
  override readonly name = 'RickyError';
  readonly status: number;
  readonly code: RickyErrorCode | null;
  readonly param: string | null;
  readonly requestId: string | null;
  readonly headers: Headers;

  constructor(options: {
    code: RickyErrorCode | null;
    headers: Headers;
    message: string;
    param: string | null;
    requestId: string | null;
    status: number;
  }) {
    super(options.message);
    this.status = options.status;
    this.code = options.code;
    this.param = options.param;
    this.requestId = options.requestId;
    this.headers = options.headers;
  }

  /** Builds the error from a non-2xx response and its body, parsed when it was JSON. */
  static fromResponse(response: Response, body: unknown): RickyError {
    const error = isRecord(body) && isRecord(body.error) ? body.error : null;
    const text = (value: unknown): string | null => (typeof value === 'string' ? value : null);
    return new RickyError({
      code: text(error?.code),
      headers: response.headers,
      message:
        text(error?.message) ??
        `HTTP ${response.status}${typeof body === 'string' && body ? `: ${body.slice(0, 200)}` : ''}`,
      param: text(error?.param),
      requestId: text(error?.request_id) ?? response.headers.get('x-request-id'),
      status: response.status,
    });
  }
}

/** The request never got an answer: DNS, TLS, a dropped connection or an abort. */
export class RickyConnectionError extends Error {
  override readonly name = 'RickyConnectionError';

  constructor(cause: unknown) {
    super(cause instanceof Error ? cause.message : 'The request to Ricky failed', { cause });
  }
}

/** A webhook delivery failed verification and must be rejected. */
export class WebhookVerificationError extends Error {
  override readonly name = 'WebhookVerificationError';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
