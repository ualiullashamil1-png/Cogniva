/** Форма ответа GET /api/profile/overview (как её отдаёт бэкенд Фазы 4). */
export interface OverviewSubject {
  id: number; name: string; grades_count: number;
  avg_grade_percent: number | null; avg_mastery: number | null; assessed_subtopics: number;
}
export interface OverviewItem {
  subtopic_id: number; name: string; topic: string; subject: string; mastery: number; difficulties: string[];
}
export interface Overview {
  student: { id: number; display_name: string; grade_level: number };
  subjects: OverviewSubject[];
  strongest: OverviewItem[];
  needs_attention: OverviewItem[];
  grade_history: { id: number; subject_id: number; percent: number; title: string; date: string }[];
  recent_grades: { id: number; subject_id: number; score: number; max_score: number; title: string }[];
}