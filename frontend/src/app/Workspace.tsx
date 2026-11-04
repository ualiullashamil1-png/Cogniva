import { useEffect, useState } from 'react'
import { aiStatus, sendMessage, startLesson } from '../scene-lab/api'
import QuizPanel from '../scene-lab/QuizPanel'
import ResultsView from '../scene-lab/ResultsView'
import SceneWorkspace from '../scene-lab/SceneWorkspace'
import type { LessonData } from '../scene-lab/types'
import { btn, btnGray, card, inp, muted } from './ui'

const QUICK: [string, string, string][] = [
  ['Проще', 'simpler', 'Объясни проще'],
  ['С формулами', 'math', 'Объясни с формулами'],
  ['Аналогия', 'analogy', 'Приведи аналогию'],
  ['Пример', 'example', 'Приведи ещё один пример'],
]

type View = 'home' | 'diagnostic' | 'lesson' | 'post' | 'results'

export default function Workspace({ topicId, topicName, onExit }: { topicId: number; topicName: string; onExit: () => void }) {
  const [view, setView] = useState<View>('home')
  const [lesson, setLesson] = useState<LessonData | null>(null)
  const [aiMode, setAiMode] = useState('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    aiStatus()
      .then((s) => setAiMode(s.mode === 'ai' ? `ИИ: ${s.provider} (${s.model})` : 'ДЕМО-РЕЖИМ: заготовленные ответы, ИИ не подключён'))
      .catch(() => setAiMode(''))
  }, [])

  async function run<T>(f: () => Promise<T>): Promise<T | undefined> {
    try {
      setError('')
      setBusy(true)
      return await f()
    } catch (e) {
      setError((e as Error).message)
      return undefined
    } finally {
      setBusy(false)
    }
  }

  const doStart = async () => {
    const l = await run(() => startLesson(topicId))
    if (l) {
      setLesson(l)
      setView('lesson')
    }
  }

  async function send(t: string, intent: string) {
    if (!lesson || !t.trim()) return
    const r = await run(() => sendMessage(lesson.id, t, intent))
    if (r) {
      setLesson({
        ...lesson,
        messages: [...lesson.messages, { role: 'user', content: t }, { role: 'assistant', content: r.reply, mode: r.mode }],
      })
      setText('')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>{topicName}</h1>
        <span style={{ color: aiMode.startsWith('ДЕМО') ? '#fbbf24' : '#4ade80', fontSize: 13 }}>{aiMode}</span>
      </div>
      {error && <p style={{ color: '#f87171' }}>{error}</p>}

      {view === 'home' && (
        <div style={card}>
          <p style={muted}>Порядок: диагностика, урок, итоговый тест, итоги.</p>
          <button style={btn} onClick={() => setView('diagnostic')}>1. Пройти диагностику</button>{' '}
          <button style={btnGray} onClick={doStart} disabled={busy}>Пропустить и начать урок</button>
        </div>
      )}

      {view === 'diagnostic' && <QuizPanel key="d" topicId={topicId} kind="diagnostic" onDone={doStart} />}
      {view === 'post' && <QuizPanel key="p" topicId={topicId} kind="post_lesson" onDone={() => setView('results')} />}

      {view === 'results' && lesson && (
        <div>
          <ResultsView lessonId={lesson.id} />
          <button style={btn} onClick={onExit}>На дашборд</button>
        </div>
      )}

      {view === 'lesson' && lesson && (
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 380px', maxWidth: 520 }}>
            {lesson.note && <div style={{ ...card, background: '#3b2f0b' }}>{lesson.note}</div>}
            <div style={card}><b>Почему такой подход:</b> {lesson.plan.rationale}</div>
            {lesson.plan.steps.map((s, i) => (
              <div key={i} style={card}><b>{i + 1}. {s.title}</b><p style={{ margin: '6px 0 0' }}>{s.content}</p></div>
            ))}
            {lesson.plan.checkpoints.map((c, i) => (
              <div key={i} style={{ ...card, border: '1px solid #2563eb' }}><b>Проверьте себя:</b> {c.question}</div>
            ))}
            {lesson.messages.map((m, i) => (
              <div key={i} style={{ ...card, background: m.role === 'user' ? '#1e2a44' : '#151a23' }}>{m.content}</div>
            ))}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {QUICK.map(([label, intent, q]) => (
                <button key={intent} style={btnGray} disabled={busy} onClick={() => send(q, intent)}>{label}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              <input style={{ ...inp, flex: 1 }} value={text} placeholder="Задайте вопрос" onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send(text, 'free')} />
              <button style={btn} disabled={busy} onClick={() => send(text, 'free')}>Отправить</button>
            </div>
            <button style={{ ...btn, background: '#16a34a' }} onClick={() => setView('post')}>Закончить урок: итоговый тест</button>
          </div>
          <div style={{ flex: '2 1 480px', minWidth: 320 }}>
            <SceneWorkspace scene={lesson.scene} />
          </div>
        </div>
      )}
    </div>
  )
}