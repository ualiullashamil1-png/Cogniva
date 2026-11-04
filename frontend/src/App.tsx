import { useCallback, useEffect, useState } from 'react'
import { getOverview, getSubjects, hasToken, login, logout } from './scene-lab/api'
import type { Overview, SubjectNode } from './scene-lab/types'
import Dashboard from './app/Dashboard'
import Profile from './app/Profile'
import Workspace from './app/Workspace'
import { btn, btnGray, inp, muted, page } from './app/ui'

type Page = 'dashboard' | 'profile' | 'lesson'

function LoginForm({ onDone }: { onDone: () => void }) {
  const [user, setUser] = useState('alex')
  const [pass, setPass] = useState('demo12345')
  const [error, setError] = useState('')
  async function go() {
    try {
      setError('')
      await login(user, pass)
      onDone()
    } catch (e) {
      setError((e as Error).message)
    }
  }
  return (
    <div style={{ width: 300, margin: '100px auto' }}>
      <h2>Cogniva</h2>
      <p style={muted}>Адаптивная платформа обучения</p>
      <input style={{ ...inp, width: '100%', marginBottom: 8, boxSizing: 'border-box' }} value={user} onChange={(e) => setUser(e.target.value)} placeholder="логин" />
      <input style={{ ...inp, width: '100%', marginBottom: 12, boxSizing: 'border-box' }} type="password" value={pass}
        onChange={(e) => setPass(e.target.value)} placeholder="пароль" onKeyDown={(e) => e.key === 'Enter' && go()} />
      <button style={btn} onClick={go}>Войти</button>
      {error && <p style={{ color: '#f87171' }}>{error}</p>}
    </div>
  )
}

export default function App() {
  const [authed, setAuthed] = useState(hasToken())
  const [current, setCurrent] = useState<Page>('dashboard')
  const [overview, setOverview] = useState<Overview | null>(null)
  const [subjects, setSubjects] = useState<SubjectNode[]>([])
  const [topicId, setTopicId] = useState<number | null>(null)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    try {
      setError('')
      const [o, s] = await Promise.all([getOverview(), getSubjects()])
      setOverview(o)
      setSubjects(s)
    } catch (e) {
      setError((e as Error).message)
      if (!hasToken()) setAuthed(false)
    }
  }, [])

  useEffect(() => {
    if (authed) reload()
  }, [authed, reload])

  if (!authed) {
    return <div style={page}><LoginForm onDone={() => setAuthed(true)} /></div>
  }

  const go = (p: Page) => {
    setCurrent(p)
    if (p !== 'lesson') reload()          // на дашборде и в профиле показываем свежие данные
  }
  const topicName = subjects.flatMap((s) => s.topics).find((t) => t.id === topicId)?.name ?? 'Урок'

  return (
    <div style={page}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 16px', background: '#151a23', borderBottom: '1px solid #232a38' }}>
        <b style={{ marginRight: 16, fontSize: 16 }}>Cogniva</b>
        <button style={current === 'dashboard' ? btn : btnGray} onClick={() => go('dashboard')}>Дашборд</button>
        <button style={current === 'profile' ? btn : btnGray} onClick={() => go('profile')}>Профиль</button>
        <span style={{ flex: 1 }} />
        <button style={btnGray} onClick={() => { logout(); setAuthed(false) }}>Выйти</button>
      </div>
      <div style={{ padding: 16, maxWidth: 1280, margin: '0 auto' }}>
        {error && <p style={{ color: '#f87171' }}>{error}</p>}
        {!overview && !error && <p>Загрузка…</p>}
        {overview && current === 'dashboard' && (
          <Dashboard overview={overview} subjects={subjects} onStart={(id) => { setTopicId(id); setCurrent('lesson') }} />
        )}
        {overview && current === 'profile' && <Profile overview={overview} subjects={subjects} onChanged={reload} />}
        {current === 'lesson' && topicId !== null && (
          <Workspace key={topicId} topicId={topicId} topicName={topicName} onExit={() => go('dashboard')} />
        )}
      </div>
    </div>
  )
}