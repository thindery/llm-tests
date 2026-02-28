/**
 * Chat API Route - Kimi Integration
 * Streams responses from Kimi via Ollama
 */

import { createChatCompletionStream, createChatCompletion, type KimiMessage } from '../../../lib/kimi';

// Types for chat requests/responses
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface ChatResponse {
  id: string;
  message: ChatMessage;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
}

export interface ChatError {
  error: string;
  statusCode: number;
}

// Simple token estimation
function estimateTokens(messages: ChatMessage[]): number {
  const text = messages.map(m => m.content).join(' ');
  return Math.ceil(text.length / 4) + 50;
}

/**
 * Handle streaming chat request
 */
async function handleStreamingChat(
  request: ChatRequest,
  controller: ReadableStreamController<Uint8Array>
): Promise<void> {
  const encoder = new TextEncoder();
  let fullContent = '';

  try {
    // Convert messages to Kimi format
    const kimiMessages: KimiMessage[] = request.messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Stream from Kimi
    for await (const chunk of createChatCompletionStream(kimiMessages, {
      model: request.model,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
    })) {
      fullContent += chunk;
      
      // Send chunk as SSE
      const data = JSON.stringify({ chunk, done: false });
      controller.enqueue(encoder.encode(`data: ${data}\n\n`));
    }

    // Send completion
    const finalData = JSON.stringify({
      done: true,
      message: {
        role: 'assistant',
        content: fullContent,
      },
      usage: {
        promptTokens: estimateTokens(request.messages),
        completionTokens: Math.ceil(fullContent.length / 4),
        totalTokens: estimateTokens(request.messages) + Math.ceil(fullContent.length / 4),
      },
    });
    controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
    controller.close();
  } catch (error) {
    const errorData = JSON.stringify({ error: String(error), done: true });
    controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
    controller.close();
  }
}

/**
 * Handle non-streaming chat request
 */
async function handleNonStreamingChat(request: ChatRequest): Promise<ChatResponse> {
  const kimiMessages: KimiMessage[] = request.messages.map(m => ({
    role: m.role,
    content: m.content,
  }));

  const completion = await createChatCompletion(kimiMessages, {
    model: request.model,
    temperature: request.temperature,
    maxTokens: request.maxTokens,
  });

  return {
    id: completion.id,
    message: {
      role: 'assistant',
      content: completion.choices[0]?.message?.content || '',
    },
    usage: {
      promptTokens: completion.usage?.prompt_tokens || estimateTokens(request.messages),
      completionTokens: completion.usage?.completion_tokens || 0,
      totalTokens: completion.usage?.total_tokens || estimateTokens(request.messages),
    },
    model: completion.model,
  };
}

/**
 * Main chat handler
 */
export async function handleChat(request: ChatRequest): Promise<ChatResponse> {
  if (!request.messages?.length) {
    throw new Error('Messages required');
  }
  return handleNonStreamingChat(request);
}

/**
 * Express-style handler
 */
export async function chatRouteHandler(req: any, res: any): Promise<void> {
  try {
    const request: ChatRequest = req.body;
    if (!request.messages?.length) {
      res.status(400).json({ error: 'Messages required', statusCode: 400 });
      return;
    }

    if (request.stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const stream = new ReadableStream({
        start(controller) {
          handleStreamingChat(request, controller).catch(() => {
            controller.close();
          });
        },
      });

      const reader = stream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    } else {
      const response = await handleChat(request);
      res.json(response);
    }
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Internal server error', statusCode: 500 });
  }
}

/**
 * Fetch API handler with streaming support
 */
export async function chatFetchHandler(request: Request): Promise<Response> {
  try {
    const body: ChatRequest = await request.json();
    if (!body.messages?.length) {
      return new Response(
        JSON.stringify({ error: 'Messages required', statusCode: 400 }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // If streaming is requested, return a streaming response
    if (body.stream) {
      const stream = new ReadableStream({
        start(controller) {
          handleStreamingChat(body, controller).catch(() => {
            controller.close();
          });
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Non-streaming response
    const response = await handleChat(body);
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Chat error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', statusCode: 500 }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Export for testing
export { estimateTokens };
