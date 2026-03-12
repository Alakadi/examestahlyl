/**
 * AIChatBox Component
 *
 * A production-ready chat component built on AI SDK v6's useChat hook.
 */

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Markdown } from "@/components/Markdown";
import { cn } from "@/lib/utils";
import { Loader2, Send, Sparkles } from "lucide-react";
import { useState, useRef, useEffect, ReactNode } from "react";
import { useChat } from "@ai-sdk/react";

import type { UIMessage, UIMessagePart, UIToolInvocation } from "ai";

/**
 * Tool invocation state derived from AI SDK's UIToolInvocation type.
 * Represents the lifecycle of a tool call.
 */
export type ToolInvocationState = UIToolInvocation<any>["state"];

/**
 * Helper to check if a tool is still loading (input phase)
 */
export function isToolLoading(state: ToolInvocationState): boolean {
  return state === "input-streaming" || state === "input-available";
}

/**
 * Helper to check if a tool has errored
 */
export function isToolError(state: ToolInvocationState): boolean {
  return state === "output-error";
}

/**
 * Helper to check if a tool completed successfully
 */
export function isToolComplete(state: ToolInvocationState): boolean {
  return state === "output-available";
}

// ============================================================================
// COMPONENT PROPS
// ============================================================================

/**
 * Props for custom tool part rendering.
 * The `part` object contains the full tool invocation data from AI SDK.
 */
export interface ToolPartRendererProps {
  /** The tool part from the message - type is `tool-${toolName}` */
  part: UIMessagePart & { type: `tool-${string}` };
  /** Extracted tool name for convenience */
  toolName: string;
  /** Current state of the tool invocation */
  state: ToolInvocationState;
  /** Tool input (available after input-streaming) */
  input?: unknown;
  /** Tool output (available when state is output-available) */
  output?: unknown;
  /** Error text (available when state is output-error) */
  errorText?: string;
}

export type ToolPartRenderer = (props: ToolPartRendererProps) => ReactNode;

export interface AIChatBoxProps {
  /** API endpoint for chat (default: "/api/chat") */
  api?: string;

  /** Unique chat ID - changing this triggers message sync */
  chatId: string;

  /** Optional user ID to send with requests */
  userId?: number;

  /**
   * Initial messages loaded from your data layer.
   * When this changes (e.g., switching chats), messages are synced via setMessages.
   */
  initialMessages: UIMessage[];

  /**
   * Called when chat completes (streaming finished).
   * Use this to update your React Query cache or persist messages.
   */
  onFinish?: (messages: UIMessage[]) => void;

  /**
   * Custom renderer for tool parts.
   * Return null to use the default JSON renderer.
   */
  renderToolPart?: ToolPartRenderer;

  /** Placeholder text for the input field */
  placeholder?: string;

  /** Additional CSS classes for the container */
  className?: string;

  /** Message shown when chat is empty */
  emptyStateMessage?: string;

  /** Suggested prompts shown in empty state */
  suggestedPrompts?: string[];
}

// ============================================================================
// DEFAULT TOOL RENDERER
// ============================================================================

function DefaultToolPartRenderer({ toolName, state, output, errorText }: ToolPartRendererProps) {
  if (isToolLoading(state)) {
    return (
      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg my-2">
        <Loader2 className="size-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Running {toolName}...</span>
      </div>
    );
  }

  if (isToolError(state)) {
    return (
      <div className="p-3 bg-destructive/10 rounded-lg my-2 text-sm text-destructive">
        Error: {errorText || "Tool execution failed"}
      </div>
    );
  }

  if (isToolComplete(state) && output) {
    return (
      <div className="p-3 bg-muted rounded-lg my-2">
        <pre className="text-xs overflow-auto max-h-40">
          {JSON.stringify(output, null, 2)}
        </pre>
      </div>
    );
  }

  return null;
}

// ============================================================================
// MESSAGE BUBBLE
// ============================================================================

function MessageBubble({
  message,
  renderToolPart,
  isStreaming,
}: {
  message: UIMessage;
  renderToolPart: ToolPartRenderer;
  isStreaming: boolean;
}) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex gap-3",
        isUser ? "justify-end items-start" : "justify-start items-start"
      )}
    >
      {/* Assistant avatar */}
      {!isUser && (
        <div className="size-8 shrink-0 mt-1 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="size-4 text-primary" />
        </div>
      )}

      {/* Message content */}
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-2.5",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
        )}
      >
        {message.parts.map((part, i) => {
          // Text parts - render with Markdown
          if (part.type === "text") {
            // Show loading indicator for empty text during streaming
            if (isStreaming && !part.text) {
              return (
                <div key={i} className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              );
            }
            return (
              <div key={i} className="prose prose-sm dark:prose-invert max-w-none">
                <Markdown mode={isStreaming ? "typewriter" : "static"} typewriterSpeed={50}>
                  {part.text}
                </Markdown>
              </div>
            );
          }

          // Tool parts - type is `tool-${toolName}`
          if (part.type.startsWith("tool-")) {
            const toolName = part.type.replace("tool-", "");
            // Cast to access tool-specific properties
            const toolPart = part as UIMessagePart & {
              type: `tool-${string}`;
              toolCallId: string;
              state: ToolInvocationState;
              input?: unknown;
              output?: unknown;
              errorText?: string;
            };

            const rendererProps: ToolPartRendererProps = {
              part: toolPart,
              toolName,
              state: toolPart.state,
              input: toolPart.input,
              output: toolPart.output,
              errorText: toolPart.errorText,
            };

            // Try custom renderer first, fall back to default
            const customRender = renderToolPart(rendererProps);
            if (customRender !== null) {
              return <div key={i}>{customRender}</div>;
            }
            return <div key={i}><DefaultToolPartRenderer {...rendererProps} /></div>;
          }

          // Reasoning parts (if using reasoning models)
          if (part.type === "reasoning") {
            return (
              <div key={i} className="text-xs text-muted-foreground italic border-l-2 pl-2 my-2">
                {part.text}
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AIChatBox({
  api = "/api/chat",
  chatId,
  userId,
  initialMessages,
  onFinish,
  renderToolPart = () => null,
  placeholder = "Type a message...",
  className,
  emptyStateMessage = "How can I help you today?",
  suggestedPrompts = [],
}: AIChatBoxProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState("");

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    status,
    setMessages,
    append,
  } = useChat({
    api,
    id: chatId,
    initialMessages,
    onFinish: (message, options) => {
      // In AI SDK v6, onFinish receives the last message
      // We can trigger the callback with the full message list
      if (onFinish) {
        // Use a timeout to ensure state is updated
        setTimeout(() => {
          onFinish([...messages, message]);
        }, 0);
      }
    },
    body: {
      userId,
    },
  });

  // Sync messages when chatId changes
  useEffect(() => {
    setMessages(initialMessages);
  }, [chatId, initialMessages, setMessages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() || isLoading) return;
      handleSubmit(e as any);
    }
  };

  return (
    <div className={cn("flex flex-col h-full w-full bg-background", className)}>
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="flex flex-col gap-6 max-w-3xl mx-auto py-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in slide-in-from-bottom-4">
              <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="size-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">{emptyStateMessage}</h3>
              {suggestedPrompts.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center mt-6">
                  {suggestedPrompts.map((prompt, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="text-xs rounded-full"
                      onClick={() => append({ role: "user", content: prompt })}
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}

          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              renderToolPart={renderToolPart}
              isStreaming={isLoading && m === messages[messages.length - 1]}
            />
          ))}

          {isLoading && status === "submitted" && (
            <div className="flex gap-3 justify-start items-start">
              <div className="size-8 shrink-0 mt-1 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="size-4 text-primary" />
              </div>
              <div className="bg-muted rounded-lg px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-background/50 backdrop-blur-sm">
        <form
          onSubmit={handleSubmit}
          className="relative max-w-3xl mx-auto flex items-end gap-2"
        >
          <Textarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="min-h-[52px] max-h-32 pr-12 py-3 resize-none bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary"
            rows={1}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 bottom-2 size-9 rounded-lg transition-all"
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </form>
        <p className="text-[10px] text-center text-muted-foreground mt-2">
          AI can make mistakes. Check important info.
        </p>
      </div>
    </div>
  );
}
