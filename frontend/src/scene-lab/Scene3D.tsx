import type { CSSProperties } from 'react'
import { Canvas } from '@react-three/fiber'
import { Html, Line, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { layout, niceStep } from './compute'
import type { Computed } from './compute'
import { ObjectMesh } from './objects'
import type { SceneData } from './types'

type V3 = [number, number, number]
const TARGET: V3 = [0, 7, 0]
const CAMERA = { position: [0, 12, 32] as V3, fov: 50 }

const tag: CSSProperties = {
  color: '#e8ecf4',
  fontSize: 11,
  background: 'rgba(20,24,34,.75)',
  padding: '1px 5px',
  borderRadius: 4,
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
}

const fmt = (v: number) => String(Number(v.toFixed(2)))

function Arrow({ from, vec, color }: { from: V3; vec: V3; color: string }) {
  const v = new THREE.Vector3(...vec)
  const len = v.length()
  if (len < 1e-6) return null
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.clone().normalize())
  const head = Math.min(0.5, len * 0.4)
  const shaft = len - head
  return (
    <group position={from} quaternion={q}>
      <mesh position={[0, shaft / 2, 0]}>
        <cylinderGeometry args={[0.07, 0.07, shaft, 12]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, shaft + head / 2, 0]}>
        <coneGeometry args={[0.2, head, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  )
}

interface Props {
  scene: SceneData
  comp: Computed
  enabled: Set<string>
}

export default function Scene3D({ scene, comp, enabled }: Props) {
  const lay = layout(comp)
  const px = (x: number) => (x - lay.xc) * lay.s
  const P = (x: number, y: number): V3 => [px(x), y * lay.s, 0]
  const has = (id: string) => enabled.has(id)
  const cur = comp.current
  const pos = P(cur.x, cur.y)
  const mid: V3 = [pos[0], pos[1] + 0.5, 0]

  const vmax = Math.max(...comp.traj.map((p) => p.speed), 1e-9)
  const kv = 6 / vmax
  const ka = 0.4
  const proj = comp.kind === 'projectile'

  const path = comp.traj.map((p) => P(p.x, p.y))
  const xStep = niceStep(lay.xmax - lay.xmin || 3)
  const xTicks: number[] = []
  for (let v = Math.ceil(lay.xmin / xStep) * xStep; v <= lay.xmax + 1e-9; v += xStep) xTicks.push(Number(v.toFixed(6)))
  const yStep = niceStep(lay.ymax || 3)
  const yTicks: number[] = []
  if (proj) for (let v = yStep; v <= lay.ymax + 1e-9; v += yStep) yTicks.push(Number(v.toFixed(6)))
  const x0w = px(0)

  const arc: V3[] = []
  if (has('angle_indicator') && proj) {
    const o = P(0, comp.h0)
    for (let i = 0; i <= 24; i++) {
      const a = ((comp.angleDeg * Math.PI) / 180) * (i / 24)
      arc.push([o[0] + 3 * Math.cos(a), o[1] + 3 * Math.sin(a), 0])
    }
  }
  const sm = comp.summary
  const apex = P(sm.apexX, sm.maxHeight)
  const startX = px(comp.traj[0].x)

  return (
    <Canvas camera={CAMERA} style={{ width: '100%', height: '100%' }}>
      <color attach="background" args={['#0b0f16']} />
      <ambientLight intensity={0.8} />
      <directionalLight position={[8, 16, 12]} intensity={1.4} />
      <gridHelper args={[60, 60, '#2a3345', '#1a2130']} />

      {has('coordinate_axes') && (
        <group>
          <Line points={[[px(lay.xmin) - 1, 0, 0], [px(lay.xmax) + 1, 0, 0]]} color="#f87171" lineWidth={2} />
          {proj && <Line points={[[x0w, 0, 0], [x0w, lay.ymax * lay.s + 1, 0]]} color="#4ade80" lineWidth={2} />}
          {xTicks.map((v) => (
            <Html key={`x${v}`} position={[px(v), -0.7, 0]} center>
              <div style={tag}>{fmt(v)}</div>
            </Html>
          ))}
          {yTicks.map((v) => (
            <Html key={`y${v}`} position={[x0w - 1, v * lay.s, 0]} center>
              <div style={tag}>{fmt(v)}</div>
            </Html>
          ))}
          <Html position={[px(lay.xmax) + 1.8, 0.6, 0]} center>
            <div style={tag}>x, м</div>
          </Html>
          {proj && (
            <Html position={[x0w, lay.ymax * lay.s + 1.8, 0]} center>
              <div style={tag}>y, м</div>
            </Html>
          )}
        </group>
      )}

      {has('trajectory') && <Line points={path} color="#7dd3fc" lineWidth={2} />}

      <group position={pos} scale={scene.object.scale}>
        <ObjectMesh id={scene.object.id} />
      </group>

      {has('velocity_vector') && <Arrow from={mid} vec={[cur.vx * kv, cur.vy * kv, 0]} color="#22c55e" />}
      {has('velocity_components') && proj && (
        <>
          <Arrow from={mid} vec={[cur.vx * kv, 0, 0]} color="#60a5fa" />
          <Arrow from={mid} vec={[0, cur.vy * kv, 0]} color="#fb923c" />
        </>
      )}
      {has('acceleration_vector') &&
        (proj ? (
          <Arrow from={mid} vec={[0, -comp.g * ka, 0]} color="#ef4444" />
        ) : (
          <Arrow from={mid} vec={[comp.a * ka, 0, 0]} color="#ef4444" />
        ))}

      {arc.length > 1 && (
        <>
          <Line points={arc} color="#facc15" lineWidth={2} />
          <Html position={[arc[12][0] + 0.9, arc[12][1] + 0.4, 0]} center>
            <div style={tag}>α = {fmt(comp.angleDeg)}°</div>
          </Html>
        </>
      )}

      {has('measurement') && proj && (
        <>
          <Line points={[[px(0), -1.4, 0], [px(sm.range), -1.4, 0]]} color="#fbbf24" lineWidth={2} />
          <Html position={[(px(0) + px(sm.range)) / 2, -2.1, 0]} center>
            <div style={tag}>L = {fmt(sm.range)} м</div>
          </Html>
          <Line points={[[apex[0], 0, 0], apex]} color="#fbbf24" lineWidth={2} dashed dashSize={0.4} gapSize={0.3} />
          <Html position={[apex[0] + 1.6, apex[1] / 2, 0]} center>
            <div style={tag}>H = {fmt(sm.maxHeight)} м</div>
          </Html>
        </>
      )}
      {has('measurement') && !proj && (
        <>
          <Line points={[[startX, -1.4, 0], [pos[0], -1.4, 0]]} color="#fbbf24" lineWidth={2} />
          <Html position={[(startX + pos[0]) / 2, -2.1, 0]} center>
            <div style={tag}>Δx = {fmt(cur.x - comp.traj[0].x)} м</div>
          </Html>
        </>
      )}

      {has('labels') && (
        <Html position={[pos[0], pos[1] + 2.4, 0]} center>
          <div style={tag}>
            v = {fmt(proj ? cur.speed : cur.vx)} м/с · t = {fmt(cur.t)} с
          </div>
        </Html>
      )}

      <OrbitControls makeDefault target={TARGET} />
    </Canvas>
  )
}