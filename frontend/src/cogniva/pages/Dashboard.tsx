import { useNavigate } from "react-router-dom";
import {
  Badge, Button, Card, EmptyState, MasteryBadge, ProgressBar, ProgressRing, masteryLevel,
} from "../../design";
import { PersonalizedGreeting } from "../../welcome/PersonalizedGreeting";
import { buildSummary, firstName } from "../../welcome/greeting";
import type { Overview } from "../../welcome/types";
import type { SubjectTree } from "../api";
import { useAuth } from "../auth";
import {
  QUESTION_KEYS, Row, buildTimeline, computeStats, flattenSubjects, formatShortDate, pickRecommendation, plural,
} from "../stats";

export default function Dashboard({ overview, subjects }: { overview: Overview; subjects: SubjectTree[] }) {
  const { student } = useAuth();
  const navigate = useNavigate();
  const rows = flattenSubjects(subjects);
  const summary = buildSummary(overview);
  const stats = computeStats(rows, overview);
  const reco = pickRecommendation(rows);
  const timeline = buildTimeline(rows, overview);
  const isNew = summary.kind === "new";
  const learn = (row: Row) => navigate(`/learn?topic=${row.topicId}&subtopic=${row.id}`);

  return (
    <div className="dash">
      <PersonalizedGreeting name={firstName(student?.display_name)} summary={summary} />

      {isNew ? (
        <Card title="С чего начать">
          <p className="cg-muted" style={{ margin: 0 }}>Здесь появятся ваши результаты. Пока данных нет — давайте это исправим.</p>
          <ol className="steps">
            <li><span>Добавьте предметы, темы и школьные оценки в профиле</span></li>
            <li><span>Пройдите короткую диагностику — она покажет, что вы уже знаете</span></li>
            <li><span>Получите персональное объяснение и исследуйте тему в 3D</span></li>
          </ol>
          <div className="cg-row">
            <Button variant="gradient" onClick={() => navigate("/learn")}>Пройти диагностику</Button>
            <Button variant="secondary" onClick={() => navigate("/profile")}>Открыть профиль</Button>
          </div>
        </Card>
      ) : (
        <section aria-label="Сводка">
          <div className="stats">
            <Card className="stat">
              <div className="stat__label">Школьные оценки</div>
              <div className="stat__value">{stats.avgGradePercent === null ? "—" : `${stats.avgGradePercent}%`}</div>
              <div className="stat__note">{stats.gradesCount
                ? `средний результат по ${stats.gradesCount} ${plural(stats.gradesCount, ["оценке", "оценкам", "оценкам"])}`
                : "оценки пока не добавлены"}</div>
            </Card>
            <Card className="stat">
              <div className="stat__label">Проверено подтем</div>
              <div className="stat__value">{stats.assessed} <span className="cg-muted" style={{ fontSize: "1rem", fontWeight: 600 }}>из {stats.subtopicsTotal}</span></div>
              <div className="stat__note">освоение считается по тестам, а не по оценкам</div>
            </Card>
            <Card className="stat">
              <div className="stat__label">Освоено</div>
              <div className="stat__value">{stats.mastered}</div>
              <div className="stat__note">от 85% и не менее 8 заданий</div>
            </Card>
            <Card className="stat">
              <div className="stat__label">Нужно повторить</div>
              <div className="stat__value">{stats.needsReview}</div>
              <div className="stat__note">освоение ниже 60%</div>
            </Card>
          </div>
        </section>
      )}

      <div className="dash__cols">
        <div style={{ display: "grid", gap: "var(--space-5)" }}>
          {reco ? (
            <Card className="hero-card">
              <div className="hero-card__meta">
                <span className="pill">{reco.row.subjectName}</span><span className="pill">{reco.row.topicName}</span>
              </div>
              <h2 style={{ position: "relative", zIndex: 1 }}>{reco.row.name}</h2>
              <p style={{ position: "relative", zIndex: 1 }}>{reco.text}</p>
              <div style={{ position: "relative", zIndex: 1, margin: "14px 0 18px", maxWidth: 380 }}>
                {reco.row.assessed
                  ? <ProgressBar value={reco.row.mastery} label="Освоение подтемы" />
                  : <p style={{ margin: 0 }}>Освоение ещё не оценено</p>}
              </div>
              <div style={{ position: "relative", zIndex: 1 }}>
                <Button variant="secondary" size="lg" onClick={() => learn(reco.row)}>
                  {reco.kind === "review" ? "Повторить тему" : "Пройти диагностику"}
                </Button>
              </div>
            </Card>
          ) : (
            <Card title="Продолжить обучение">
              <EmptyState icon="🧭" title="Пока нечего рекомендовать"
                description="Исследуйте предмет, чтобы получать персональные рекомендации."
                action={<Button variant="secondary" size="sm" onClick={() => navigate("/profile")}>Выбрать предмет</Button>} />
            </Card>
          )}

          <section aria-label="Обзор знаний">
            <div className="section-title"><h2>Ваши знания</h2></div>
            {overview.subjects.length === 0 ? (
              <Card><EmptyState icon="📚" title="Предметов пока нет" description="Добавьте предмет в профиле, чтобы отслеживать освоение тем."
                action={<Button variant="secondary" size="sm" onClick={() => navigate("/profile")}>Добавить предмет</Button>} /></Card>
            ) : (
              <div className="cg-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
                {overview.subjects.map(s => {
                  const subRows = rows.filter(r => r.subjectId === s.id);
                  const hasQuiz = subRows.some(r => QUESTION_KEYS.has(r.key));
                  const level = s.avg_mastery === null ? undefined : masteryLevel(s.avg_mastery, 1);
                  return (
                    <Card key={s.id} className="subject-card">
                      <div className="subject-card__head">
                        <div>
                          <h3 style={{ margin: 0 }}>{s.name}</h3>
                          <div className="cg-muted" style={{ fontSize: "var(--fs-sm)" }}>
                            {s.avg_grade_percent === null ? "оценок нет" : `школа: ${s.avg_grade_percent}%`}
                          </div>
                        </div>
                        <ProgressRing value={s.avg_mastery} level={level} size={68} stroke={7} />
                      </div>
                      <div>
                        {subRows.slice(0, 5).map(r => (
                          <div className="sub-row" key={r.id}><span>{r.name}</span><MasteryBadge mastery={r.mastery} tasksDone={r.tasksDone} /></div>
                        ))}
                        {subRows.length > 5 && <div className="cg-muted" style={{ fontSize: "var(--fs-sm)", paddingTop: 6 }}>и ещё {subRows.length - 5}</div>}
                        {subRows.length === 0 && <div className="cg-muted" style={{ fontSize: "var(--fs-sm)" }}>Подтем пока нет</div>}
                      </div>
                      {!hasQuiz && <Badge tone="info">диагностика скоро</Badge>}
                    </Card>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <aside aria-label="Последние события">
          <Card title="Последние события">
            {timeline.length === 0 ? (
              <EmptyState icon="🌱" title="Ваш путь начинается здесь" description="Пройдите первую диагностику или добавьте оценку — события появятся в этой ленте." />
            ) : (
              <ul className="timeline">
                {timeline.map(ev => (
                  <li key={ev.id}>
                    <span className={`timeline__dot timeline__dot--${ev.type}`} />
                    <div>
                      <div className="timeline__title">{ev.title}</div>
                      <div className="cg-muted" style={{ fontSize: "var(--fs-sm)" }}>{ev.detail} · {formatShortDate(ev.date)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}