import { btn, card, h2, masteryColor, muted, pct } from './ui'
import type { Overview, SubjectNode, TopicNode } from '../scene-lab/types'

function recommend(o: Overview, subjects: SubjectNode[]): { topic: TopicNode; reason: string } | null {
  const att = o.needs_attention[0]
  if (att) {
    for (const s of subjects)
      for (const t of s.topics)
        if (t.subtopics.some((x) => x.id === att.subtopic_id))
          return { topic: t, reason: `Слабое место: «${att.name}» (освоение ${pct(att.mastery)})` }
  }
  for (const s of subjects)
    for (const t of s.topics)
      if (t.subtopics.length) return { topic: t, reason: 'Данных об освоении пока мало: начните с диагностики' }
  return null
}

export default function Dashboard({ overview, subjects, onStart }: {
  overview: Overview
  subjects: SubjectNode[]
  onStart: (topicId: number) => void
}) {
  const rec = recommend(overview, subjects)
  return (
    <div>
      <h1 style={{ margin: '0 0 4px' }}>Здравствуйте, {overview.student.display_name}!</h1>
      <p style={muted}>{overview.student.grade_level} класс</p>

      {rec && (
        <div style={{ ...card, border: '1px solid #2563eb' }}>
          <b>Рекомендуем следующий урок: {rec.topic.name}</b>
          <p style={{ ...muted, margin: '6px 0 10px' }}>{rec.reason}</p>
          <button style={btn} onClick={() => onStart(rec.topic.id)}>Начать</button>
        </div>
      )}

      <div style={h2}>Предметы</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
        {overview.subjects.map((s) => {
          const full = subjects.find((x) => x.id === s.id)
          return (
            <div key={s.id} style={card}>
              <b style={{ fontSize: 16 }}>{s.name}</b>
              <p style={{ ...muted, margin: '6px 0' }}>
                Средняя оценка: {s.avg_grade_percent === null ? '—' : `${s.avg_grade_percent}%`} · Освоение: {pct(s.avg_mastery)}
              </p>
              {full?.topics.map((t) => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '6px 0' }}>
                  <span>{t.name}</span>
                  {t.subtopics.length > 0 && (
                    <button style={{ ...btn, padding: '4px 10px' }} onClick={() => onStart(t.id)}>Учиться</button>
                  )}
                </div>
              ))}
            </div>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
        <div>
          <div style={h2}>Требуют внимания</div>
          {overview.needs_attention.length === 0 && <p style={muted}>Пока нет данных. Пройдите диагностику.</p>}
          {overview.needs_attention.map((i) => (
            <div key={i.subtopic_id} style={card}>
              <b style={{ color: masteryColor(i.mastery) }}>{pct(i.mastery)}</b> · {i.name}
              <div style={muted}>{i.subject} / {i.topic}</div>
              {i.difficulties.length > 0 && <div style={{ ...muted, marginTop: 4 }}>Ошибки: {i.difficulties.join('; ')}</div>}
            </div>
          ))}
        </div>
        <div>
          <div style={h2}>Сильные стороны</div>
          {overview.strongest.length === 0 && <p style={muted}>Пока нет данных.</p>}
          {overview.strongest.map((i) => (
            <div key={i.subtopic_id} style={card}>
              <b style={{ color: masteryColor(i.mastery) }}>{pct(i.mastery)}</b> · {i.name}
              <div style={muted}>{i.subject} / {i.topic}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}