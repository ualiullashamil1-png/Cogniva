/** Чистые функции: из реальных данных профиля получают цифры, рекомендации и ленту событий. Ничего не выдумывают. */
import { masteryLevel } from "../design";
import type { Overview } from "../welcome/types";
import type { SubjectTree } from "./api";

/** Ключи подтем, для которых в банке вопросов бэкенда есть диагностика (зеркало diagnostics/question_bank.py). */
export const QUESTION_KEYS = new Set(["vectors", "velocity", "acceleration", "motion_graphs", "projectile_motion"]);
export const ATTENTION_BELOW = 0.6;   // как на бэкенде (academics/progress.py)

export interface Row {
  id: number; name: string; key: string; description: string;
  topicId: number; topicName: string; subjectId: number; subjectName: string;
  mastery: number | null; assessed: boolean; tasksDone: number; difficulties: string[]; lastAssessed: string | null;
}

export function flattenSubjects(subjects: SubjectTree[]): Row[] {
  return subjects.flatMap(s => s.topics.flatMap(t => t.subtopics.map(st => ({
    id: st.id, name: st.name, key: st.key, description: st.description,
    topicId: t.id, topicName: t.name, subjectId: s.id, subjectName: s.name,
    mastery: st.progress.mastery, assessed: st.progress.assessed, tasksDone: st.progress.tasks_done,
    difficulties: st.progress.difficulties, lastAssessed: st.progress.last_assessed,
  }))));
}

export interface Stats {
  gradesCount: number; avgGradePercent: number | null;
  subtopicsTotal: number; assessed: number; mastered: number; needsReview: number;
}

export function computeStats(rows: Row[], overview: Overview): Stats {
  const percents = overview.grade_history.map(g => g.percent);
  return {
    gradesCount: percents.length,
    avgGradePercent: percents.length ? Math.round((percents.reduce((a, b) => a + b, 0) / percents.length) * 10) / 10 : null,
    subtopicsTotal: rows.length,
    assessed: rows.filter(r => r.assessed).length,
    mastered: rows.filter(r => masteryLevel(r.mastery, r.tasksDone) === "mastered").length,
    needsReview: rows.filter(r => r.assessed && r.mastery !== null && r.mastery < ATTENTION_BELOW).length,
  };
}

export interface Recommendation { kind: "review" | "start"; row: Row; text: string }

/** Что учить дальше: слабейшая оценённая подтема, иначе первая подтема с готовой диагностикой. */
export function pickRecommendation(rows: Row[]): Recommendation | null {
  const weak = rows.filter(r => r.assessed && r.mastery !== null && r.mastery < ATTENTION_BELOW)
    .sort((a, b) => (a.mastery as number) - (b.mastery as number))[0];
  if (weak) {
    const pct = Math.round((weak.mastery as number) * 100);
    const mis = weak.difficulties.length ? ` Замечено: ${weak.difficulties[0]}.` : "";
    return { kind: "review", row: weak, text: `Освоение подтемы «${weak.name}» — ${pct}%.${mis}` };
  }
  const fresh = rows.find(r => !r.assessed && QUESTION_KEYS.has(r.key));
  if (fresh) return { kind: "start", row: fresh, text: `Подтема «${fresh.name}» ещё не проверялась. Короткая диагностика покажет, что вы уже знаете.` };
  return null;
}

export interface TimelineEvent { id: string; type: "grade" | "assessment"; date: Date; title: string; detail: string }

/** Сервер отдаёт время в UTC без «Z» — добавляем, чтобы браузер не сдвигал часы. */
export function parseApiDate(iso: string): Date {
  return new Date(/Z$|[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}Z`);
}

export function buildTimeline(rows: Row[], overview: Overview, limit = 6): TimelineEvent[] {
  const subject = new Map(overview.subjects.map(s => [s.id, s.name]));
  const events: TimelineEvent[] = [
    ...overview.grade_history.map(g => ({
      id: `g${g.id}`, type: "grade" as const, date: parseApiDate(g.date),
      title: g.title || "Школьная оценка", detail: `${subject.get(g.subject_id) ?? "Предмет"} · ${Math.round(g.percent)}%`,
    })),
    ...rows.filter(r => r.lastAssessed && r.mastery !== null).map(r => ({
      id: `a${r.id}`, type: "assessment" as const, date: parseApiDate(r.lastAssessed as string),
      title: `Проверка знаний: ${r.name}`, detail: `Освоение ${Math.round((r.mastery as number) * 100)}%`,
    })),
  ];
  return events.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, limit);
}

export function formatShortDate(d: Date): string {
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

/** Русское склонение: plural(5, ["подтема", "подтемы", "подтем"]) -> "подтем" */
export function plural(n: number, forms: [string, string, string]): string {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}