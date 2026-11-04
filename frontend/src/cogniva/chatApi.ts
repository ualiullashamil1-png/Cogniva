import { request } from "./api";

export interface ChatConversation { id: number; title: string; updated_at: string }
export interface ChatMessage { id?: number; role: "user" | "assistant"; content: string; mode?: string }
export interface ChatConversationFull extends ChatConversation { messages: ChatMessage[] }
export interface AiStatus { mode: "ai" | "demo"; provider: string | null; model: string | null }
export interface SendResult { reply: string; mode: string; title: string; proposals: string[] }
export interface ChatMemory { id: number; text: string; created_at: string }

const post = (body?: unknown): RequestInit => ({
  method: "POST",
  body: body === undefined ? undefined : JSON.stringify(body),
});

export const chatApi = {
  status: () => request<AiStatus>("/api/ai/status"),
  list: () => request<ChatConversation[]>("/api/chat/conversations"),
  create: () => request<ChatConversation>("/api/chat/conversations", post()),
  get: (id: number) => request<ChatConversationFull>(`/api/chat/conversations/${id}`),
  send: (id: number, text: string) => request<SendResult>(`/api/chat/conversations/${id}/messages`, post({ text })),
  remove: (id: number) => request<void>(`/api/chat/conversations/${id}`, { method: "DELETE" }),
  memoryList: () => request<ChatMemory[]>("/api/chat/memory"),
  memoryAdd: (text: string) => request<ChatMemory>("/api/chat/memory", post({ text })),
  memoryRemove: (id: number) => request<void>(`/api/chat/memory/${id}`, { method: "DELETE" }),
};