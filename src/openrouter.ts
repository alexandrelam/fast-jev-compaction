import { buildJevRequest, type JevRequest } from './request.js';
import type { JevQuestions, JevState } from './types.js';

/** OpenRouter's Decisions API: the same Jev protocol, a different host. */
export const OPENROUTER_DECISIONS_URL = 'https://openrouter.ai/api/alpha/decisions';
export const OPENROUTER_JEV_MODEL = '~typesafe/jev-latest';

export interface OpenRouterParams {
  apiKey: string;
  /** Defaults to `~typesafe/jev-latest`. */
  model?: string;
  /** Defaults to the Decisions endpoint. */
  baseUrl?: string;
  /** Optional attribution headers; they put the app on OpenRouter's leaderboards. */
  referer?: string;
  title?: string;
}

/**
 * One Decisions request. The body is exactly the Jev body — OpenRouter proxies
 * `state` and `questions` through and returns the same calibrated `answers` —
 * so only the URL, the model slug and the optional attribution headers differ.
 */
export function buildOpenRouterRequest(
  params: OpenRouterParams,
  state: JevState,
  questions: JevQuestions,
): JevRequest {
  const request = buildJevRequest(
    {
      apiKey: params.apiKey,
      model: params.model ?? OPENROUTER_JEV_MODEL,
      baseUrl: params.baseUrl ?? OPENROUTER_DECISIONS_URL,
    },
    state,
    questions,
  );
  if (params.referer) request.headers['http-referer'] = params.referer;
  if (params.title) request.headers['x-title'] = params.title;
  return request;
}

/**
 * OpenRouter reports failures as `{error: {message, code}}`; surfacing the
 * message makes the hook's fallback toast readable.
 */
export function openRouterErrorMessage(status: number, text: string): string {
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === 'object' && 'error' in parsed) {
      const error = (parsed as { error: unknown }).error;
      if (error && typeof error === 'object' && 'message' in error) {
        const message = (error as { message: unknown }).message;
        if (typeof message === 'string' && message) {
          return `OpenRouter request failed (${status}): ${message}`;
        }
      }
    }
  } catch {
    // Not JSON; fall through to the raw body.
  }
  return `OpenRouter request failed (${status}): ${text.slice(0, 200)}`;
}
