import { describe, expect, it } from "vitest";
import { percentOf, subjectGrades } from "./gradeStats";
import type { Grade } from "./gradesApi";

const g = (o: Partial<Grade>): Grade => ({
  id: 1, subject_id: 1, subtopic_id: null, kind: "sor", score: 5, max_score: 10, percent: 50,
  title: "", date: "2026-10-01T10:00:00", ...o,
});

describe("gradeStats", () => {
  it("пустой список даёт null", () => expect(percentOf([])).toBeNull());
  it("считает сумму к сумме", () =>
    expect(percentOf([{ score: 5, max_score: 8 }, { score: 8, max_score: 10 }])).toBe(72));
  it("это не среднее процентов", () =>
    expect(percentOf([{ score: 9, max_score: 10 }, { score: 1, max_score: 100 }])).toBe(9));
  it("делит СОР и СОЧ и не смешивает предметы", () => {
    const list = [
      g({ id: 1, score: 5, max_score: 8 }), g({ id: 2, score: 8, max_score: 10 }),
      g({ id: 3, kind: "soch", score: 6, max_score: 10 }), g({ id: 4, subject_id: 2, score: 1, max_score: 1 }),
    ];
    expect(subjectGrades(list, 1)).toEqual({ overall: 68, sor: 72, soch: 60, count: 3 });
  });
});