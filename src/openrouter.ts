import { buildJevRequest, DEFAULT_MODEL, SYSTEM_ONE_URL, type JevRequest } from './request.js';
import type { JevQuestions, JevState } from './types.js';

/** TypeSafe's own endpoint, for `baseUrl`. */
export { SYSTEM_ONE_URL };

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
 * The endpoint and the slug that goes with it. The two hosts namespace Jev
 * differently (`~typesafe/jev-latest` on OpenRouter, `jev-latest` on TypeSafe),
 * and the plugin ships one of them as its default, so either default slug is
 * translated to whichever host is actually being called. An explicit slug
 * (`typesafe/jev-1.13`) is passed through untouched.
 */
export function resolveDecisionsEndpoint(params: { model?: string; baseUrl?: string }): {
  url: string;
  model: string;
} {
  const url = params.baseUrl ?? OPENROUTER_DECISIONS_URL;
  const viaOpenRouter = hostOf(url).endsWith('openrouter.ai');
  const model = params.model;
  const isDefaultSlug = !model || model === OPENROUTER_JEV_MODEL || model === DEFAULT_MODEL;
  if (isDefaultSlug) {
    return { url, model: viaOpenRouter ? OPENROUTER_JEV_MODEL : DEFAULT_MODEL };
  }
  return { url, model };
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
  const { url, model } = resolveDecisionsEndpoint(params);
  const request = buildJevRequest({ apiKey: params.apiKey, model, baseUrl: url }, state, questions);
  if (params.referer) request.headers['http-referer'] = params.referer;
  if (params.title) request.headers['x-title'] = params.title;
  return request;
}

/** The host of a Decisions endpoint, for error messages. */
function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/**
 * OpenRouter reports failures as `{error: {message, code}}`; surfacing the
 * message makes the hook's fallback toast readable. `url` names the host that
 * actually failed, since `baseUrl` may point at TypeSafe or anywhere else.
 */
export function decisionsErrorMessage(status: number, text: string, url: string): string {
  const where = hostOf(url);
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === 'object' && 'error' in parsed) {
      const error = (parsed as { error: unknown }).error;
      if (error && typeof error === 'object' && 'message' in error) {
        const message = (error as { message: unknown }).message;
        if (typeof message === 'string' && message) {
          return `${where} request failed (${status}): ${message}`;
        }
      }
    }
  } catch {
    // Not JSON; fall through to the raw body.
  }
  return `${where} request failed (${status}): ${text.slice(0, 200)}`;
}
