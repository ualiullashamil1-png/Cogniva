/** Зеркало backend/app/physics. Единицы СИ. Формулы должны совпадать с Python (это проверяет physics.test.ts). */

export interface Sample {
  t: number
  x: number
  y: number
  vx: number
  vy: number
  speed: number
  landed: boolean
}

export interface LineState {
  t: number
  x: number
  v: number
  a: number
}

export interface ProjectileSummary {
  vx: number
  vy0: number
  flight_time: number
  time_to_apex: number
  max_height: number
  range: number
  impact_speed: number
}

const rad = (d: number) => (d * Math.PI) / 180

export function components(v0: number, angleDeg: number): [number, number] {
  const r = rad(angleDeg)
  let vx = v0 * Math.cos(r)
  const vy = v0 * Math.sin(r)
  if (Math.abs(vx) < 1e-12) vx = 0
  return [vx, vy]
}

export function flightTime(v0: number, angleDeg: number, h0: number, g: number): number {
  const [, vy] = components(v0, angleDeg)
  return Math.max(0, (vy + Math.sqrt(vy * vy + 2 * g * h0)) / g)
}

export function projectileState(v0: number, angleDeg: number, h0: number, g: number, t: number): Sample {
  const total = flightTime(v0, angleDeg, h0, g)
  const [vx, vy0] = components(v0, angleDeg)
  const landed = t >= total
  const tt = landed ? total : Math.max(0, t)
  const y = landed ? 0 : Math.max(0, h0 + vy0 * tt - 0.5 * g * tt * tt)
  const vy = vy0 - g * tt
  return { t: tt, x: vx * tt, y, vx, vy, speed: Math.hypot(vx, vy), landed }
}

export function projectileTrajectory(v0: number, angleDeg: number, h0: number, g: number, steps = 100): Sample[] {
  const total = flightTime(v0, angleDeg, h0, g)
  return Array.from({ length: steps + 1 }, (_, i) => projectileState(v0, angleDeg, h0, g, (total * i) / steps))
}

export function projectileSummary(v0: number, angleDeg: number, h0: number, g: number): ProjectileSummary {
  const [vx, vy0] = components(v0, angleDeg)
  const T = flightTime(v0, angleDeg, h0, g)
  return {
    vx,
    vy0,
    flight_time: T,
    time_to_apex: vy0 / g,
    max_height: h0 + (vy0 * vy0) / (2 * g),
    range: vx * T,
    impact_speed: projectileState(v0, angleDeg, h0, g, T).speed,
  }
}

export function uniformAcceleration(x0: number, v0: number, a: number, t: number): LineState {
  return { t, x: x0 + v0 * t + 0.5 * a * t * t, v: v0 + a * t, a }
}

export function lineTrajectory(x0: number, v0: number, a: number, duration: number, steps = 100): LineState[] {
  return Array.from({ length: steps + 1 }, (_, i) => uniformAcceleration(x0, v0, a, (duration * i) / steps))
}