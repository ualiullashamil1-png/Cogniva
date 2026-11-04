import { useEffect, useState } from 'react'
import { aiStatus, sendMessage, startLesson } from './api'
import QuizPanel from './QuizPanel'
import ResultsView from './ResultsView'
import SceneWorkspace from './SceneWorkspace'
import { LINE_COLOR, accentCard, badge, btn, btnGray, btnGreen, card, inp, muted } from './theme'
import type { LessonData } from './types'

const QUICK: [string, string, string][] = [
  ['Проще', 'simpler', 'Объясни проще'],
  ['С формулами', 'math', 'Объясни с формулами'],
  ['Аналогия', 'analogy', 'Приведи аналогию'],
  ['Пример', 'example', 'Приведи ещё один пример'],
]

const APPROACH: Record<string, string> = {
  mathematical: 'Математика', visual: 'Наглядно', step_by_step: 'По шагам', analogy: 'Аналогия',
  interactive: 'Эксперимент', comparative: 'Сравнение', practical: 'Практика',
}

const STEPS = ['Диагностика', 'Урок', 'Итоговый тест', 'Итоги']

type View = 'home' | 'diagnostic' | 'lesson' | 'post' | 'results'
const STEP_OF: Record<View, number> = { home: 0, diagnostic: 0, lesson: 1, post: 2, results: 3 }

function Stepper({ current }: { current: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
      {STEPS.map((name, i) => {
        const done = i < current
        const now = i === current
        const bg = done ? '#16a34a' : now ? '#2563eb' : 'transparent'
        return (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 26, height: 26, borderRadius: '50%', display: 'grid', placeItems: 'center',
              fontSize: 13, fontWeight: 700, background: bg, color: done || now ? '#fff' : 'inherit',
              border: done || now ? 0 : `1px solid ${LINE_COLOR}`,
            }}>{done ? '✓' : i + 1}</span>
            <span style={{ fontWeight: now ? 700 : 400, opacity: now || done ? 1 : 0.6 }}>{name}</span>
            {i < STEPS.length - 1 && <span style={{ width: 24, height: 1, background: LINE_COLOR }} />}
          </div>
        )
      })}
    </div>
  )
}

export default function LessonPage({ topicId, onExit }: { embedded?: boolean; topicId?: number; onExit?: () => void }) {
  const [view, setView] = useState<View>('home')
  const [lesson, setLesson] = useState<LessonData | null>(null)
  const [aiMode, setAiMode] = useState<{ ai: boolean; label: string } | null>(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    aiStatus()
      .then((s) => setAiMode(s.mode === 'ai'
        ? { ai: true, label: `ИИ: ${s.provider}` }
        : { ai: false, label: 'Демо-режим: заготовленные ответы' }))
      .catch(() => setAiMode(null))
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

  if (topicId === undefined) return <p style={muted}>Выберите тему на странице «Учёба».</p>

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <Stepper current={STEP_OF[view]} />
        {aiMode && <span style={badge(aiMode.ai ? '#16a34a' : '#d97706')}>{aiMode.label}</span>}
      </div>
      {error && <p style={{ color: '#dc2626' }}>{error}</p>}

      {view === 'home' && (
        <div style={{ ...card, maxWidth: 640 }}>
          <h3 style={{ margin: '0 0 6px' }}>Как пройдёт занятие</h3>
          <p style={{ ...muted, margin: '0 0 14px' }}>
            Сначала короткая диагностика покажет, что вы уже знаете. По ней система выберет способ объяснения
            и подберёт 3D-сцену. В конце итоговый тест покажет, что изменилось.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button style={btn} onClick={() => setView('diagnostic')}>Пройти диагностику</button>
            <button style={btnGray} onClick={doStart} disabled={busy}>Пропустить и начать урок</button>
          </div>
        </div>
      )}

      {view === 'diagnostic' && <QuizPanel key="d" topicId={topicId} kind="diagnostic" onDone={doStart} />}
      {view === 'post' && <QuizPanel key="p" topicId={topicId} kind="post_lesson" onDone={() => setView('results')} />}

      {view === 'results' && lesson && (
        <div>
          <ResultsView lessonId={lesson.id} />
          <button style={btn} onClick={() => { if (onExit) onExit(); else { setLesson(null); setView('home') } }}>
            {onExit ? 'Готово' : 'Начать заново'}
          </button>
        </div>
      )}

      {view === 'lesson' && lesson && (
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 360px', maxWidth: 480, minWidth: 300 }}>
            {lesson.note && <div style={{ ...card, background: 'rgba(251,191,36,.14)' }}>{lesson.note}</div>}
            <div style={accentCard}>
              <b>Почему такой подход</b>
              <p style={{ margin: '6px 0 0' }}>{lesson.plan.rationale}</p>
            </div>
            {lesson.plan.steps.map((s, i) => (
              <div key={i} style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <b>{i + 1}. {s.title}</b>
                  <span style={badge('#2563eb')}>{APPROACH[s.approach] ?? s.approach}</span>
                </div>
                <p style={{ margin: '8px 0 0' }}>{s.content}</p>
              </div>
            ))}
            {lesson.plan.checkpoints.map((c, i) => (
              <div key={i} style={accentCard}><b>Проверьте себя:</b> {c.question}</div>
            ))}
            {lesson.messages.map((m, i) => (
              <div key={i} style={{
                ...card, marginLeft: m.role === 'user' ? 40 : 0, marginRight: m.role === 'user' ? 0 : 40,
                background: m.role === 'user' ? 'rgba(37,99,235,.14)' : 'rgba(120,130,155,.10)',
              }}>{m.content}</div>
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
            <button style={btnGreen} onClick={() => setView('post')}>Закончить урок: итоговый тест</button>
          </div>
          <div style={{ flex: '2 1 480px', minWidth: 320 }}>
            <SceneWorkspace scene={lesson.scene} />
          </div>
        </div>
      )}
    </div>
  )
}