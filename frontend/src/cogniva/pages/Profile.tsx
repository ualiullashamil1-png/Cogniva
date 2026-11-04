import { useCallback, useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge, Card, EmptyState, MasteryBadge, ProgressBar, ProgressRing, masteryLevel } from "../../design";
import { confidenceLabel } from "../../design/mastery";
import type { Overview } from "../../welcome/types";
import { ApiError } from "../api";
import type { SubjectTree } from "../api";
import { useAuth } from "../auth";
import { useData } from "../data";
import { subjectGrades } from "../gradeStats";
import { gradesApi } from "../gradesApi";
import type { Grade } from "../gradesApi";
import { formatShortDate, parseApiDate, plural } from "../stats";
import GradesModal from "./GradesModal";
import "./profile.css";

/** Освоение предмета = среднее по ПРОВЕРЕННЫМ подтемам (непроверенные не считаются). */
function masterySummary(s: SubjectTree) {
  const subs = s.topics.flatMap(t => t.subtopics);
  const assessed = subs.filter(x => x.progress.assessed && x.progress.mastery !== null);
  const avg = assessed.length
    ? assessed.reduce((sum, x) => sum + (x.progress.mastery as number), 0) / assessed.length
    : null;
  const tasks = assessed.reduce((sum, x) => sum + x.progress.tasks_done, 0);
  return { total: subs.length, assessed: assessed.length, avg, tasks };
}

const pct = (v: number | null) => (v === null ? "—" : `${v}%`);

export default function Profile({ subjects }: { overview: Overview; subjects: SubjectTree[] }) {
  const { student } = useAuth();
  const { reload } = useData();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [gradesError, setGradesError] = useState("");
  const [activeId, setActiveId] = useState<number | null>(null);

  const loadGrades = useCallback(async () => {
    try {
      setGrades(await gradesApi.list());
      setGradesError("");
    } catch (e) {
      setGradesError(e instanceof ApiError ? e.message : "Не удалось загрузить оценки");
    }
  }, []);
  useEffect(() => { void loadGrades(); }, [loadGrades]);

  const refresh = useCallback(async () => { await Promise.all([loadGrades(), reload()]); }, [loadGrades, reload]);
  const closeModal = useCallback(() => setActiveId(null), []);

  const active = subjects.find(s => s.id === activeId) ?? null;
  const history = grades.map(g => ({ label: formatShortDate(parseApiDate(g.date)), percent: Math.round(g.percent) }));

  return (
    <div className="pf">
      <header className="pf-head">
        <div className="pf-avatar" aria-hidden>{(student?.display_name.trim()[0] ?? "?").toUpperCase()}</div>
        <div>
          <h1>{student?.display_name ?? "Профиль"}</h1>
          <div className="cg-row">
            {student && <Badge tone="accent">{student.grade_level} класс</Badge>}
            {student && <span className="cg-muted">логин: {student.username}</span>}
          </div>
        </div>
      </header>

      <section>
        <h2 className="pf-h2">Предметы</h2>
        <p className="pf-note">
          Процент по оценкам считается из ваших СОР и СОЧ: сумма набранных баллов к сумме максимумов.
          Освоение считает система по вашим ответам в тестах. Эти числа могут различаться, и это нормально.
          Нажмите на предмет, чтобы открыть и добавить оценки.
        </p>
        {gradesError && <p className="pf-error" role="alert">{gradesError}</p>}
        {subjects.length === 0 ? (
          <Card>
            <EmptyState icon="📚" title="Предметов пока нет" description="Выйдите и войдите снова, предметы создадутся автоматически." />
          </Card>
        ) : (
          <div className="pf-subjects">
            {subjects.map(s => {
              const m = masterySummary(s);
              const sg = subjectGrades(grades, s.id);
              return (
                <Card key={s.id} onClick={() => setActiveId(s.id)}>
                  <div className="pf-subject__top">
                    <ProgressRing value={m.avg} level={masteryLevel(m.avg, m.tasks)} size={84} />
                    <div>
                      <h3>{s.name}</h3>
                      <div className="cg-muted">проверено подтем: {m.assessed} из {m.total}</div>
                    </div>
                  </div>
                  <div className="pf-compare">
                    <div>
                      <div className="pf-compare__label">По вашим оценкам</div>
                      <div className="pf-compare__value">{pct(sg.overall)}</div>
                      <div className="pf-compare__label">СОР {pct(sg.sor)} · СОЧ {pct(sg.soch)}</div>
                    </div>
                    <div>
                      <div className="pf-compare__label">Освоение по тестам</div>
                      <div className="pf-compare__value">{m.avg === null ? "—" : `${Math.round(m.avg * 100)}%`}</div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <Card title="Динамика оценок">
          {history.length === 0 ? (
            <EmptyState icon="📈" title="Оценок пока нет" description="Добавьте СОР или СОЧ в любом предмете, и здесь появится график." />
          ) : (
            <>
              <p className="pf-note">
                {history.length} {plural(history.length, ["оценка", "оценки", "оценок"])}, в процентах от максимума
              </p>
              <div className="pf-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <CartesianGrid stroke="var(--border)" />
                    <XAxis dataKey="label" stroke="var(--text-faint)" />
                    <YAxis domain={[0, 100]} stroke="var(--text-faint)" />
                    <Tooltip contentStyle={{ background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: 8 }} />
                    <Line type="monotone" dataKey="percent" name="Оценка, %" stroke="var(--accent)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </Card>
      </section>

      <section>
        <h2 className="pf-h2">Знания по подтемам</h2>
        <Card>
          {subjects.map(s => {
            const m = masterySummary(s);
            return (
              <details key={s.id} className="pf-topic">
                <summary>{s.name} <span className="cg-muted">· проверено {m.assessed} из {m.total}</span></summary>
                {s.topics.map(t => (
                  <div key={t.id} className="pf-sub">
                    <strong>{t.name}</strong>
                    {t.subtopics.length === 0 && <p className="cg-muted">Подтем пока нет.</p>}
                    {t.subtopics.map(st => {
                      const p = st.progress;
                      return (
                        <div key={st.id} className="pf-sub">
                          <div className="pf-sub__head">
                            <span>{st.name}</span>
                            <MasteryBadge mastery={p.mastery} tasksDone={p.tasks_done} />
                          </div>
                          <ProgressBar value={p.assessed ? p.mastery : null}
                                       level={masteryLevel(p.mastery, p.tasks_done)} showValue={p.assessed} />
                          {st.description && <p className="cg-muted">{st.description}</p>}
                          {p.assessed ? (
                            <p className="cg-muted">
                              Заданий: {p.tasks_done} (верно {p.correct}, неверно {p.incorrect}) · достоверность оценки:{" "}
                              {confidenceLabel(p.tasks_done)}
                            </p>
                          ) : (
                            <p className="cg-muted">Пока не проверялось.</p>
                          )}
                          {p.difficulties.length > 0 && <ul>{p.difficulties.map(d => <li key={d}>{d}</li>)}</ul>}
                          {p.recommendation && <p className="pf-sub__reco">{p.recommendation}</p>}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </details>
            );
          })}
        </Card>
      </section>

      {active && <GradesModal subject={active} grades={grades} onClose={closeModal} onChanged={refresh} />}
    </div>
  );
}