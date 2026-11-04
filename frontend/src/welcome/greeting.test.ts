import { describe, expect, it } from "vitest";
import { buildSummary, firstName, formatDate, timeGreeting } from "./greeting";
import type { Overview } from "./types";

const at = (hour: number) => new Date(2026, 10, 1, hour, 30);

const base = (): Overview => ({
  student: { id: 1, display_name: "Алекс Иванов", grade_level: 9 },
  subjects: [{ id: 1, name: "Физика", grades_count: 0, avg_grade_percent: null, avg_mastery: null, assessed_subtopics: 0 }],
  strongest: [], needs_attention: [], grade_history: [], recent_grades: [],
});
const item = (name: string, mastery: number) => ({ subtopic_id: 1, name, topic: "Кинематика", subject: "Физика", mastery, difficulties: [] });

describe("timeGreeting", () => {
  it("зависит от местного времени", () => {
    expect(timeGreeting(at(5))).toBe("Доброе утро");
    expect(timeGreeting(at(11))).toBe("Доброе утро");
    expect(timeGreeting(at(12))).toBe("Добрый день");
    expect(timeGreeting(at(17))).toBe("Добрый день");
    expect(timeGreeting(at(18))).toBe("Добрый вечер");
    expect(timeGreeting(at(22))).toBe("Добрый вечер");
    expect(timeGreeting(at(23))).toBe("Доброй ночи");
    expect(timeGreeting(at(3))).toBe("Доброй ночи");
  });
});

describe("firstName", () => {
  it("берёт первое слово и не выдумывает имя", () => {
    expect(firstName("Алекс Иванов")).toBe("Алекс");
    expect(firstName("  Алекс ")).toBe("Алекс");
    expect(firstName("")).toBeNull();
    expect(firstName("   ")).toBeNull();
    expect(firstName(null)).toBeNull();
    expect(firstName(undefined)).toBeNull();
  });
});

describe("formatDate", () => {
  it("по-русски: день недели, число, месяц", () => {
    expect(formatDate(at(10))).toBe("воскресенье, 1 ноября");
  });
});

describe("buildSummary", () => {
  it("нет данных — нейтральный текст для нового ученика", () => {
    expect(buildSummary(null).kind).toBe("new");
    expect(buildSummary(undefined).kind).toBe("new");
    expect(buildSummary(base()).kind).toBe("new");
  });
  it("только оценки — предлагает диагностику и не говорит о «прогрессе»", () => {
    const o = base(); o.subjects[0].grades_count = 2;
    const s = buildSummary(o);
    expect(s.kind).toBe("returning");
    expect(s.text).toContain("диагностику");
  });
  it("есть слабая подтема — называет её и предмет из данных", () => {
    const o = base(); o.subjects[0].assessed_subtopics = 4; o.needs_attention = [item("Ускорение", 0.4)];
    const s = buildSummary(o);
    expect(s.text).toContain("«Физика»");
    expect(s.text).toContain("«Ускорение»");
  });
  it("слабых мест нет — хвалит только сильную тему из данных", () => {
    const o = base(); o.subjects[0].assessed_subtopics = 4; o.strongest = [item("Векторы", 0.9)];
    expect(buildSummary(o).text).toContain("«Векторы»");
    o.strongest = [];
    expect(buildSummary(o).text).toBe("Слабых мест по пройденным темам не найдено.");
  });
});