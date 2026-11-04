interface GraphProps {
  title: string
  unit: string
  pts: [number, number][]
  cur: [number, number]
}

function MiniGraph({ title, unit, pts, cur }: GraphProps) {
  const W = 230
  const H = 120
  const L = 38
  const B = 20
  const T = 18
  const R = 8
  const tMax = pts[pts.length - 1][0] || 1
  const vs = pts.map((p) => p[1])
  const lo = Math.min(0, ...vs)
  let hi = Math.max(0, ...vs)
  if (hi - lo < 1e-9) hi = lo + 1
  const X = (t: number) => L + (t / tMax) * (W - L - R)
  const Y = (v: number) => T + ((hi - v) / (hi - lo)) * (H - T - B)
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(' ')
  const txt = { fill: '#9aa4b8', fontSize: 9 }
  return (
    <svg width={W} height={H} style={{ background: 'rgba(15,19,28,.85)', borderRadius: 8 }}>
      <text x={L} y={11} style={{ ...txt, fill: '#e8ecf4', fontSize: 10 }}>
        {title}, {unit}
      </text>
      <line x1={L} x2={W - R} y1={Y(0)} y2={Y(0)} stroke="#2a3345" />
      <line x1={L} x2={L} y1={T} y2={H - B} stroke="#2a3345" />
      <path d={d} fill="none" stroke="#7dd3fc" strokeWidth={2} />
      <circle cx={X(cur[0])} cy={Y(cur[1])} r={4} fill="#facc15" />
      <text x={2} y={T + 8} style={txt}>{Number(hi.toFixed(1))}</text>
      <text x={2} y={H - B} style={txt}>{Number(lo.toFixed(1))}</text>
      <text x={W - R - 22} y={H - 5} style={txt}>t, с</text>
    </svg>
  )
}

export default function Graphs({ traj, cur, showX, showV }: {
  traj: { t: number; x: number; vx: number }[]
  cur: { t: number; x: number; vx: number }
  showX: boolean
  showV: boolean
}) {
  return (
    <div style={{ position: 'absolute', left: 12, bottom: 12, display: 'flex', gap: 8 }}>
      {showX && <MiniGraph title="x(t)" unit="м" pts={traj.map((p) => [p.t, p.x])} cur={[cur.t, cur.x]} />}
      {showV && <MiniGraph title="v(t)" unit="м/с" pts={traj.map((p) => [p.t, p.vx])} cur={[cur.t, cur.vx]} />}
    </div>
  )
}