/**
 * Studio AI Hook — Manages all AI chat state and SSE streaming.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import apiClient from "@/lib/apiClient";
import type {
  AIConversation,
  AIMessage,
  StreamingMessage,
} from "@/types/ai";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

export function useStudioAI() {
  const { user } = useUser();
  const userId = user?.id;
  const userName = user?.firstName || user?.emailAddresses?.[0]?.emailAddress || "Creator";

  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [streamingMessage, setStreamingMessage] = useState<StreamingMessage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [conversationsLoaded, setConversationsLoaded] = useState(false);
  const [aiMode, setAiMode] = useState<"normal" | "web">("normal");

  const abortControllerRef = useRef<AbortController | null>(null);

  // ─── Load conversations ───
  const loadConversations = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await apiClient.get(`/api/ai/conversations?userId=${userId}`);
      setConversations(res.data.conversations || []);
      setConversationsLoaded(true);
    } catch (error) {
      console.error("[useStudioAI] Failed to load conversations:", error);
    }
  }, [userId]);

  // ─── Load conversation messages ───
  const loadConversation = useCallback(async (conversationId: string) => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const res = await apiClient.get(`/api/ai/conversations/${conversationId}?userId=${userId}`);
      const rawMessages = res.data.messages || [];
      const parsedMessages: AIMessage[] = rawMessages.map((m: any) => {
        let sources = [];
        if (m.metadata) {
          try {
            const meta = typeof m.metadata === "string" ? JSON.parse(m.metadata) : m.metadata;
            sources = meta.sources || [];
          } catch {
            // ignore
          }
        }
        return {
          ...m,
          sources,
          isWebSearch: sources.length > 0,
        };
      });
      setMessages(parsedMessages);
      setActiveConversationId(conversationId);
    } catch (error) {
      console.error("[useStudioAI] Failed to load conversation:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // ─── Start new conversation ───
  const startNewConversation = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
    setStreamingMessage(null);
  }, []);

  // ─── Send message with SSE streaming ───
  const sendMessage = useCallback(async (content: string, explicitMode?: "normal" | "web") => {
    if (!userId || !content.trim() || isSending) return;

    const currentMode = explicitMode || aiMode;
    setIsSending(true);

    // Optimistically add user message
    const tempUserMsg: AIMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: activeConversationId || "",
      user_id: userId,
      role: "user",
      content: content.trim(),
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    // Start streaming message placeholder
    setStreamingMessage({
      id: `streaming-${Date.now()}`,
      role: "assistant",
      content: "",
      isStreaming: true,
      isSearchingWeb: currentMode === "web",
      sources: [],
    });

    try {
      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();

      const response = await fetch(`${API_BASE}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          conversationId: activeConversationId,
          message: content.trim(),
          userName,
          aiMode: currentMode,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        let errorData: any = null;
        try {
          const text = await response.text();
          errorData = JSON.parse(text);
        } catch {
          // ignore
        }

        if (errorData && errorData.provider === "gemini") {
          throw new Error(`PROVIDER_ERROR:${JSON.stringify(errorData)}`);
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";
      let newConversationId = activeConversationId;
      let assistantMessageId = "";
      let collectedSources: any[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let eventType = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);

              switch (eventType) {
                case "conversation_id":
                  newConversationId = parsed.conversationId;
                  setActiveConversationId(newConversationId);
                  break;

                case "web_search":
                  setStreamingMessage((prev) =>
                    prev
                      ? {
                          ...prev,
                          isSearchingWeb: true,
                          webSearchQuery: parsed.query,
                          researchStage: parsed.stage,
                          researchMessage: parsed.message,
                        }
                      : null
                  );
                  break;

                case "web_sources":
                  if (parsed.sources && Array.isArray(parsed.sources)) {
                    collectedSources = parsed.sources;
                    setStreamingMessage((prev) =>
                      prev
                        ? {
                            ...prev,
                            isSearchingWeb: false,
                            sources: collectedSources,
                          }
                        : null
                    );
                  }
                  break;

                case "start":
                  if (parsed.sources && Array.isArray(parsed.sources)) {
                    collectedSources = parsed.sources;
                  }
                  break;

                case "chunk":
                  fullContent += parsed.text;
                  setStreamingMessage((prev) =>
                    prev
                      ? {
                          ...prev,
                          content: fullContent,
                          isSearchingWeb: false,
                          sources: collectedSources,
                        }
                      : null
                  );
                  break;

                case "replace":
                  if (parsed.text) {
                    fullContent = parsed.text;
                    setStreamingMessage((prev) =>
                      prev
                        ? {
                            ...prev,
                            content: fullContent,
                            isSearchingWeb: false,
                            sources: collectedSources,
                          }
                        : null
                    );
                  }
                  break;

                case "done":
                  assistantMessageId = parsed.messageId;
                  if (parsed.sources && Array.isArray(parsed.sources)) {
                    collectedSources = parsed.sources;
                  }
                  break;

                case "error":
                  console.error("[SSE] Error:", parsed);
                  let displayError = "Sorry, something went wrong. Please try again.";
                  if (parsed.reason === "quota_exceeded" || parsed.reason === "all_keys_exhausted") {
                    displayError = "Studio AI is temporarily unavailable because all AI providers have exhausted their available quota. Please try again later.";
                  } else if (parsed.reason === "model_unavailable") {
                    displayError = "Studio AI is temporarily unavailable because the AI engine is experiencing high demand. Please try again later.";
                  } else if (parsed.message) {
                    displayError = parsed.message;
                  } else if (parsed.error) {
                    displayError = parsed.error;
                  }
                  setStreamingMessage((prev) =>
                    prev
                      ? { ...prev, content: displayError, isStreaming: false }
                      : null
                  );
                  break;
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }

      // Finalize: convert streaming message to a real message
      if (fullContent) {
        const finalMsg: AIMessage = {
          id: assistantMessageId || `msg-${Date.now()}`,
          conversation_id: newConversationId || "",
          user_id: userId,
          role: "assistant",
          content: fullContent,
          created_at: new Date().toISOString(),
          sources: collectedSources,
          isWebSearch: collectedSources.length > 0,
        };
        setMessages((prev) => [...prev, finalMsg]);
      }

      setStreamingMessage(null);

      // Refresh conversations list (to get auto-generated title)
      setTimeout(() => loadConversations(), 1500);
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.error("[useStudioAI] Send failed:", error);
        
        let displayError = "Sorry, something went wrong. Please try again.";
        const errMsg = (error as Error).message;
        if (errMsg.startsWith("PROVIDER_ERROR:")) {
          try {
            const parsed = JSON.parse(errMsg.substring(15));
            if (parsed.reason === "quota_exceeded" || parsed.reason === "all_keys_exhausted") {
              displayError = "Studio AI is temporarily unavailable because all AI providers have exhausted their available quota. Please try again later.";
            } else if (parsed.reason === "model_unavailable") {
              displayError = "Studio AI is temporarily unavailable because the AI engine is experiencing high demand. Please try again later.";
            } else if (parsed.message) {
              displayError = parsed.message;
            }
          } catch {
            // fallback
          }
        }
        
        setStreamingMessage((prev) =>
          prev
            ? { ...prev, content: displayError, isStreaming: false }
            : null
        );
        // Clear the error streaming message after a delay
        setTimeout(() => setStreamingMessage(null), 8000);
      }
    } finally {
      setIsSending(false);
      abortControllerRef.current = null;
    }
  }, [userId, userName, activeConversationId, isSending, aiMode, loadConversations]);

  // ─── Delete conversation ───
  const deleteConversation = useCallback(async (conversationId: string) => {
    if (!userId) return;
    try {
      await apiClient.delete(`/api/ai/conversations/${conversationId}?userId=${userId}`);
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      if (activeConversationId === conversationId) {
        setActiveConversationId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error("[useStudioAI] Failed to delete conversation:", error);
    }
  }, [userId, activeConversationId]);

  // ─── Edit message and re-generate from that point ───
  const editMessage = useCallback(
    async (messageId: string, newContent: string, explicitMode?: "normal" | "web") => {
      if (!userId || !newContent.trim() || isSending) return;

      const msgIndex = messages.findIndex((m) => m.id === messageId);
      if (msgIndex === -1) return;

      const currentMode = explicitMode || aiMode;

      // Truncate messages up to this point and update the user message
      const updatedUserMsg: AIMessage = {
        ...messages[msgIndex],
        content: newContent.trim(),
      };
      const truncated = [...messages.slice(0, msgIndex), updatedUserMsg];
      setMessages(truncated);

      setIsSending(true);

      // Start streaming response for the edited prompt
      setStreamingMessage({
        id: `streaming-${Date.now()}`,
        role: "assistant",
        content: "",
        isStreaming: true,
        isSearchingWeb: currentMode === "web",
        sources: [],
      });

      try {
        abortControllerRef.current = new AbortController();

        const response = await fetch(`${API_BASE}/api/ai/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            conversationId: activeConversationId,
            message: newContent.trim(),
            userName,
            aiMode: currentMode,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let buffer = "";
        let fullContent = "";
        let newConversationId = activeConversationId;
        let assistantMessageId = "";
        let collectedSources: any[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          let eventType = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              const data = line.slice(6);
              try {
                const parsed = JSON.parse(data);

                switch (eventType) {
                  case "conversation_id":
                    newConversationId = parsed.conversationId;
                    setActiveConversationId(newConversationId);
                    break;

                  case "web_search":
                    setStreamingMessage((prev) =>
                      prev
                        ? {
                            ...prev,
                            isSearchingWeb: true,
                            webSearchQuery: parsed.query,
                            researchStage: parsed.stage,
                            researchMessage: parsed.message,
                          }
                        : null
                    );
                    break;

                  case "web_sources":
                    if (parsed.sources && Array.isArray(parsed.sources)) {
                      collectedSources = parsed.sources;
                      setStreamingMessage((prev) =>
                        prev
                          ? {
                              ...prev,
                              sources: parsed.sources,
                            }
                          : null
                      );
                    }
                    break;

                  case "chunk":
                    if (parsed.text) {
                      fullContent += parsed.text;
                      setStreamingMessage((prev) =>
                        prev
                          ? {
                              ...prev,
                              content: fullContent,
                            }
                          : null
                      );
                    }
                    break;

                  case "replace":
                    if (parsed.text) {
                      fullContent = parsed.text;
                      setStreamingMessage((prev) =>
                        prev
                          ? {
                              ...prev,
                              content: fullContent,
                            }
                          : null
                      );
                    }
                    break;

                  case "message_id":
                    assistantMessageId = parsed.messageId;
                    break;

                  case "done":
                    break;
                }
              } catch {
                // ignore parse errors
              }
            }
          }
        }

        if (fullContent) {
          const finalMsg: AIMessage = {
            id: assistantMessageId || `msg-${Date.now()}`,
            conversation_id: newConversationId || "",
            user_id: userId,
            role: "assistant",
            content: fullContent,
            created_at: new Date().toISOString(),
            sources: collectedSources,
            isWebSearch: collectedSources.length > 0,
          };
          setMessages((prev) => [...prev, finalMsg]);
        }

        setStreamingMessage(null);
        setTimeout(() => loadConversations(), 1500);
      } catch (error: any) {
        if (error.name === "AbortError") {
          console.log("[useStudioAI] Edit generation aborted");
        } else {
          console.error("[useStudioAI] Error in editMessage:", error);
        }
      } finally {
        setIsSending(false);
        setStreamingMessage(null);
      }
    },
    [userId, userName, isSending, aiMode, activeConversationId, messages, loadConversations]
  );

  // ─── Cancel streaming ───
  const cancelStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
    setStreamingMessage(null);
    setIsSending(false);
  }, []);

  // ─── Load conversations on mount ───
  useEffect(() => {
    if (userId && !conversationsLoaded) {
      loadConversations();
    }
  }, [userId, conversationsLoaded, loadConversations]);

  return {
    conversations,
    activeConversationId,
    messages,
    streamingMessage,
    isLoading,
    isSending,
    aiMode,
    setAiMode,
    sendMessage,
    editMessage,
    loadConversation,
    startNewConversation,
    deleteConversation,
    cancelStreaming,
    loadConversations,
  };
}
