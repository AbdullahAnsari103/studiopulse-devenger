// ─── Studio AI TypeScript Types ───

export type MessageRole = "user" | "assistant" | "system";

export interface AIMessage {
  id: string;
  conversation_id: string;
  user_id: string;
  role: MessageRole;
  content: string;
  metadata?: string;
  created_at: string;
}

export interface AIConversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  is_archived: number;
}

export interface ConversationWithMessages {
  conversation: AIConversation;
  messages: AIMessage[];
}

export interface StreamingMessage {
  id: string;
  role: "assistant";
  content: string;
  isStreaming: boolean;
}

export interface ChatState {
  conversations: AIConversation[];
  activeConversationId: string | null;
  messages: AIMessage[];
  streamingMessage: StreamingMessage | null;
  isLoading: boolean;
  isSending: boolean;
}

// SSE Event types from the backend
export interface SSEConversationIdEvent {
  conversationId: string;
}

export interface SSEStartEvent {
  intent: string;
}

export interface SSEChunkEvent {
  text: string;
}

export interface SSEDoneEvent {
  messageId: string;
}

export interface SSEErrorEvent {
  error: string;
}
