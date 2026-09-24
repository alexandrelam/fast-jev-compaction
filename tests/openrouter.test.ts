import { describe, expect, it } from 'vitest';

import {
  buildOpenRouterRequest,
  OPENROUTER_DECISIONS_URL,
  OPENROUTER_JEV_MODEL,
  openRouterErrorMessage,
} from '../src/openrouter.js';
import { OpenRouterClient } from '../src/openrouter-client.js';
import type { JevQuestions } from '../src/types.js';

const questions: JevQuestions = {
  call_t1: { type: 'noul', instructions: 'call t1 should stay' },
  result_t1: { type: 'noul', instructions: 'result of t1 should stay verbatim' },
};

describe('buildOpenRouterRequest', () => {
  it('sends the Jev body to the Decisions endpoint with the Jev slug', () => {
    const request = buildOpenRouterRequest({ apiKey: 'k' }, { history: [] }, questions);
    expect(request.url).toBe(OPENROUTER_DECISIONS_URL);
    expect(request.method).toBe('POST');
    expect(request.headers['authorization']).toBe('Bearer k');
    const body = JSON.parse(request.body);
    expect(body.model).toBe(OPENROUTER_JEV_MODEL);
    expect(body.state).toEqual({ history: [] });
    expect(body.questions).toEqual(questions);
    // Nothing chat-shaped: the model answers questions, it does not generate text.
    expect(body.messages).toBeUndefined();
    expect(body.response_format).toBeUndefined();
  });

  it('adds attribution headers and honours an override endpoint and model', () => {
    const request = buildOpenRouterRequest(
      {
        apiKey: 'k',
        model: '~typesafe/jev-1.13',
        baseUrl: 'https://api.typesafe.ai/v1/systemone',
        referer: 'https://example.test',
        title: 'fast-jev-compaction',
      },
      'state',
      questions,
    );
    expect(request.url).toBe('https://api.typesafe.ai/v1/systemone');
    expect(request.headers['http-referer']).toBe('https://example.test');
    expect(request.headers['x-title']).toBe('fast-jev-compaction');
    expect(JSON.parse(request.body).model).toBe('~typesafe/jev-1.13');
  });
});

describe('openRouterErrorMessage', () => {
  it('surfaces the error message from an OpenRouter envelope', () => {
    expect(
      openRouterErrorMessage(402, JSON.stringify({ error: { message: 'Insufficient credits', code: 402 } })),
    ).toBe('OpenRouter request failed (402): Insufficient credits');
  });

  it('falls back to the raw body', () => {
    expect(openRouterErrorMessage(502, 'upstream down')).toBe(
      'OpenRouter request failed (502): upstream down',
    );
    expect(openRouterErrorMessage(500, JSON.stringify({ nope: 1 }))).toContain('{"nope":1}');
  });
});

describe('OpenRouterClient', () => {
  function fakeFetch(response: { ok: boolean; status: number; body: string }, seen: string[] = []) {
    return (async (url: string, init: { body: string }) => {
      seen.push(url, init.body);
      return { ok: response.ok, status: response.status, text: async () => response.body };
    }) as unknown as typeof fetch;
  }

  it('returns Jev answers unchanged', async () => {
    const seen: string[] = [];
    const client = new OpenRouterClient({
      apiKey: 'k',
      fetch: fakeFetch(
        {
          ok: true,
          status: 200,
          body: JSON.stringify({
            model: '~typesafe/jev-1.13',
            answers: { call_t1: { type: 'noul', noul: 0.82 }, result_t1: { type: 'noul', noul: 0.11 } },
          }),
        },
        seen,
      ),
    });
    const response = await client.ask({ history: [] }, questions);
    expect(seen[0]).toBe(OPENROUTER_DECISIONS_URL);
    expect(response.answers['call_t1']).toEqual({ type: 'noul', noul: 0.82 });
    expect(response.answers['result_t1']).toEqual({ type: 'noul', noul: 0.11 });
  });

  it('throws a readable error on a failed request', async () => {
    const client = new OpenRouterClient({
      apiKey: 'k',
      fetch: fakeFetch({
        ok: false,
        status: 401,
        body: JSON.stringify({ error: { message: 'No auth credentials found' } }),
      }),
    });
    await expect(client.ask('s', questions)).rejects.toThrow(/401.*No auth credentials/);
  });

  it('throws without a key', async () => {
    delete process.env.OPENROUTER_API_KEY;
    await expect(new OpenRouterClient({ apiKey: '' }).ask('s', questions)).rejects.toThrow(
      /OPENROUTER_API_KEY/,
    );
  });
});
