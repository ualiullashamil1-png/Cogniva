import { request } from "./api";

export type GradeKind = "sor" | "soch" | "other";

export interface Grade {
  id: number; subject_id: number; subtopic_id: number | null; kind: GradeKind;
  score: number; max_score: number; percent: number; title: string; date: string;
}
export interface GradeInput {
  subject_id: number; subtopic_id: number | null; kind: GradeKind; score: number; max_score: number; title: string;
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

export const gradesApi = {
  list: () => request<Grade[]>("/api/grades"),
  add: (g: GradeInput) => request<Grade>("/api/grades", json("POST", g)),
  update: (id: number, g: { score?: number; max_score?: number; title?: string }) =>
    request<Grade>(`/api/grades/${id}`, json("PATCH", g)),
  remove: (id: number) => request<void>(`/api/grades/${id}`, { method: "DELETE" }),
};