import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Skeleton } from "../../design";
import { getSubjects } from "../../scene-lab/api";
import type { SubjectNode, TopicNode } from "../../scene-lab/types";
import LessonPage from "../../scene-lab/LessonPage";

// Диагностика есть, если у темы есть подтемы со связью с банком вопросов (поле key)
const hasDiagnostic = (t: TopicNode) => t.subtopics.some((s) => !!s.key);

const card: React.CSSProperties = {
  border: "1px solid rgba(120,130,155,.35)",
  borderRadius: 12,
  padding: 14,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
};

export default function Learn() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const topic = Number(params.get("topic")) || undefined;
  const [subjects, setSubjects] = useState<SubjectNode[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getSubjects()
      .then(setSubjects)
      .catch((e) => setError((e as Error).message));
  }, []);

  // Тема выбрана: показываем диагностику и урок
  if (topic) {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <Button variant="ghost" size="sm" onClick={() => nav("/learn")}>
            ← Все темы
          </Button>
        </div>
        <LessonPage embedded topicId={topic} key={topic} />
      </div>
    );
  }

  // Тема не выбрана: список тем
  if (error) return <p style={{ color: "#dc2626" }}>{error}</p>;
  if (!subjects) {
    return (
      <div style={{ display: "grid", gap: 10 }}>
        <Skeleton height={28} width="40%" />
        <Skeleton height={60} />
        <Skeleton height={60} />
      </div>
    );
  }

  const withTopics = subjects.filter((s) => s.topics.length > 0);
  const ready = withTopics
    .map((s) => ({ s, topics: s.topics.filter(hasDiagnostic) }))
    .filter((x) => x.topics.length > 0);
  const soon = withTopics
    .map((s) => ({ s, topics: s.topics.filter((t) => !hasDiagnostic(t)) }))
    .filter((x) => x.topics.length > 0);

  return (
    <div style={{ display: "grid", gap: 20, maxWidth: 820 }}>
      <div>
        <h1 style={{ margin: 0 }}>Учёба</h1>
        <p style={{ margin: "6px 0 0", opacity: 0.75 }}>
          Выберите тему: сначала диагностика, потом урок со сценой, итоговый тест и результаты.
        </p>
      </div>

      {ready.length === 0 && <p>Пока нет тем с диагностикой.</p>}

      {ready.map(({ s, topics }) => (
        <section key={s.id} style={{ display: "grid", gap: 8 }}>
          <h3 style={{ margin: 0 }}>{s.name}</h3>
          {topics.map((t) => (
            <div key={t.id} style={card}>
              <div>
                <b>{t.name}</b>
                <div style={{ fontSize: 13, opacity: 0.7 }}>
                  Подтем: {t.subtopics.length}
                </div>
              </div>
              <Button onClick={() => nav(`/learn?topic=${t.id}`)}>Начать</Button>
            </div>
          ))}
        </section>
      ))}

      {soon.length > 0 && (
        <section style={{ display: "grid", gap: 6, opacity: 0.7 }}>
          <h3 style={{ margin: 0 }}>Диагностика скоро</h3>
          {soon.map(({ s, topics }) => (
            <div key={s.id} style={{ fontSize: 14 }}>
              <b>{s.name}:</b> {topics.map((t) => t.name).join(", ")}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}