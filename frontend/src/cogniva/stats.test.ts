import { describe, expect, it } from "vitest";
import type { Overview } from "../welcome/types";
import type { SubjectTree } from "./api";
import { buildTimeline, computeStats, flattenSubjects, parseApiDate, pickRecommendation, plural } from "./stats";

const prog = (mastery: number | null, tasks: number, extra: Partial<{ difficulties: string[]; last_assessed: string | null }> = {}) => ({
  mastery, assessed: tasks > 0, tasks_done: tasks, correct: 0, incorrect: 0, difficulties: [], recommendation: "", last_assessed: null, ...extra,
});
const tree = (): SubjectTree[] => [{
  id: 1, name: "Физика", topics: [{ id: 10, name: "Кинематика", subtopics: [
    { id: 1, name: "Векторы", description: "", key: "vectors", progress: prog(0.9, 10, { last_assessed: "2026-10-25T10:00:00" }) },
    { id: 2, name: "Ускорение", description: "", key: "acceleration", progress: prog(0.4, 10, { difficulties: ["путает скорость и ускорение"], last_assessed: "2026-10-26T10:00:00" }) },
    { id: 3, name: "Бросок", description: "", key: "projectile_motion", progress: prog(null, 0) },
    { id: 4, name: "Графики", description: "", key: "motion_graphs", progress: prog(0.65, 4) },
  ] }],
}];
const overview = (): Overview => ({
  student: { id: 1, display_name: "Алекс", grade_level: 9 },
  subjects: [{ id: 1, name: "Физика", grades_count: 2, avg_grade_percent: 80, avg_mastery: 0.65, assessed_subtopics: 3 }],
  strongest: [], needs_attention: [], recent_grades: [],
  grade_history: [
    { id: 1, subject_id: 1, percent: 70, title: "Контрольная", date: "2026-10-01T09:00:00" },
    { id: 2, subject_id: 1, percent: 90, title: "", date: "2026-10-20T09:00:00" },
  ],
});

describe("computeStats", () => {
  it("считает только по реальным данным", () => {
    const s = computeStats(flattenSubjects(tree()), overview());
    expect(s).toEqual({ gradesCount: 2, avgGradePercent: 80, subtopicsTotal: 4, assessed: 3, mastered: 1, needsReview: 1 });
  });
  it("без оценок средней нет (а не 0)", () => {
    const o = overview(); o.grade_history = [];
    expect(computeStats([], o).avgGradePercent).toBeNull();
  });
  it("«освоено» не выдаётся при малом числе заданий", () => {
    const t = tree(); t[0].topics[0].subtopics[3].progress = prog(0.95, 4);
    expect(computeStats(flattenSubjects(t), overview()).mastered).toBe(1);
  });
});

describe("pickRecommendation", () => {
  it("сначала слабейшая оценённая подтема, с названием ошибки", () => {
    const r = pickRecommendation(flattenSubjects(tree()))!;
    expect(r.kind).toBe("review");
    expect(r.row.name).toBe("Ускорение");
    expect(r.text).toContain("40%");
    expect(r.text).toContain("путает скорость и ускорение");
  });
  it("слабых нет — предлагает непроверенную подтему с готовой диагностикой", () => {
    const t = tree(); t[0].topics[0].subtopics[1].progress = prog(0.8, 10);
    const r = pickRecommendation(flattenSubjects(t))!;
    expect(r.kind).toBe("start");
    expect(r.row.key).toBe("projectile_motion");
  });
  it("нечего рекомендовать — null (ничего не выдумываем)", () => {
    expect(pickRecommendation([])).toBeNull();
    const t = tree(); t[0].topics[0].subtopics = [{ id: 9, name: "Другое", description: "", key: "custom_9", progress: prog(null, 0) }];
    expect(pickRecommendation(flattenSubjects(t))).toBeNull();
  });
});

describe("buildTimeline", () => {
  it("объединяет оценки и проверки, новые события — сверху", () => {
    const ev = buildTimeline(flattenSubjects(tree()), overview());
    expect(ev.map(e => e.id)).toEqual(["a2", "a1", "g2", "g1"]);
    expect(ev[2].title).toBe("Школьная оценка");
    expect(ev[0].detail).toBe("Освоение 40%");
  });
  it("пусто — пустой список", () => {
    const o = overview(); o.grade_history = [];
    expect(buildTimeline([], o)).toEqual([]);
  });
});

describe("helpers", () => {
  it("время сервера читается как UTC", () => {
    expect(parseApiDate("2026-10-25T10:00:00").toISOString()).toBe("2026-10-25T10:00:00.000Z");
    expect(parseApiDate("2026-10-25T10:00:00Z").toISOString()).toBe("2026-10-25T10:00:00.000Z");
  });
  it("склонение", () => {
    const f: [string, string, string] = ["подтема", "подтемы", "подтем"];
    expect([1, 2, 5, 11, 12, 21, 22, 25].map(n => plural(n, f))).toEqual(
      ["подтема", "подтемы", "подтем", "подтем", "подтем", "подтема", "подтемы", "подтем"]);
  });
});