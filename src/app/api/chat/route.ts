/**
 * Chat API Route - Simplified (Elon Cut)
 * Removed: tenant isolation, complex rate limiting, quota management
 * Kept: Simple chat endpoint
 */

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

// Simple mock LLM - replace with actual Ollama/Kimi client
async function callLLM(request: ChatRequest): Promise<ChatResponse> {
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay
  
  const lastMessage = request.messages[request.messages.length - 1];
  const response: ChatResponse = {
    id: `chat_${Date.now()}`,
    message: {
      role: 'assistant',
      content: `Echo: "${lastMessage.content.substring(0, 100)}..."`,
    },
    usage: {
      promptTokens: estimateTokens(request.messages),
      completionTokens: 50,
      totalTokens: estimateTokens(request.messages) + 50,
    },
    model: request.model || 'kimi-k2.5',
  };
  return response;
}

/**
 * Simple chat handler - no complex rate limiting or tenant isolation
 */
export async function handleChat(request: ChatRequest): Promise<ChatResponse> {
  if (!request.messages?.length) {
    throw new Error('Messages required');
  }
  return callLLM(request);
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
    const response = await handleChat(request);
    res.json(response);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Internal server error', statusCode: 500 });
  }
}

/**
 * Fetch API handler
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
export { estimateTokens, callLLM };
