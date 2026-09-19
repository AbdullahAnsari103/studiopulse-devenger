/**
 * StudioAIInput — Premium message input bar with glassmorphic styling,
 * voice-to-text via Web Speech API, and the Studio Pulse logo.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Paperclip, Mic, MicOff, ArrowUp, X } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";

interface StudioAIInputProps {
  onSend: (message: string) => void;
  isSending: boolean;
  aiMode?: "normal" | "web";
  externalPrompt?: string;
  onClearExternalPrompt?: () => void;
}

/* ── Type augmentation for Web Speech API ── */
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

export default function StudioAIInput({
  onSend,
  isSending,
  aiMode = "normal",
  externalPrompt,
  onClearExternalPrompt,
}: StudioAIInputProps) {
  const { t } = useSettings();
  const [value, setValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Sync external prompt when card clicked
  useEffect(() => {
    if (externalPrompt) {
      setValue(externalPrompt);
      onClearExternalPrompt?.();
      textareaRef.current?.focus();
    }
  }, [externalPrompt, onClearExternalPrompt]);

  // Check for Web Speech API support
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setVoiceSupported(true);
    }
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    }
  }, [value]);

  const handleSubmit = useCallback(() => {
    if (!value.trim() || isSending) return;
    onSend(value);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, isSending, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  /* ─── Voice Recording ─── */
  const startRecording = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    let finalTranscript = value;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += (finalTranscript ? " " : "") + transcript;
        } else {
          interim += transcript;
        }
      }
      setValue(finalTranscript + (interim ? " " + interim : ""));
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("[VoiceInput] Error:", event.error);
      setIsRecording(false);
      if (event.error === "not-allowed") {
        setVoiceError("Microphone access denied. Please allow microphone in your browser settings.");
      } else {
        setVoiceError(`Voice error: ${event.error}`);
      }
      setTimeout(() => setVoiceError(null), 4000);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    setVoiceError(null);
  }, [value]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, stopRecording, startRecording]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const hasContent = value.trim().length > 0;

  return (
    <div className="px-2.5 sm:px-6 lg:px-8 pb-3 sm:pb-4 pt-1 sm:pt-2 relative z-20">
      <div className="max-w-3xl mx-auto flex flex-col items-center">
        {/* Voice error notification */}
        {voiceError && (
          <div className="w-full mb-2 flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-300 text-[12px] rounded-xl px-3 py-2 animate-fade-in">
            <MicOff className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="flex-1">{voiceError}</span>
            <button onClick={() => setVoiceError(null)} className="p-0.5 hover:text-white transition-colors">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* ─── Input container ─── */}
        <div
          className={`w-full relative flex items-end gap-2 sm:gap-2.5 rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2 sm:py-3 transition-all duration-500 ${
            isFocused || hasContent || isRecording
              ? "bg-[#090918]/90 border border-purple-500/50 shadow-[0_0_35px_rgba(168,85,247,0.3),0_0_70px_rgba(6,182,212,0.18)] backdrop-blur-2xl opacity-100 scale-[1.01]"
              : "bg-transparent border border-transparent backdrop-blur-[1px] opacity-35 hover:opacity-80 hover:bg-black/20 hover:border-white/[0.08] shadow-none"
          }`}
        >
          {/* Studio Pulse logo icon */}
          <div className="flex-shrink-0 mb-0.5">
            <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center border transition-all duration-300 ${
              isFocused || hasContent || isRecording
                ? "bg-purple-500/10 dark:bg-gradient-to-br dark:from-[#1a0a2e] dark:to-[#0d0520] border-purple-500/20 shadow-inner"
                : "bg-transparent border-transparent"
            } overflow-hidden`}>
              <img
                src="/image.png"
                alt="AI"
                className={`w-5 h-5 sm:w-6 sm:h-6 object-contain transition-opacity ${
                  isFocused || hasContent || isRecording ? "opacity-100" : "opacity-40"
                } ${isSending ? "animate-logo-think-fast" : ""}`}
              />
            </div>
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={
              isRecording
                ? "Listening..."
                : aiMode === "web"
                ? "Ask anything or paste URL..."
                : t("ai.placeholder")
            }
            rows={1}
            className={`flex-1 bg-transparent text-[13.5px] sm:text-[14.5px] placeholder-gray-400/60 hover:placeholder-gray-300 outline-none resize-none min-h-[24px] sm:min-h-[26px] max-h-[140px] sm:max-h-[160px] leading-relaxed py-1 sm:py-1.5 transition-colors ${
              isRecording ? "text-purple-300" : "text-[#e2e2e8]"
            }`}
            disabled={isSending}
            id="studio-ai-input"
          />

          {/* Right-side action buttons */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0 mb-0.5">
            {/* Attach */}
            <button
              className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all ${
                isFocused || hasContent || isRecording
                  ? "text-gray-400 hover:text-gray-200 hover:bg-white/5 opacity-100"
                  : "text-gray-500 opacity-40 hover:opacity-90 hover:text-white"
              }`}
              title="Attach file"
              type="button"
            >
              <Paperclip className="w-4 h-4 sm:w-[17px] sm:h-[17px]" />
            </button>

            {/* Voice button */}
            {voiceSupported && (
              <button
                onClick={toggleRecording}
                className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all ${
                  isRecording
                    ? "text-red-400 bg-red-500/15 animate-voice-pulse opacity-100"
                    : isFocused || hasContent
                    ? "text-gray-400 hover:text-purple-400 hover:bg-purple-500/10 opacity-100"
                    : "text-gray-500 opacity-40 hover:opacity-90 hover:text-purple-400"
                }`}
                title={isRecording ? "Stop recording" : "Voice input"}
                type="button"
                id="studio-ai-voice-btn"
              >
                {isRecording ? (
                  <MicOff className="w-4 h-4 sm:w-[17px] sm:h-[17px]" />
                ) : (
                  <Mic className="w-4 h-4 sm:w-[17px] sm:h-[17px]" />
                )}
              </button>
            )}

            {/* Send button */}
            <button
              onClick={handleSubmit}
              disabled={!hasContent || isSending}
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center text-white transition-all duration-200 ${
                hasContent && !isSending
                  ? "bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 shadow-lg shadow-purple-900/40 hover:scale-105 hover:shadow-cyan-500/30 opacity-100"
                  : isFocused
                  ? "bg-[#1a1a2e] text-gray-600 opacity-80"
                  : "bg-transparent text-gray-600 opacity-30"
              }`}
              title="Send message"
              type="button"
              id="studio-ai-send-btn"
            >
              {isSending ? (
                <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <ArrowUp className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              )}
            </button>
          </div>
        </div>

        {/* Bottom info bar */}
        <div className={`w-full flex items-center justify-between mt-1 sm:mt-2 px-1 transition-opacity duration-300 ${
          isFocused || hasContent || isRecording ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}>
          <p className="text-[10.5px] sm:text-[11px] text-gray-500">
            {aiMode === "normal" ? t("ai.disclaimer") : ""}
          </p>
          {isRecording && (
            <div className="flex items-center gap-1.5 animate-fade-in ml-auto">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              <span className="text-[10.5px] sm:text-[11px] text-red-400 font-medium">Recording</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
