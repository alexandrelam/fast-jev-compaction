import { JevClient, type JevClientOptions } from './client.js';
import { compact } from './compact.js';
import { OpenRouterClient, type OpenRouterClientOptions } from './openrouter-client.js';
import type { CompactOptions, CompactResult, Message } from './types.js';

export type CompactMessagesOptions = CompactOptions & JevClientOptions;

/** `compact` with a `JevClient` built from the options (key from `TYPESAFE_API_KEY` by default). */
export function compactMessages(
  messages: readonly Message[],
  options: CompactMessagesOptions = {},
): Promise<CompactResult> {
  return compact(messages, new JevClient(options), options);
}

export type CompactMessagesOpenRouterOptions = CompactOptions & OpenRouterClientOptions;

/** `compact` with an `OpenRouterClient` (key from `OPENROUTER_API_KEY` by default). */
export function compactMessagesOpenRouter(
  messages: readonly Message[],
  options: CompactMessagesOpenRouterOptions = {},
): Promise<CompactResult> {
  return compact(messages, new OpenRouterClient(options), options);
}
