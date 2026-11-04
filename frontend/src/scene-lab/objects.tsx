const wheelRot: [number, number, number] = [Math.PI / 2, 0, 0]

function Wheel({ p, r = 0.2, w = 0.1 }: { p: [number, number, number]; r?: number; w?: number }) {
  return (
    <mesh position={p} rotation={wheelRot}>
      <cylinderGeometry args={[r, r, w, 20]} />
      <meshStandardMaterial color="#1b1f27" />
    </mesh>
  )
}

function Box({ p, s, c }: { p: [number, number, number]; s: [number, number, number]; c: string }) {
  return (
    <mesh position={p}>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} />
    </mesh>
  )
}

/** Начало координат объекта: центр основания (стоит на земле). Нос направлен вдоль +X. */
export function ObjectMesh({ id }: { id: string }) {
  switch (id) {
    case 'ball':
      return (
        <mesh position={[0, 0.45, 0]}>
          <sphereGeometry args={[0.45, 32, 24]} />
          <meshStandardMaterial color="#ff8a3d" />
        </mesh>
      )
    case 'cube':
      return <Box p={[0, 0.45, 0]} s={[0.9, 0.9, 0.9]} c="#a78bfa" />
    case 'cylinder':
      return (
        <mesh position={[0, 0.45, 0]}>
          <cylinderGeometry args={[0.4, 0.4, 0.9, 28]} />
          <meshStandardMaterial color="#34d399" />
        </mesh>
      )
    case 'pyramid':
      return (
        <mesh position={[0, 0.55, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[0.75, 1.1, 4]} />
          <meshStandardMaterial color="#fbbf24" />
        </mesh>
      )
    case 'minecart':
      return (
        <group>
          <Box p={[0, 0.55, 0]} s={[1.4, 0.5, 0.8]} c="#8b5e34" />
          <Box p={[0, 0.9, 0]} s={[1.5, 0.08, 0.9]} c="#5b3a1e" />
          {[-0.45, 0.45].flatMap((x) =>
            [-0.42, 0.42].map((z) => <Wheel key={`${x}${z}`} p={[x, 0.2, z]} />),
          )}
        </group>
      )
    case 'car':
      return (
        <group>
          <Box p={[0, 0.45, 0]} s={[1.8, 0.45, 0.8]} c="#e11d48" />
          <Box p={[-0.1, 0.85, 0]} s={[1.0, 0.4, 0.7]} c="#fda4af" />
          {[-0.6, 0.6].flatMap((x) =>
            [-0.42, 0.42].map((z) => <Wheel key={`${x}${z}`} p={[x, 0.22, z]} r={0.22} />),
          )}
        </group>
      )
    case 'train':
      return (
        <group>
          <Box p={[0.3, 0.6, 0]} s={[1.8, 0.8, 0.8]} c="#2563eb" />
          <Box p={[-0.7, 0.8, 0]} s={[0.8, 1.2, 0.85]} c="#1e3a8a" />
          <mesh position={[0.8, 1.2, 0]}>
            <cylinderGeometry args={[0.15, 0.2, 0.4, 16]} />
            <meshStandardMaterial color="#111827" />
          </mesh>
          {[-0.7, 0, 0.7].flatMap((x) =>
            [-0.42, 0.42].map((z) => <Wheel key={`${x}${z}`} p={[x, 0.2, z]} />),
          )}
        </group>
      )
    case 'rocket':
      return (
        <group position={[-0.8, 0.3, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <mesh position={[0, 0.55, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 1.1, 20]} />
            <meshStandardMaterial color="#e5e7eb" />
          </mesh>
          <mesh position={[0, 1.35, 0]}>
            <coneGeometry args={[0.22, 0.5, 20]} />
            <meshStandardMaterial color="#ef4444" />
          </mesh>
          <Box p={[0, 0.15, 0]} s={[0.7, 0.3, 0.05]} c="#ef4444" />
          <mesh position={[0, 0.15, 0]} rotation={[0, Math.PI / 2, 0]}>
            <boxGeometry args={[0.7, 0.3, 0.05]} />
            <meshStandardMaterial color="#ef4444" />
          </mesh>
        </group>
      )
    case 'human':
      return (
        <group>
          <Box p={[0, 1.0, 0]} s={[0.4, 0.7, 0.25]} c="#38bdf8" />
          <Box p={[-0.1, 0.33, 0]} s={[0.15, 0.66, 0.2]} c="#1e3a8a" />
          <Box p={[0.1, 0.33, 0]} s={[0.15, 0.66, 0.2]} c="#1e3a8a" />
          <mesh position={[0, 1.55, 0]}>
            <sphereGeometry args={[0.2, 20, 16]} />
            <meshStandardMaterial color="#fcd5b0" />
          </mesh>
        </group>
      )
    default: // sphere и всё неизвестное
      return (
        <mesh position={[0, 0.5, 0]}>
          <sphereGeometry args={[0.5, 32, 24]} />
          <meshStandardMaterial color="#4f8cff" />
        </mesh>
      )
  }
}