import { useEffect, useMemo, useState } from 'react'
import { compute, horizonOf } from './compute'
import Graphs from './Graphs'
import Scene3D from './Scene3D'
import { badge, muted, noticeBox } from './theme'
import type { SceneData } from './types'

const LABELS: Record<string, string> = {
  coordinate_axes: 'Оси координат', velocity_vector: 'Вектор скорости',
  velocity_components: 'Составляющие скорости', acceleration_vector: 'Вектор ускорения',
  trajectory: 'Траектория', labels: 'Подписи', measurement: 'Измерения',
  angle_indicator: 'Угол броска', graph_xt: 'График x(t)', graph_vt: 'График v(t)',
}
const fmt = (v: number) => v.toFixed(2)

/** Готовая сцена с сервера. Ползунки считаются локально: сервер и ИИ не нужны. */
export default function SceneWorkspace({ scene }: { scene: SceneData }) {
  const [params, setParams] = useState<Record<string, number>>({ ...scene.parameters })
  const [enabled, setEnabled] = useState<Set<string>>(new Set(scene.components))
  const [playing, setPlaying] = useState(false)
  const comp = useMemo(() => compute(scene.template_id, params), [scene, params])

  useEffect(() => {
    if (!playing) return
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <b style={{ fontSize: 16 }}>{scene.title}</b>
        <span style={badge('#2563eb')}>{scene.object.name}</span>
      </div>
      {scene.notices.map((n, i) => (
        <div key={i} style={{ ...noticeBox, marginBottom: 0 }}>{n}</div>
      ))}

      <div style={{ position: 'relative', height: 460, borderRadius: 14, overflow: 'hidden', background: '#0b0f16',
        border: '1px solid rgba(120,130,155,.35)' }}>
        <Scene3D scene={scene} comp={comp} enabled={enabled} />
        {!proj && <Graphs traj={comp.traj} cur={cur} showX={enabled.has('graph_xt')} showV={enabled.has('graph_vt')} />}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
        {scene.parameter_specs.map((p) => {
          const max = p.key === 'time' && proj ? Math.max(comp.horizon, 0.1) : p.max
          const value = Math.min(params[p.key], max)
          return (
            <div key={p.key}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{p.label}</span>
                <b>{Number(value.toFixed(2))} {p.unit}</b>
              </div>
              <input type="range" style={{ width: '100%' }} min={p.min} max={max} step={p.step} value={value}
                onChange={(e) => setParams({ ...params, [p.key]: Number(e.target.value) })} />
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => setPlaying((v) => !v)}
          style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 0, borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
          {playing ? 'Пауза' : '▶ Запустить'}
        </button>
        {scene.components.map((id) => (
          <label key={id}><input type="checkbox" checked={enabled.has(id)} onChange={() => toggle(id)} /> {LABELS[id] ?? id}</label>
        ))}
      </div>

      <div style={muted}>
        <div>t = {fmt(cur.t)} с · x = {fmt(cur.x)} м{proj ? ` · y = ${fmt(cur.y)} м` : ''}</div>
        {proj ? (
          <div>vx = {fmt(cur.vx)} · vy = {fmt(cur.vy)} · |v| = {fmt(cur.speed)} м/с · дальность {fmt(comp.summary.range)} м · высота {fmt(comp.summary.maxHeight)} м</div>
        ) : (
          <div>v = {fmt(cur.vx)} м/с · a = {fmt(comp.a)} м/с²</div>
        )}
        <div style={{ marginTop: 4 }}>Числа считает программа по формулам, а не ИИ. Ползунки работают без запросов к серверу.</div>
      </div>
    </div>
  )
}