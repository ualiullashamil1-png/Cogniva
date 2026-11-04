/** Единый слой запросов к бэкенду. Токен хранится здесь, ошибки приводятся к понятному русскому тексту. */
import type { Overview } from "../welcome/types";

export interface Student { id: number; username: string; display_name: string; grade_level: number }
export interface Progress {
  mastery: number | null; assessed: boolean; tasks_done: number; correct: number; incorrect: number;
  difficulties: string[]; recommendation: string; last_assessed: string | null;
}
export interface SubtopicNode { id: number; name: string; description: string; key: string; progress: Progress }
export interface TopicNode { id: number; name: string; subtopics: SubtopicNode[] }
export interface SubjectTree { id: number; name: string; topics: TopicNode[] }

const TOKEN_KEY = "cogniva.token";
export const tokenStore = {
  get(): string | null { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set(t: string) { try { localStorage.setItem(TOKEN_KEY, t); } catch { /* ignore */ } },
  clear() { try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } },
};

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

function detailToText(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map(d => (d as { msg?: string })?.msg ?? "").filter(Boolean).join("; ");
  return "Что-то пошло не так. Попробуйте ещё раз.";
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  const headers: Record<string, string> = {
    ...(init.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  let res: Response;
  try {
    res = await fetch(path, { ...init, headers });
  } catch {
    throw new ApiError(0, "Нет связи с сервером. Проверьте, что backend запущен.");
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token) window.dispatchEvent(new Event("cogniva:unauthorized"));
    throw new ApiError(res.status, detailToText(body?.detail));
  }
  return body as T;
}

const post = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

export const api = {
  login: (username: string, password: string) =>
    request<{ access_token: string; student: Student }>("/api/auth/login", post({ username, password })),
  register: (data: { username: string; password: string; display_name: string; grade_level: number }) =>
    request<{ access_token: string; student: Student }>("/api/auth/register", post(data)),
  me: () => request<Student>("/api/me"),
  overview: () => request<Overview>("/api/profile/overview"),
  subjects: () => request<SubjectTree[]>("/api/subjects"),
};