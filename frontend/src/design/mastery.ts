/** Уровни освоения подтемы. Освоение (mastery) приходит с сервера (0..1) и считается по тестам.
 *  Уровень «Освоено» нельзя показать по малому числу заданий: слишком мало доказательств. */
export type MasteryLevel = "none" | "beginning" | "developing" | "good" | "mastered";

export const LEVEL_LABELS: Record<MasteryLevel, string> = {
  none: "Не оценено",
  beginning: "Начальный",
  developing: "Развивается",
  good: "Хорошо",
  mastered: "Освоено",
};

export const MIN_TASKS_FOR_MASTERED = 8;

export function masteryLevel(mastery: number | null | undefined, tasksDone = 0): MasteryLevel {
  if (mastery == null || tasksDone <= 0) return "none";
  if (mastery < 0.4) return "beginning";
  if (mastery < 0.65) return "developing";
  if (mastery < 0.85) return "good";
  return tasksDone >= MIN_TASKS_FOR_MASTERED ? "mastered" : "good";
}

/** Насколько можно доверять оценке: зависит от числа заданий, а не от самого процента. */
export function confidenceLabel(tasksDone: number): "низкая" | "средняя" | "высокая" {
  if (tasksDone < 3) return "низкая";
  if (tasksDone < MIN_TASKS_FOR_MASTERED) return "средняя";
  return "высокая";
}

export const levelColor = (level: MasteryLevel) => `var(--lvl-${level})`;