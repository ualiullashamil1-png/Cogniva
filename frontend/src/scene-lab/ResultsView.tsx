import { useEffect, useState } from 'react'
import { lessonResults } from './api'
import { accentCard, card, muted } from './theme'
import type { Outcome } from './types'

const STATUS: Record<string, [string, string]> = {
  improved: ['Улучшение', '#16a34a'],
  same: ['Без заметных изменений', '#64748b'],
  declined: ['Снижение', '#dc2626'],
  no_data: ['Мало данных для сравнения', '#d97706'],
}
const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`)
const frac = (s: { correct: number; total: number } | null) => (s ? `${s.correct} из ${s.total}` : '—')

function Bar({ label, value, color }: { label: string; value: number | null; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '3px 0' }}>
      <span style={{ width: 60, fontSize: 12, opacity: 0.7 }}>{label}</span>
      <div style={{ flex: 1, height: 10, borderRadius: 5, background: 'rgba(120,130,155,.25)' }}>
        <div style={{ height: 10, borderRadius: 5, width: `${Math.round((value ?? 0) * 100)}%`, background: color, transition: 'width .5s' }} />
      </div>
      <span style={{ width: 44, textAlign: 'right', fontSize: 13 }}>{pct(value)}</span>
    </div>
  )
}

export default function ResultsView({ lessonId }: { lessonId: number }) {
  const [out, setOut] = useState<Outcome | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    lessonResults(lessonId).then(setOut).catch((e) => setError((e as Error).message))
  }, [lessonId])

  if (error) return <p style={{ color: '#dc2626' }}>{error}</p>
  if (!out) return <p style={muted}>Загрузка…</p>
  return (
    <div style={{ maxWidth: 700 }}>
      <h3 style={{ margin: '0 0 10px' }}>Итоги урока</h3>
      <div style={card}>
        <Bar label="До урока" value={out.pre_score} color="#94a3b8" />
        <Bar label="После" value={out.post_score} color="#2563eb" />
        <div style={{ ...muted, marginTop: 6 }}>Доля верных ответов в диагностике и в итоговом тесте.</div>
        {!out.has_pre && <p style={{ color: '#d97706', margin: '6px 0 0' }}>Диагностики до урока не было, сравнивать не с чем.</p>}
      </div>
      {out.subtopics.map((s) => {
        const [label, color] = STATUS[s.status]
        return (
          <div key={s.key} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <b>{s.name}</b>
              <span style={{ color, fontWeight: 600, fontSize: 13 }}>{label}</span>
            </div>
            <Bar label="Освоение до" value={s.mastery_before} color="#94a3b8" />
            <Bar label="после" value={s.mastery_after} color={color} />
            <div style={muted}>Верных ответов: до {frac(s.pre)}, после {frac(s.post)}</div>
            {s.misconceptions.length > 0 && (
              <p style={{ margin: '6px 0 0' }}>Остались ошибки: {s.misconceptions.map((m) => m.label).join('; ')}</p>
            )}
          </div>
        )
      })}
      <div style={accentCard}><b>Что дальше:</b> {out.recommendation}</div>
      <p style={muted}>{out.caveat}</p>
    </div>
  )
}