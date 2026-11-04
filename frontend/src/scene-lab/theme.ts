import type { CSSProperties } from 'react'

const LINE = 'rgba(120,130,155,.32)'
const SOFT = 'rgba(120,130,155,.10)'

export const card: CSSProperties = {
  background: SOFT, border: `1px solid ${LINE}`, borderRadius: 12, padding: 14, marginBottom: 12,
}
export const accentCard: CSSProperties = { ...card, border: '1px solid #2563eb', background: 'rgba(37,99,235,.08)' }
export const noticeBox: CSSProperties = {
  ...card, background: 'rgba(251,191,36,.14)', border: '1px solid rgba(251,191,36,.55)', fontSize: 13,
}
export const muted: CSSProperties = { opacity: 0.7, fontSize: 13 }
export const inp: CSSProperties = {
  padding: '8px 10px', background: 'transparent', color: 'inherit', border: `1px solid ${LINE}`,
  borderRadius: 8, font: 'inherit',
}
export const btn: CSSProperties = {
  padding: '8px 16px', background: '#2563eb', color: '#fff', border: 0, borderRadius: 8,
  cursor: 'pointer', font: 'inherit', fontWeight: 600,
}
export const btnGray: CSSProperties = { ...btn, background: 'rgba(120,130,155,.25)', color: 'inherit', fontWeight: 500 }
export const btnGreen: CSSProperties = { ...btn, background: '#16a34a' }
export const badge = (color: string): CSSProperties => ({
  display: 'inline-block', padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
  background: `${color}22`, color, border: `1px solid ${color}66`,
})
export const LINE_COLOR = LINE