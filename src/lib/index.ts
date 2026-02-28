/**
 * OpenClaw - Essential Exports (Simplified)
 * Elon Cut: Removed complex tenant isolation and rate limiting
 */

export {
  handleChat,
  ChatRequest,
  ChatResponse,
  ChatError,
  ChatMessage,
} from '../app/api/chat/route';
