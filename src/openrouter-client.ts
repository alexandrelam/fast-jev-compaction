import {
  buildOpenRouterRequest,
  decisionsErrorMessage,
  type OpenRouterParams,
} from './openrouter.js';
import { parseJevResponse } from './request.js';
import type { JevAsker, JevQuestions, JevResponse, JevState } from './types.js';

export interface OpenRouterClientOptions extends Partial<OpenRouterParams> {
  /** Defaults to `process.env.OPENROUTER_API_KEY`. */
  apiKey?: string;
  /** Defaults to the global `fetch`. */
  fetch?: typeof fetch;
}

/** Asks Jev through OpenRouter's Decisions API. */
export class OpenRouterClient implements JevAsker {
  private readonly apiKey: string;
  private readonly options: OpenRouterClientOptions;
  private readonly fetcher: typeof fetch;

  constructor(options: OpenRouterClientOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.OPENROUTER_API_KEY ?? '';
    this.options = options;
    this.fetcher = options.fetch ?? fetch;
  }

  async ask(state: JevState, questions: JevQuestions): Promise<JevResponse> {
    if (!this.apiKey) throw new Error('OPENROUTER_API_KEY is not configured');
    const request = buildOpenRouterRequest(
      { ...this.options, apiKey: this.apiKey },
      state,
      questions,
    );
    const response = await this.fetcher(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });
    const text = await response.text();
    if (!response.ok) throw new Error(decisionsErrorMessage(response.status, text, request.url));
    return parseJevResponse(response.status, response.ok, text);
  }
}
