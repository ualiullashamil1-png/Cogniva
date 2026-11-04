import type { Overview } from "./types";

/** Приветствие по местному времени ученика. */
export function timeGreeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h >= 5 && h < 12) return "Доброе утро";
  if (h >= 12 && h < 18) return "Добрый день";
  if (h >= 18 && h < 23) return "Добрый вечер";
  return "Доброй ночи";
}

/** Имя для обращения: первое слово из display_name. Если имени нет — null (ничего не выдумываем). */
export function firstName(displayName?: string | null): string | null {
  const first = displayName?.trim().split(/\s+/)[0];
  return first ? first : null;
}

export function formatDate(now: Date = new Date()): string {
  return now.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
}

export interface Summary {
  kind: "new" | "returning";
  text: string;
}

const NEW_TEXT = "Давайте узнаем, что вы уже знаете, и построим ваш личный путь обучения.";

/** Короткая сводка под приветствием. Использует ТОЛЬКО реальные данные из профиля. */
export function buildSummary(overview: Overview | null | undefined): Summary {
  if (!overview) return { kind: "new", text: NEW_TEXT };
  const assessed = overview.subjects.reduce((n, s) => n + s.assessed_subtopics, 0);
  const grades = overview.subjects.reduce((n, s) => n + s.grades_count, 0);
  if (assessed === 0 && grades === 0) return { kind: "new", text: NEW_TEXT };

  if (assessed === 0) {
    return {
      kind: "returning",
      text: "Школьные оценки уже записаны. Пройдите диагностику, чтобы увидеть, какие понятия вы действительно усвоили.",
    };
  }
  const weak = overview.needs_attention[0];
  if (weak) {
    return {
      kind: "returning",
      text: `По предмету «${weak.subject}» уже есть результаты диагностики. Следующая рекомендуемая тема — «${weak.name}».`,
    };
  }
  const strong = overview.strongest[0];
  return {
    kind: "returning",
    text: strong
      ? `Слабых мест по пройденным темам не найдено. Увереннее всего вы владеете темой «${strong.name}» — можно переходить к более сложным задачам.`
      : "Слабых мест по пройденным темам не найдено.",
  };
}