import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { buildScene, getCatalog, login } from './api'
import { compute, horizonOf } from './compute'
import Graphs from './Graphs'
import Scene3D from './Scene3D'
import type { Catalog, SceneData } from './types'

const C = {
  page: { display: 'flex', height: '100vh', background: '#0e1117', color: '#e8ecf4', fontFamily: 'system-ui, sans-serif', fontSize: 14 } as CSSProperties,
  side: { width: 290, padding: 16, overflowY: 'auto', background: '#151a23', boxSizing: 'border-box' } as CSSProperties,
  center: { flex: 1, position: 'relative' } as CSSProperties,
  h: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: '#8a94a8', margin: '18px 0 8px' } as CSSProperties,
  select: { width: '100%', padding: 6, background: '#0e1117', color: '#e8ecf4', border: '1px solid #2a3345', borderRadius: 6 } as CSSProperties,
  btn: { padding: '8px 14px', background: '#2563eb', color: '#fff', border: 0, borderRadius: 6, cursor: 'pointer' } as CSSProperties,
  notice: { background: '#3b2f0b', border: '1px solid #8a6d12', borderRadius: 6, padding: 8, marginBottom: 6, fontSize: 13 } as CSSProperties,
  muted: { color: '#8a94a8', fontSize: 12, margin: '4px 0' } as CSSProperties,
}

const fmt = (v: number) => v.toFixed(2)

export default function Lab() {
  const [user, setUser] = useState('alex')
  const [pass, setPass] = useState('demo12345')
  const [error, setError] = useState('')
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [scene, setScene] = useState<SceneData | null>(null)
  const [params, setParams] = useState<Record<string, number>>({})
  const [enabled, setEnabled] = useState<Set<string>>(new Set())
  const [playing, setPlaying] = useState(false)

  function applyScene(s: SceneData) {
    setScene(s)
    setParams({ ...s.parameters })
    setEnabled(new Set(s.components))
    setPlaying(false)
  }

  async function doLogin() {
    try {
      setError('')
      await login(user, pass)
      const c = await getCatalog()
      setCatalog(c)
      const tpl = c.templates.find((t) => t.id === 'projectile_motion')
      applyScene(
        await buildScene({
          template_id: 'projectile_motion',
          entities: [{ role: 'moving_object', asset_id: 'ball' }],
          components: tpl?.components ?? [],
        }),
      )
    } catch (e) {
      setError((e as Error).message)
    }
  }

  /** Смена шаблона или объекта идёт через сервер: он проверяет и подменяет несовместимое. */
  async function rebuild(templateId: string, objectId: string) {
    if (!scene || !catalog) return
    try {
      setError('')
      const sameTemplate = templateId === scene.template_id
      const tpl = catalog.templates.find((t) => t.id === templateId)
      applyScene(
        await buildScene({
          template_id: templateId,
          entities: [{ role: 'moving_object', asset_id: objectId }],
          components: sameTemplate ? Array.from(enabled) : (tpl?.components ?? []),
          parameters: sameTemplate ? params : {},
        }),
      )
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const comp = useMemo(() => (scene ? compute(scene.template_id, params) : null), [scene, params])

  useEffect(() => {
    if (!playing || !scene) return
    let raf = 0
    let last = performance.now()
    const step = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      setParams((p) => {
        const t = p.time + dt
        return { ...p, time: t > horizonOf(scene.template_id, p) ? 0 : t }
      })
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [playing, scene])

  if (!scene || !comp || !catalog) {
    return (
      <div style={{ ...C.page, alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 300 }}>
          <h2>Cogniva · 3D-лаборатория</h2>
          <input style={{ ...C.select, marginBottom: 8 }} value={user} onChange={(e) => setUser(e.target.value)} placeholder="логин" />
          <input style={{ ...C.select, marginBottom: 12 }} type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="пароль" />
          <button style={C.btn} onClick={doLogin}>Войти</button>
          {error && <p style={{ color: '#f87171' }}>{error}</p>}
        </div>
      </div>
    )
  }

  const tpl = catalog.templates.find((t) => t.id === scene.template_id)
  const proj = comp.kind === 'projectile'
  const cur = comp.current
  const toggle = (id: string) =>
    setEnabled((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  return (
    <div style={C.page}>
      <div style={C.side}>
        <h3 style={{ margin: 0 }}>{scene.title}</h3>
        <p style={C.muted}>Модель: {scene.physics_model}</p>

        <div style={C.h}>Сцена</div>
        <select style={C.select} value={scene.template_id} onChange={(e) => rebuild(e.target.value, scene.object.id)}>
          {catalog.templates.map((t) => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </select>

        <div style={C.h}>Объект</div>
        <select style={C.select} value={scene.object.id} onChange={(e) => rebuild(scene.template_id, e.target.value)}>
          {catalog.objects.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}{o.templates.includes(scene.template_id) ? '' : ' (не подходит)'}
            </option>
          ))}
        </select>

        <div style={C.h}>Компоненты</div>
        {catalog.components
          .filter((c) => tpl?.components.includes(c.id))
          .map((c) => (
            <label key={c.id} style={{ display: 'block', margin: '3px 0' }}>
              <input type="checkbox" checked={enabled.has(c.id)} onChange={() => toggle(c.id)} /> {c.label}
            </label>
          ))}

        {scene.notices.length > 0 && <div style={C.h}>Пояснения</div>}
        {scene.notices.map((n, i) => (
          <div key={i} style={C.notice}>{n}</div>
        ))}

        <div style={C.h}>Допущения модели</div>
        {[...scene.restrictions, ...(scene.physics.assumptions ?? [])].map((r, i) => (
          <p key={i} style={C.muted}>• {r}</p>
        ))}
        {error && <p style={{ color: '#f87171' }}>{error}</p>}
      </div>

      <div style={C.center}>
        <Scene3D scene={scene} comp={comp} enabled={enabled} />
        {!proj && (
          <Graphs traj={comp.traj} cur={cur} showX={enabled.has('graph_xt')} showV={enabled.has('graph_vt')} />
        )}
      </div>

      <div style={{ ...C.side, borderLeft: '1px solid #232a38' }}>
        <div style={{ ...C.h, marginTop: 0 }}>Параметры</div>
        {scene.parameter_specs.map((p) => {
          const max = p.key === 'time' && proj ? Math.max(comp.horizon, 0.1) : p.max
          const value = Math.min(params[p.key], max)
          return (
            <div key={p.key} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{p.label}</span>
                <b>{Number(value.toFixed(2))} {p.unit}</b>
              </div>
              <input
                type="range"
                style={{ width: '100%' }}
                min={p.min}
                max={max}
                step={p.step}
                value={value}
                onChange={(e) => setParams({ ...params, [p.key]: Number(e.target.value) })}
              />
            </div>
          )
        })}
        <button style={C.btn} onClick={() => setPlaying((v) => !v)}>
          {playing ? 'Пауза' : '▶ Запустить'}
        </button>

        <div style={C.h}>Сейчас</div>
        <p style={C.muted}>t = {fmt(cur.t)} с</p>
        <p style={C.muted}>x = {fmt(cur.x)} м{proj ? `, y = ${fmt(cur.y)} м` : ''}</p>
        {proj ? (
          <>
            <p style={C.muted}>vx = {fmt(cur.vx)} м/с, vy = {fmt(cur.vy)} м/с</p>
            <p style={C.muted}>|v| = {fmt(cur.speed)} м/с</p>
            <div style={C.h}>Итоги броска</div>
            <p style={C.muted}>Время полёта: {fmt(comp.summary.flightTime)} с</p>
            <p style={C.muted}>Наибольшая высота: {fmt(comp.summary.maxHeight)} м</p>
            <p style={C.muted}>Дальность: {fmt(comp.summary.range)} м</p>
          </>
        ) : (
          <p style={C.muted}>v = {fmt(cur.vx)} м/с, a = {fmt(comp.a)} м/с²</p>
        )}
      </div>
    </div>
  )
}