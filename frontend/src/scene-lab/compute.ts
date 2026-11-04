import * as phys from './physics'

export interface Point {
  t: number
  x: number
  y: number
  vx: number
  vy: number
  speed: number
}

export interface Computed {
  kind: 'projectile' | 'line'
  traj: Point[]
  current: Point
  horizon: number
  a: number
  g: number
  angleDeg: number
  h0: number
  summary: { range: number; maxHeight: number; apexT: number; apexX: number; flightTime: number }
}

export function horizonOf(templateId: string, p: Record<string, number>): number {
  if (templateId === 'projectile_motion') return phys.flightTime(p.v0, p.angle_deg, p.h0, p.g)
  return Math.max(10, p.time)
}

export function compute(templateId: string, p: Record<string, number>): Computed {
  if (templateId === 'projectile_motion') {
    const { v0, angle_deg: ang, h0, g, time } = p
    const traj = phys.projectileTrajectory(v0, ang, h0, g)
    const cur = phys.projectileState(v0, ang, h0, g, time)
    const s = phys.projectileSummary(v0, ang, h0, g)
    return {
      kind: 'projectile',
      traj,
      current: cur,
      horizon: s.flight_time,
      a: 0,
      g,
      angleDeg: ang,
      h0,
      summary: {
        range: s.range,
        maxHeight: s.max_height,
        apexT: Math.max(0, s.time_to_apex),
        apexX: s.vx * Math.max(0, s.time_to_apex),
        flightTime: s.flight_time,
      },
    }
  }
  const v0 = templateId === 'linear_motion' ? p.v : p.v0
  const a = templateId === 'linear_motion' ? 0 : p.a
  const horizon = horizonOf(templateId, p)
  const toPoint = (s: phys.LineState): Point => ({ t: s.t, x: s.x, y: 0, vx: s.v, vy: 0, speed: Math.abs(s.v) })
  const traj = phys.lineTrajectory(p.x0, v0, a, horizon).map(toPoint)
  const cur = toPoint(phys.uniformAcceleration(p.x0, v0, a, Math.min(p.time, horizon)))
  return {
    kind: 'line',
    traj,
    current: cur,
    horizon,
    a,
    g: 0,
    angleDeg: 0,
    h0: 0,
    summary: { range: 0, maxHeight: 0, apexT: 0, apexX: 0, flightTime: 0 },
  }
}

/** Подбирает масштаб, чтобы сцена всегда помещалась в кадр (метры -> единицы сцены). */
export function layout(c: Computed) {
  const xs = c.traj.map((p) => p.x)
  const xmin = Math.min(0, ...xs)
  const xmax = Math.max(0, ...xs)
  const ymax = Math.max(0, ...c.traj.map((p) => p.y))
  const span = Math.max(xmax - xmin, ymax * 1.6, 3)
  return { s: 30 / span, xc: (xmin + xmax) / 2, xmin, xmax, ymax }
}

export function niceStep(range: number): number {
  const raw = range / 6
  const pow = 10 ** Math.floor(Math.log10(raw))
  const f = raw / pow
  return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * pow
}