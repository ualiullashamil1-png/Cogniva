import { describe, expect, it } from "vitest";
import { confidenceLabel, masteryLevel } from "./mastery";

describe("masteryLevel", () => {
  it("без данных — «не оценено», даже если mastery задан", () => {
    expect(masteryLevel(null, 0)).toBe("none");
    expect(masteryLevel(undefined)).toBe("none");
    expect(masteryLevel(0.5, 0)).toBe("none");
  });
  it("границы уровней", () => {
    expect(masteryLevel(0.39, 10)).toBe("beginning");
    expect(masteryLevel(0.4, 10)).toBe("developing");
    expect(masteryLevel(0.64, 10)).toBe("developing");
    expect(masteryLevel(0.65, 10)).toBe("good");
    expect(masteryLevel(0.84, 10)).toBe("good");
    expect(masteryLevel(0.85, 10)).toBe("mastered");
  });
  it("«освоено» не выдаётся по малому числу заданий", () => {
    expect(masteryLevel(0.95, 4)).toBe("good");
    expect(masteryLevel(0.95, 8)).toBe("mastered");
  });
  it("уверенность растёт с числом заданий", () => {
    expect(confidenceLabel(2)).toBe("низкая");
    expect(confidenceLabel(5)).toBe("средняя");
    expect(confidenceLabel(10)).toBe("высокая");
  });
});