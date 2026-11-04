import { request } from "./api";
import type { SubjectTree } from "./api";

export interface CreatedSubtopic { id: number; name: string; description: string; key: string }

const post = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

/** Свои темы и подтемы ученика (бэкенд проверяет, что предмет и тема его). */
export const curriculumApi = {
  addTopic: (subjectId: number, name: string) =>
    request<SubjectTree>(`/api/subjects/${subjectId}/topics`, post({ name })),
  addSubtopic: (topicId: number, name: string) =>
    request<CreatedSubtopic>(`/api/topics/${topicId}/subtopics`, post({ name, description: "" })),
};