import { describe, expect, it } from 'vitest'
import fixtures from './fixtures.json'
import { projectileState, projectileSummary, projectileTrajectory, uniformAcceleration } from './physics'

const near = (a: number, b: number) => expect(a).toBeCloseTo(b, 8)

describe('физика на TypeScript совпадает с Python', () => {
  it('файл с контрольными числами не пустой', () => {
    expect(fixtures.projectile.length).toBeGreaterThan(3)
    expect(fixtures.kinematics.length).toBeGreaterThan(5)
  })

  it('бросок: итоговые величины', () => {
    for (const c of fixtures.projectile) {
      const { v0, angle_deg, h0, g } = c.params
      const got = projectileSummary(v0, angle_deg, h0, g) as unknown as Record<string, number>
      const exp = c.summary as Record<string, number>
      expect(Object.keys(got).sort()).toEqual(Object.keys(exp).sort())
      for (const k of Object.keys(exp)) near(got[k], exp[k])
    }
  })

  it('бросок: состояние в разные моменты (в том числе после падения)', () => {
    for (const c of fixtures.projectile) {
      const { v0, angle_deg, h0, g } = c.params
      for (const st of c.states) {
        const got = projectileState(v0, angle_deg, h0, g, st.t_in)
        near(got.t, st.t)
        near(got.x, st.x)
        near(got.y, st.y)
        near(got.vx, st.vx)
        near(got.vy, st.vy)
        near(got.speed, st.speed)
        expect(got.landed).toBe(st.landed)
      }
    }
  })

  it('бросок: траектория заканчивается на земле', () => {
    const tr = projectileTrajectory(30, 30, 0, 10, 50)
    expect(tr).toHaveLength(51)
    expect(tr[0].y).toBe(0)
    expect(tr[50].y).toBe(0)
    expect(tr[50].landed).toBe(true)
  })

  it('равноускоренное движение', () => {
    for (const c of fixtures.kinematics) {
      const { x0, v0, a } = c.params
      const got = uniformAcceleration(x0, v0, a, c.t)
      near(got.x, c.expected.x)
      near(got.v, c.expected.v)
      near(got.a, c.expected.a)
      near(got.t, c.expected.t)
    }
  })
})