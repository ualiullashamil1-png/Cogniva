import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { addGrade, addSubject, addSubtopic, addTopic } from '../scene-lab/api'
import type { Overview, SubjectNode } from '../scene-lab/types'
import { btn, card, h2, inp, masteryColor, muted, pct } from './ui'

export default function Profile({ overview, subjects, onChanged }: {
  overview: Overview
  subjects: SubjectNode[]
  onChanged: () => void
}) {
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [gSubject, setGSubject] = useState('')
  const [gSub, setGSub] = useState('')
  const [score, setScore] = useState('')
  const [maxScore, setMaxScore] = useState('10')
  const [title, setTitle] = useState('')
  const [newSubject, setNewSubject] = useState('')
  const [tSubject, setTSubject] = useState('')
  const [newTopic, setNewTopic] = useState('')
  const [sTopic, setSTopic] = useState('')
  const [newSub, setNewSub] = useState('')
  const [newDesc, setNewDesc] = useState('')

  async function run(f: () => Promise<unknown>, done: string, reset: () => void) {
    try {
      setError('')
      setOk('')
      await f()
      reset()
      setOk(done)
      onChanged()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const subjectObj = subjects.find((s) => String(s.id) === gSubject)
  const allSubs = subjectObj?.topics.flatMap((t) => t.subtopics) ?? []
  const allTopics = subjects.flatMap((s) => s.topics.map((t) => ({ ...t, subject: s.name })))
  const chart = overview.grade_history.map((g, i) => ({ n: i + 1, percent: g.percent, title: g.title }))
  const gradeOk = gSubject !== '' && score !== '' && Number(score) >= 0 && Number(maxScore) > 0 && Number(score) <= Number(maxScore)

  return (
    <div>
      <h1 style={{ margin: '0 0 4px' }}>Профиль: {overview.student.display_name}</h1>
      <p style={muted}>
        Школьная оценка и освоение понятия хранятся отдельно: оценку вводите вы, освоение считает система по тестам.
      </p>

      <div style={h2}>Динамика оценок (в процентах)</div>
      <div style={{ ...card, height: 240 }}>
        {chart.length === 0 ? <p style={muted}>Оценок пока нет.</p> : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart}>
              <CartesianGrid stroke="#232a38" />
              <XAxis dataKey="n" stroke="#8a94a8" />
              <YAxis domain={[0, 100]} stroke="#8a94a8" />
              <Tooltip contentStyle={{ background: '#151a23', border: '1px solid #2a3345' }} />
              <Line type="monotone" dataKey="percent" stroke="#7dd3fc" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={h2}>Предметы, темы и освоение подтем</div>
      {subjects.map((s) => (
        <div key={s.id} style={card}>
          <b style={{ fontSize: 16 }}>{s.name}</b>
          {s.topics.map((t) => (
            <div key={t.id} style={{ marginTop: 10 }}>
              <div style={{ fontWeight: 600 }}>{t.name}</div>
              {t.subtopics.length === 0 && <div style={muted}>Подтем пока нет</div>}
              {t.subtopics.map((st) => (
                <div key={st.id} style={{ margin: '8px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{st.name}</span>
                    <b style={{ color: masteryColor(st.progress.mastery) }}>
                      {st.progress.assessed ? pct(st.progress.mastery) : 'не оценено'}
                    </b>
                  </div>
                  <div style={{ height: 6, background: '#232a38', borderRadius: 3 }}>
                    <div style={{ height: 6, borderRadius: 3, width: `${Math.round((st.progress.mastery ?? 0) * 100)}%`,
                      background: masteryColor(st.progress.mastery) }} />
                  </div>
                  {st.description && <div style={muted}>{st.description}</div>}
                  {st.progress.difficulties.length > 0 && (
                    <div style={muted}>Трудности: {st.progress.difficulties.join('; ')}</div>
                  )}
                  {st.progress.recommendation && <div style={muted}>{st.progress.recommendation}</div>}
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}

      <div style={h2}>Последние оценки</div>
      <div style={card}>
        {overview.recent_grades.length === 0 && <span style={muted}>Пока нет.</span>}
        {overview.recent_grades.map((g) => (
          <div key={g.id}>{g.title || 'Оценка'}: <b>{g.score} / {g.max_score}</b></div>
        ))}
      </div>

      {error && <p style={{ color: '#f87171' }}>{error}</p>}
      {ok && <p style={{ color: '#4ade80' }}>{ok}</p>}

      <div style={h2}>Добавить оценку</div>
      <div style={{ ...card, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <select style={inp} value={gSubject} onChange={(e) => { setGSubject(e.target.value); setGSub('') }}>
          <option value="">Предмет…</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select style={inp} value={gSub} onChange={(e) => setGSub(e.target.value)}>
          <option value="">Подтема (необязательно)</option>
          {allSubs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input style={{ ...inp, width: 70 }} placeholder="Оценка" value={score} onChange={(e) => setScore(e.target.value)} />
        <span style={{ alignSelf: 'center' }}>из</span>
        <input style={{ ...inp, width: 60 }} value={maxScore} onChange={(e) => setMaxScore(e.target.value)} />
        <input style={{ ...inp, flex: 1, minWidth: 140 }} placeholder="Название (контрольная…)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <button style={btn} disabled={!gradeOk}
          onClick={() => run(() => addGrade({ subject_id: Number(gSubject), subtopic_id: gSub ? Number(gSub) : null,
            score: Number(score), max_score: Number(maxScore), title: title || 'Оценка' }),
            'Оценка добавлена', () => { setScore(''); setTitle('') })}>
          Добавить
        </button>
      </div>

      <div style={h2}>Добавить предмет, тему или подтему</div>
      <div style={card}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <input style={inp} placeholder="Новый предмет" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} />
          <button style={btn} disabled={!newSubject.trim()}
            onClick={() => run(() => addSubject(newSubject.trim()), 'Предмет добавлен', () => setNewSubject(''))}>Добавить предмет</button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <select style={inp} value={tSubject} onChange={(e) => setTSubject(e.target.value)}>
            <option value="">Предмет…</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input style={inp} placeholder="Новая тема" value={newTopic} onChange={(e) => setNewTopic(e.target.value)} />
          <button style={btn} disabled={!tSubject || !newTopic.trim()}
            onClick={() => run(() => addTopic(Number(tSubject), newTopic.trim()), 'Тема добавлена', () => setNewTopic(''))}>Добавить тему</button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select style={inp} value={sTopic} onChange={(e) => setSTopic(e.target.value)}>
            <option value="">Тема…</option>
            {allTopics.map((t) => <option key={t.id} value={t.id}>{t.subject} / {t.name}</option>)}
          </select>
          <input style={inp} placeholder="Новая подтема" value={newSub} onChange={(e) => setNewSub(e.target.value)} />
          <input style={{ ...inp, flex: 1, minWidth: 160 }} placeholder="Описание" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
          <button style={btn} disabled={!sTopic || !newSub.trim()}
            onClick={() => run(() => addSubtopic(Number(sTopic), newSub.trim(), newDesc), 'Подтема добавлена',
              () => { setNewSub(''); setNewDesc('') })}>Добавить подтему</button>
        </div>
      </div>
    </div>
  )
}