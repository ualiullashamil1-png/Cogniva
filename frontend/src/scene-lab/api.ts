import type { Catalog, LessonData, Outcome, Overview, SceneData, SubjectNode, TestState } from './types'

const BASE = ''
const KEY = 'cogniva.token'

const getToken = () => {
  try {
    return localStorage.getItem(KEY) ?? ''
  } catch {
    return ''
  }
}

export const hasToken = () => getToken() !== ''
export function logout() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ничего */
  }
}

export async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const token = getToken()
  let r: Response
  try {
    r = await fetch(BASE + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new Error('Нет связи с сервером. Запущен ли uvicorn на порту 8000?')
  }
  if (!r.ok) {
    if (r.status === 401 && path !== '/api/auth/login') logout()
    let detail = `Ошибка ${r.status}`
    try {
      const d = await r.json()
      if (typeof d.detail === 'string') detail = d.detail
      else if (Array.isArray(d.detail) && d.detail[0]?.msg) detail = `Неверные данные: ${d.detail[0].msg}`
    } catch {
      /* тело ответа не JSON */
    }
    throw new Error(detail)
  }
  if (r.status === 204) return undefined as T
  return r.json() as Promise<T>
}

export async function login(username: string, password: string): Promise<void> {
  const d = await request<{ access_token: string }>('/api/auth/login', 'POST', { username, password })
  try {
    localStorage.setItem(KEY, d.access_token)
  } catch {
    /* ничего */
  }
}

export const getCatalog = () => request<Catalog>('/api/scenes/catalog')
export const buildScene = (spec: unknown) => request<SceneData>('/api/scenes/build', 'POST', spec)
export const aiStatus = () =>
  request<{ mode: string; provider: string | null; model: string | null }>('/api/ai/status')
export const startLesson = (topicId: number) => request<LessonData>('/api/lessons', 'POST', { topic_id: topicId })
export const sendMessage = (lessonId: number, text: string, intent: string) =>
  request<{ reply: string; mode: string }>(`/api/lessons/${lessonId}/messages`, 'POST', { text, intent })

export const startTest = (topicId: number, kind: 'diagnostic' | 'post_lesson') =>
  request<TestState>('/api/tests', 'POST', { topic_id: topicId, kind })
export const submitAnswer = (testId: number, questionId: number, answer: string) =>
  request<TestState>(`/api/tests/${testId}/answers`, 'POST', { question_id: questionId, answer })
export const finishTest = (testId: number) => request<TestState>(`/api/tests/${testId}/finish`, 'POST', {})
export const lessonResults = (lessonId: number) => request<Outcome>(`/api/lessons/${lessonId}/results`)

export const getOverview = () => request<Overview>('/api/profile/overview')
export const getSubjects = () => request<SubjectNode[]>('/api/subjects')
export const addSubject = (name: string) => request<SubjectNode>('/api/subjects', 'POST', { name })
export const addTopic = (subjectId: number, name: string) =>
  request<SubjectNode>(`/api/subjects/${subjectId}/topics`, 'POST', { name })
export const addSubtopic = (topicId: number, name: string, description: string) =>
  request<unknown>(`/api/topics/${topicId}/subtopics`, 'POST', { name, description })
export const addGrade = (g: { subject_id: number; subtopic_id: number | null; score: number; max_score: number; title: string }) =>
  request<unknown>('/api/grades', 'POST', g)