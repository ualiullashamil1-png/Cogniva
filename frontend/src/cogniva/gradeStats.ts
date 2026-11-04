import type { Grade, GradeKind } from "./gradesApi";

export const KIND_LABEL: Record<GradeKind, string> = {
  sor: "СОР",
  soch: "СОЧ",
  other: "Другое",
};

/** Процент платформы: сумма набранных баллов / сумма максимумов (не среднее процентов). */
export function percentOf(items: { score: number; max_score: number }[]): number | null {
  let got = 0;
  let max = 0;
  for (const it of items) {
    got += it.score;
    max += it.max_score;
  }
  if (max <= 0) return null;
  return Math.round((got / max) * 100);
}

/** Оценки одного типа (СОР, СОЧ или другое). */
/** Оценки одного предмета и одного типа (СОР, СОЧ или другое). */
export function gradesOfKind(grades: Grade[], subjectId: number, kind: GradeKind): Grade[] {
  return grades.filter(g => g.subject_id === subjectId && g.kind === kind);
}

export interface SubjectGradeStats {
  overall: number | null;
  sor: number | null;
  soch: number | null;
  count: number;
}

/** Итоги по одному предмету. Общий процент считается по СОР и СОЧ, "Другое" в него не входит. */
export function subjectGrades(grades: Grade[], subjectId: number): SubjectGradeStats {
  const mine = grades.filter(g => g.subject_id === subjectId && g.kind !== "other");
  return {
    overall: percentOf(mine),
    sor: percentOf(mine.filter(g => g.kind === "sor")),
    soch: percentOf(mine.filter(g => g.kind === "soch")),
    count: mine.length,
  };
}