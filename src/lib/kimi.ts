/**
 * Kimi API Client
 * Connects to Ollama with Kimi model for chat completions
 * Supports streaming responses
 */

export interface KimiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface KimiCompletionRequest {
  model: string;
  messages: KimiMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface KimiCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: KimiMessage;
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface KimiStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }[];
}

// Configuration - Vite env vars are automatically replaced at build time
const OLLAMA_BASE_URL = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_OLLAMA_URL) || 'http://localhost:11434';
const DEFAULT_MODEL = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_KIMI_MODEL) || 'kimi-k2.5';
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 4096;

/**
 * Create a chat completion (non-streaming)
 */
export async function createChatCompletion(
  messages: KimiMessage[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<KimiCompletionResponse> {
  const response = await fetch(`${OLLAMA_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model || DEFAULT_MODEL,
      messages,
      temperature: options.temperature ?? DEFAULT_TEMPERATURE,
      max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
      stream: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Kimi API error: ${response.status} ${error}`);
  }

  return response.json();
}

/**
 * Create a streaming chat completion
 * Returns an async iterator for consuming chunks
 */
export async function* createChatCompletionStream(
  messages: KimiMessage[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): AsyncGenerator<string, void, unknown> {
  const response = await fetch(`${OLLAMA_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model || DEFAULT_MODEL,
      messages,
      temperature: options.temperature ?? DEFAULT_TEMPERATURE,
      max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
      stream: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Kimi API error: ${response.status} ${error}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        
        if (trimmed.startsWith('data: ')) {
          try {
            const chunk: KimiStreamChunk = JSON.parse(trimmed.slice(6));
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch (e) {
            // Skip malformed chunks
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Check if Ollama is available and the model is loaded
 */
export async function checkKimiHealth(): Promise<{
  available: boolean;
  model?: string;
  error?: string;
}> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: 'GET',
    });

    if (!response.ok) {
      return { available: false, error: 'Ollama not reachable' };
    }

    const data = await response.json();
    const models = data.models || [];
    const kimiModel = models.find((m: { name: string }) => 
      m.name.includes('kimi') || m.name.includes(DEFAULT_MODEL)
    );

    if (kimiModel) {
      return { available: true, model: kimiModel.name };
    }

    return { available: true, model: DEFAULT_MODEL, error: 'Kimi model not found, will attempt to pull' };
  } catch (error) {
    return { available: false, error: String(error) };
  }
}

/**
 * Pull a model if not available
 */
export async function pullModel(model: string = DEFAULT_MODEL): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/pull`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: model }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

export { DEFAULT_MODEL, OLLAMA_BASE_URL };
