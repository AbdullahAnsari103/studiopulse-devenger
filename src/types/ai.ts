// ─── Studio AI TypeScript Types ───

export type MessageRole = "user" | "assistant" | "system";
export type AIMode = "normal" | "web";

export interface WebSource {
  title: string;
  url: string;
  snippet?: string;
  domain?: string;
}

export interface AIMessage {
  id: string;
  conversation_id: string;
  user_id: string;
  role: MessageRole;
  content: string;
  metadata?: string;
  created_at: string;
  sources?: WebSource[];
  isWebSearch?: boolean;
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
  sources?: WebSource[];
  isSearchingWeb?: boolean;
  webSearchQuery?: string;
  researchStage?: string;
  researchMessage?: string;
}

export interface ChatState {
  conversations: AIConversation[];
  activeConversationId: string | null;
  messages: AIMessage[];
  streamingMessage: StreamingMessage | null;
  isLoading: boolean;
  isSending: boolean;
  aiMode: AIMode;
}

// SSE Event types from the backend
export interface SSEConversationIdEvent {
  conversationId: string;
}

export interface SSEStartEvent {
  intent: string;
  isWebSearch?: boolean;
  sources?: WebSource[];
}

export interface SSEWebSearchEvent {
  status: string;
  query: string;
}

export interface SSEWebSourcesEvent {
  sources: WebSource[];
}

export interface SSEChunkEvent {
  text: string;
}

export interface SSEDoneEvent {
  messageId: string;
  sources?: WebSource[];
}

export interface SSEErrorEvent {
  error: string;
  reason?: string;
  message?: string;
}

