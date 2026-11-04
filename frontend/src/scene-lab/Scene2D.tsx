import { layout, niceStep } from './compute'
import type { Computed } from './compute'
import type { SceneData } from './types'

// Спокойная палитра (в духе PhET): все цвета сцены в одном месте
const C = {
  skyTop: '#dbeafe', skyBottom: '#f0f7ff', ground: '#9fd3a8', groundLine: '#6fae7b',
  axis: '#64748b', grid: '#c7d7ee', text: '#334155', trajectory: '#7c6cf0',
  velocity: '#2f9e6b', vx: '#3b82f6', vy: '#f59e0b', accel: '#e2574c',
  angle: '#b8860b', measure: '#64748b', object: '#2864f0',
}

interface Props { scene: SceneData; comp: Computed; enabled: Set<string> }

const W = 800, H = 420, PL = 56, PR = 36, PT = 34, PB = 56
const fmt = (v: number) => String(Number(v.toFixed(2)))

function Arrow({ x, y, dx, dy, color }: { x: number; y: number; dx: number; dy: number; color: string }) {
  const len = Math.hypot(dx, dy)
  if (len < 2) return null
  const ux = dx / len, uy = dy / len
  const hl = Math.min(10, len * 0.4)
  const ex = x + dx, ey = y + dy
  const bx = ex - ux * hl, by = ey - uy * hl
  return (
    <g>
      <line x1={x} y1={y} x2={bx} y2={by} stroke={color} strokeWidth={3} strokeLinecap="round" />
      <polygon points={`${ex},${ey} ${bx - uy * hl * 0.45},${by + ux * hl * 0.45} ${bx + uy * hl * 0.45},${by - ux * hl * 0.45}`} fill={color} />
    </g>
  )
}

export default function Scene2D({ scene, comp, enabled }: Props) {
  const lay = layout(comp)
  const has = (id: string) => enabled.has(id)
  const proj = comp.kind === 'projectile'
  const cur = comp.current
  const sm = comp.summary

  const xrange = Math.max(lay.xmax - lay.xmin, 3)
  const yrange = proj ? Math.max(lay.ymax * 1.15, 1) : xrange * 0.25
  const s = Math.min((W - PL - PR) / xrange, (H - PT - PB) / yrange)
  const X = (x: number) => PL + (x - lay.xmin) * s
  const gy = H - PB
  const Y = (y: number) => gy - y * s

  const r = 9
  const cx = X(cur.x)
  const cy = Y(cur.y) - (proj ? 0 : r)

  const vmax = Math.max(...comp.traj.map((p) => p.speed), 1e-9)
  const kv = 90 / vmax
  const ka = 60 / Math.max(Math.abs(comp.g), Math.abs(comp.a), 1e-9)

  const path = comp.traj.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)},${(Y(p.y) - (proj ? 0 : r)).toFixed(1)}`).join(' ')

  const xStep = niceStep(xrange)
  const xTicks: number[] = []
  for (let v = Math.ceil(lay.xmin / xStep) * xStep; v <= lay.xmax + 1e-9; v += xStep) xTicks.push(Number(v.toFixed(6)))
  const yStep = niceStep(Math.max(lay.ymax, 3))
  const yTicks: number[] = []
  if (proj) for (let v = yStep; v <= lay.ymax + 1e-9; v += yStep) yTicks.push(Number(v.toFixed(6)))

  const ox = X(0), oy = Y(comp.h0), ar = 38
  const a = (comp.angleDeg * Math.PI) / 180
  const arcPath = `M${ox + ar},${oy} A${ar},${ar} 0 0 0 ${ox + ar * Math.cos(a)},${oy - ar * Math.sin(a)}`

  const t: React.CSSProperties = { fontSize: 12, fill: C.text, fontFamily: 'system-ui, sans-serif' }
  const round = ['sphere', 'ball'].includes(scene.object.id)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%', display: 'block' }} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="sky2d" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.skyTop} /><stop offset="1" stopColor={C.skyBottom} />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill="url(#sky2d)" />
      <rect x={0} y={gy} width={W} height={H - gy} fill={C.ground} />
      <line x1={0} x2={W} y1={gy} y2={gy} stroke={C.groundLine} strokeWidth={2} />

      {has('coordinate_axes') && (
        <g>
          {xTicks.map((v) => (
            <g key={`x${v}`}>
              <line x1={X(v)} x2={X(v)} y1={gy} y2={gy + 5} stroke={C.axis} />
              <text x={X(v)} y={gy + 18} textAnchor="middle" style={t}>{fmt(v)}</text>
            </g>
          ))}
          <text x={W - PR + 4} y={gy + 18} style={t}>x, м</text>
          {proj && <line x1={ox} x2={ox} y1={gy} y2={PT - 6} stroke={C.axis} strokeWidth={1.5} />}
          {proj && yTicks.map((v) => (
            <g key={`y${v}`}>
              <line x1={ox - 4} x2={ox + 4} y1={Y(v)} y2={Y(v)} stroke={C.axis} />
              <text x={ox - 8} y={Y(v) + 4} textAnchor="end" style={t}>{fmt(v)}</text>
            </g>
          ))}
          {proj && <text x={ox + 8} y={PT - 10} style={t}>y, м</text>}
        </g>
      )}

      {has('trajectory') && <path d={path} fill="none" stroke={C.trajectory} strokeWidth={2.5} strokeDasharray="6 5" />}

      {round
        ? <circle cx={cx} cy={cy} r={r} fill={C.object} stroke="#fff" strokeWidth={2} />
        : <rect x={cx - r * 1.3} y={cy - r} width={r * 2.6} height={r * 2} rx={4} fill={C.object} stroke="#fff" strokeWidth={2} />}

      {has('velocity_vector') && <Arrow x={cx} y={cy} dx={cur.vx * kv} dy={-cur.vy * kv} color={C.velocity} />}
      {has('velocity_components') && proj && (
        <g>
          <Arrow x={cx} y={cy} dx={cur.vx * kv} dy={0} color={C.vx} />
          <Arrow x={cx} y={cy} dx={0} dy={-cur.vy * kv} color={C.vy} />
        </g>
      )}
      {has('acceleration_vector') && (proj
        ? <Arrow x={cx} y={cy} dx={0} dy={comp.g * ka} color={C.accel} />
        : <Arrow x={cx} y={cy} dx={comp.a * ka} dy={0} color={C.accel} />)}

      {has('angle_indicator') && proj && (
        <g>
          <path d={arcPath} fill="none" stroke={C.angle} strokeWidth={2} />
          <text x={ox + ar + 8} y={oy - 6} style={t}>α = {fmt(comp.angleDeg)}°</text>
        </g>
      )}

      {has('measurement') && proj && (
        <g stroke={C.measure} strokeWidth={1.5}>
          <line x1={X(0)} x2={X(sm.range)} y1={gy + 30} y2={gy + 30} />
          <line x1={X(sm.apexX)} x2={X(sm.apexX)} y1={gy} y2={Y(sm.maxHeight)} strokeDasharray="4 4" />
          <text x={(X(0) + X(sm.range)) / 2} y={gy + 46} textAnchor="middle" style={{ ...t, stroke: 'none' }}>L = {fmt(sm.range)} м</text>
          <text x={X(sm.apexX) + 6} y={(gy + Y(sm.maxHeight)) / 2} style={{ ...t, stroke: 'none' }}>H = {fmt(sm.maxHeight)} м</text>
        </g>
      )}
      {has('measurement') && !proj && (
        <g stroke={C.measure} strokeWidth={1.5}>
          <line x1={X(comp.traj[0].x)} x2={cx} y1={gy + 30} y2={gy + 30} />
          <text x={(X(comp.traj[0].x) + cx) / 2} y={gy + 46} textAnchor="middle" style={{ ...t, stroke: 'none' }}>Δx = {fmt(cur.x - comp.traj[0].x)} м</text>
        </g>
      )}

      {has('labels') && (
        <text x={cx} y={cy - 22} textAnchor="middle" style={t}>
          v = {fmt(proj ? cur.speed : cur.vx)} м/с · t = {fmt(cur.t)} с
        </text>
      )}
    </svg>
  )
}