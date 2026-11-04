import { CSSProperties, useState } from "react";
import { Badge, Tabs, ThemeToggle } from "../design";
import { PersonalizedGreeting } from "./PersonalizedGreeting";
import { WelcomeScreen } from "./WelcomeScreen";
import { buildSummary, firstName } from "./greeting";
import type { Overview } from "./types";

/** ДЕМО-данные только для этой страницы предпросмотра. В приложении используются реальные данные API. */
const DEMO_OVERVIEW: Overview = {
  student: { id: 0, display_name: "Демо Ученик", grade_level: 9 },
  subjects: [{ id: 1, name: "Физика", grades_count: 3, avg_grade_percent: 80, avg_mastery: 0.7, assessed_subtopics: 4 }],
  strongest: [{ subtopic_id: 1, name: "Векторы", topic: "Кинематика", subject: "Физика", mastery: 0.9, difficulties: [] }],
  needs_attention: [{ subtopic_id: 3, name: "Ускорение", topic: "Кинематика", subject: "Физика", mastery: 0.4, difficulties: [] }],
  grade_history: [], recent_grades: [],
};
const EMPTY_OVERVIEW: Overview = { ...DEMO_OVERVIEW, subjects: [{ ...DEMO_OVERVIEW.subjects[0], grades_count: 0, assessed_subtopics: 0 }], strongest: [], needs_attention: [] };

export default function Preview() {
  const [tab, setTab] = useState("first");
  const [run, setRun] = useState(0);                   // меняем key, чтобы повторить анимацию
  const small = { ["--welcome-min-h" as string]: "560px" } as CSSProperties;
  return (
    <div>
      <div className="cg-container" style={{ padding: "16px 0" }}>
        <div className="cg-row" style={{ justifyContent: "space-between" }}>
          <div className="cg-row"><b>Предпросмотр приветствия</b><Badge tone="warning" dot>демонстрационные данные</Badge></div>
          <div className="cg-row">
            <button className="cg-btn cg-btn--ghost cg-btn--sm" type="button" onClick={() => setRun(r => r + 1)}>↻ Повторить анимацию</button>
            <ThemeToggle />
          </div>
        </div>
        <Tabs active={tab} onChange={t => { setTab(t); setRun(r => r + 1); }}
              tabs={[{ id: "first", label: "Новый ученик" }, { id: "noname", label: "Имя неизвестно" },
                     { id: "back", label: "Вернулся (есть результаты)" }, { id: "backempty", label: "Вошёл, данных нет" }]} />
      </div>
      <div key={`${tab}-${run}`} style={small}>
        {tab === "first" && <WelcomeScreen name={firstName(DEMO_OVERVIEW.student.display_name)} onStart={() => alert("Дальше: онбординг или дашборд")} onExplore={() => alert("Дальше: страница «О платформе»")} />}
        {tab === "noname" && <WelcomeScreen name={firstName("")} onStart={() => {}} />}
        {tab === "back" && <div className="cg-container" style={{ padding: "32px 0" }}><PersonalizedGreeting name={firstName(DEMO_OVERVIEW.student.display_name)} summary={buildSummary(DEMO_OVERVIEW)} /></div>}
        {tab === "backempty" && <div className="cg-container" style={{ padding: "32px 0" }}><PersonalizedGreeting name={firstName(EMPTY_OVERVIEW.student.display_name)} summary={buildSummary(EMPTY_OVERVIEW)} /></div>}
      </div>
    </div>
  );
}