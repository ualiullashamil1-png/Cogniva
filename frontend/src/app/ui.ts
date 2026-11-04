import type { CSSProperties } from 'react'

export const page: CSSProperties = {
  minHeight: '100vh', background: '#0e1117', color: '#e8ecf4',
  fontFamily: 'system-ui, sans-serif', fontSize: 14,
}
export const inp: CSSProperties = {
  padding: 7, background: '#0e1117', color: '#e8ecf4', border: '1px solid #2a3345', borderRadius: 6,
}
export const btn: CSSProperties = {
  padding: '8px 14px', background: '#2563eb', color: '#fff', border: 0, borderRadius: 6, cursor: 'pointer',
}
export const btnGray: CSSProperties = { ...btn, background: '#334155' }
export const card: CSSProperties = { background: '#151a23', borderRadius: 10, padding: 14, marginBottom: 12 }
export const muted: CSSProperties = { color: '#8a94a8', fontSize: 13 }
export const h2: CSSProperties = { fontSize: 18, margin: '20px 0 10px' }

export const pct = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${Math.round(v * 100)}%`)
export const masteryColor = (v: number | null) =>
  v === null ? '#475569' : v < 0.6 ? '#f87171' : v < 0.75 ? '#fbbf24' : '#4ade80'