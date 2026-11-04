import { useState } from 'react'
import { finishTest, startTest, submitAnswer } from './api'
import { btn, btnGray, card, inp, muted } from './theme'
import type { TestState } from './types'

/** Тест: диагностика до урока или итоговый после. Ответы проверяет сервер кодом, не ИИ. */
export default function QuizPanel({ topicId, kind, onDone }: {
  topicId: number
  kind: 'diagnostic' | 'post_lesson'
  onDone: () => void
}) {
  const [st, setSt] = useState<TestState | null>(null)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [finished, setFinished] = useState(false)

  async function run(f: () => Promise<void>) {
    try {
      setError('')
      setBusy(true)
      await f()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function finish(id: number) {
    await finishTest(id)
    setFinished(true)
  }

  const start = () => run(async () => setSt(await startTest(topicId, kind)))

  const send = () =>
    run(async () => {
      if (!st?.question || !value.trim()) return
      const next = await submitAnswer(st.test_id, st.question.id, value)
      setValue('')
      setSt(next)
      if (!next.question) await finish(next.test_id)
    })

  const title = kind === 'diagnostic' ? 'Диагностика перед уроком' : 'Итоговый тест после урока'
  const box = { ...card, maxWidth: 620 }

  if (finished) {
    return (
      <div style={box}>
        <h3 style={{ margin: '0 0 6px' }}>{title}: готово</h3>
        <p style={muted}>Ответы проверены, профиль обновлён.</p>
        <button style={btn} onClick={onDone}>Дальше</button>
      </div>
    )
  }
  if (!st) {
    return (
      <div style={box}>
        <h3 style={{ margin: '0 0 6px' }}>{title}</h3>
        <p style={{ ...muted, margin: '0 0 12px' }}>Несколько вопросов по теме. Ответы проверяются программой.</p>
        <button style={btn} onClick={start} disabled={busy}>Начать</button>
        {error && <p style={{ color: '#dc2626' }}>{error}</p>}
      </div>
    )
  }
  const q = st.question
  const progress = Math.round((st.answered / Math.max(st.total, 1)) * 100)
  return (
    <div style={box}>
      <h3 style={{ margin: '0 0 4px' }}>{title}</h3>
      <div style={{ ...muted, display: 'flex', justifyContent: 'space-between' }}>
        <span>Вопрос {Math.min(st.answered + 1, st.total)} из {st.total}</span>
        <span>{progress}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'rgba(120,130,155,.25)', margin: '6px 0 14px' }}>
        <div style={{ height: 6, borderRadius: 3, width: `${progress}%`, background: '#2563eb', transition: 'width .3s' }} />
      </div>
      {q && (
        <>
          <p style={{ fontSize: 16, margin: '0 0 10px' }}>{q.text}</p>
          {q.graph && (
            <p style={muted}>
              График {q.graph.y_label} от {q.graph.x_label}: прямая через точки {q.graph.points.map((p) => `(${p[0]}; ${p[1]})`).join(' и ')}
            </p>
          )}
          {q.qtype === 'choice' &&
            q.options.map((o, i) => (
              <label key={i} style={{
                display: 'block', margin: '6px 0', padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                border: `1px solid ${value === String(i) ? '#2563eb' : 'rgba(120,130,155,.32)'}`,
                background: value === String(i) ? 'rgba(37,99,235,.1)' : 'transparent',
              }}>
                <input type="radio" name="opt" checked={value === String(i)} onChange={() => setValue(String(i))} /> {o}
              </label>
            ))}
          {q.qtype === 'numeric' && (
            <div>
              <input style={{ ...inp, width: 140 }} value={value} onChange={(e) => setValue(e.target.value)} placeholder="число" />{' '}
              {q.unit}
            </div>
          )}
          {q.qtype === 'text' && (
            <textarea style={{ ...inp, width: '100%', minHeight: 90, boxSizing: 'border-box' }} value={value}
              onChange={(e) => setValue(e.target.value)} />
          )}
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button style={btn} onClick={send} disabled={busy || !value.trim()}>Ответить</button>
            {st.answered > 0 && (
              <button style={btnGray} disabled={busy} onClick={() => run(() => finish(st.test_id))}>Завершить досрочно</button>
            )}
          </div>
        </>
      )}
      {error && <p style={{ color: '#dc2626' }}>{error}</p>}
    </div>
  )
}