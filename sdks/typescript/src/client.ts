import { randomUUID } from 'node:crypto';

import { RickyConnectionError, RickyError } from './errors.js';
import { createClient, createConfig } from './generated/client/index.js';
import { idempotentOperations } from './generated/idempotency.gen.js';
import { RickyApi } from './generated/sdk.gen.js';

export const DEFAULT_BASE_URL = 'https://getricky.ai/api/v1';

export type RickyOptions = {
  /** Defaults to `https://getricky.ai/api/v1`. */
  baseUrl?: string;
  /** A fetch implementation; defaults to the global `fetch`. */
  fetch?: typeof fetch;
  /** Retries after the first attempt for retryable failures. Defaults to 2. */
  maxRetries?: number;
};

/** One page of a list: `next_cursor` is null on the last page. */
export type Page<TItem> = { data: TItem[]; next_cursor: string | null };

/** Any list operation of the client: it resolves to `{ data: [...], next_cursor }`. */
// oxlint-disable-next-line typescript/no-explicit-any -- matches every generated list method.
type ListOperation = (options: any) => Promise<unknown>;

/** The item type of a list operation. */
type ItemOf<TList extends ListOperation> =
  Awaited<ReturnType<TList>> extends infer TPage
    ? TPage extends { data: (infer TItem)[] }
      ? TItem
      : never
    : never;

/** Items of every page, in order; `pages()` yields whole pages instead. */
export type Paginator<TItem> = AsyncIterable<TItem> & { pages(): AsyncIterable<Page<TItem>> };

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_RETRY_AFTER_SECONDS = 60;

/**
 * A client for one organization's API key. Every operation in the API is a
 * method named after its `operationId`, taking `{ path, query, body, headers }`
 * and resolving to the response body (`{ data }` or `{ data, next_cursor }`).
 * Failures reject with `RickyError` or `RickyConnectionError`.
 *
 * Writes that accept an `Idempotency-Key` get a random one unless the caller
 * passes `headers: { 'Idempotency-Key': … }`. Reads and keyed writes are
 * retried on connection errors, 429 and 5xx, honoring `Retry-After`.
 */
export class Ricky extends RickyApi {
  /**
   * @param apiKey An organization API key (`rky_live_…`); defaults to the
   *   `RICKY_API_KEY` environment variable. Use it only from a server.
   */
  constructor(apiKey?: string, options: RickyOptions = {}) {
    const key = apiKey ?? globalThis.process?.env?.RICKY_API_KEY;
    if (!key) throw new Error('Pass an API key or set RICKY_API_KEY.');
    const client = createClient(
      createConfig({
        auth: key,
        baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
        fetch: retryingFetch(options.fetch ?? globalThis.fetch, options.maxRetries ?? 2),
        throwOnError: true,
      }),
    );
    client.interceptors.request.use((request, { url }) => {
      if (
        !request.headers.has('Idempotency-Key') &&
        idempotentOperations.has(`${request.method} ${url}`)
      ) {
        request.headers.set('Idempotency-Key', randomUUID());
      }
      return request;
    });
    client.interceptors.error.use((error, response) =>
      response ? RickyError.fromResponse(response, error) : asConnectionError(error),
    );
    super({ client });
  }

  /**
   * Walks a list operation page by page, passing each `next_cursor` back as
   * `cursor`.
   *
   * @example
   * for await (const contact of ricky.paginate(ricky.listContacts, { query: { tag_id } })) { … }
   */
  paginate<TList extends ListOperation>(
    list: TList,
    options?: Parameters<TList>[0],
  ): Paginator<ItemOf<TList>> {
    type Options = { query?: { cursor?: string } } | undefined;
    const initial = options as Options;
    const fetchPage = (cursor: string | undefined) =>
      (list as unknown as (options: Options) => Promise<Page<ItemOf<TList>>>).call(this, {
        ...initial,
        query: { ...initial?.query, ...(cursor === undefined ? {} : { cursor }) },
      });
    async function* pages(): AsyncGenerator<Page<ItemOf<TList>>> {
      let cursor = initial?.query?.cursor;
      do {
        const page = await fetchPage(cursor);
        yield page;
        cursor = page.next_cursor ?? undefined;
      } while (cursor !== undefined);
    }
    return {
      async *[Symbol.asyncIterator]() {
        for await (const page of pages()) yield* page.data;
      },
      pages,
    };
  }
}

function retryingFetch(baseFetch: typeof fetch, maxRetries: number): typeof fetch {
  return async (input, init) => {
    const request = new Request(input, init);
    const retryable =
      request.method === 'GET' ||
      request.method === 'HEAD' ||
      request.headers.has('Idempotency-Key');
    for (let attempt = 0; ; attempt += 1) {
      const last = !retryable || attempt >= maxRetries;
      let response: Response;
      try {
        response = await baseFetch(last ? request : request.clone());
      } catch (error) {
        if (last || request.signal.aborted) throw asConnectionError(error);
        await sleep(backoffSeconds(attempt));
        continue;
      }
      if (last || !RETRYABLE_STATUSES.has(response.status)) return response;
      const delay =
        retryAfterSeconds(response.headers.get('retry-after')) ?? backoffSeconds(attempt);
      await response.body?.cancel();
      await sleep(delay);
    }
  };
}

/** `Retry-After` as seconds (delta or HTTP date), capped; null when absent or invalid. */
function retryAfterSeconds(header: string | null): number | null {
  if (header === null || header.trim() === '') return null;
  const seconds = /^\d+$/.test(header.trim())
    ? Number(header.trim())
    : (Date.parse(header) - Date.now()) / 1000;
  return Number.isFinite(seconds) ? Math.min(Math.max(seconds, 0), MAX_RETRY_AFTER_SECONDS) : null;
}

/** 0.5 s, 1 s, 2 s … up to 8 s, with up to 25 % jitter below. */
function backoffSeconds(attempt: number): number {
  return Math.min(0.5 * 2 ** attempt, 8) * (1 - Math.random() * 0.25);
}

function sleep(seconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

function asConnectionError(error: unknown): RickyConnectionError | RickyError {
  return error instanceof RickyError || error instanceof RickyConnectionError
    ? error
    : new RickyConnectionError(error);
}
