import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Html } from '@react-three/drei'

const USE_PLACEHOLDER_MODELS = false

type Props = {
  selectedMp: number
  selectedVo: number
}

function PlaceholderAnatomy({ selectedMp, selectedVo }: Props) {
  const mandibleX = (selectedMp - 50) * 0.06
  const biteOpen = (selectedVo - 3) * 0.08

  return (
    <group>
      <mesh position={[0, 1.25, 0]}>
        <boxGeometry args={[4.3, 0.45, 2.1]} />
        <meshStandardMaterial color="#d6d7df" metalness={0.15} roughness={0.7} />
      </mesh>
      <mesh position={[mandibleX, -0.6 - biteOpen, 0]}>
        <boxGeometry args={[4.0, 0.42, 1.9]} />
        <meshStandardMaterial color="#9bb6ff" metalness={0.15} roughness={0.7} />
      </mesh>
      <mesh position={[-2.25, 0.15, 0]}>
        <sphereGeometry args={[0.38, 32, 32]} />
        <meshStandardMaterial color="#ffb98a" />
      </mesh>
      <mesh position={[2.25, 0.15, 0]}>
        <sphereGeometry args={[0.38, 32, 32]} />
        <meshStandardMaterial color="#ffb98a" />
      </mesh>
      <mesh position={[mandibleX * 0.85, -0.1 - biteOpen / 2, 0]}>
        <boxGeometry args={[4.2, 0.2, 2.2]} />
        <meshStandardMaterial color="#45c4a5" transparent opacity={0.6} />
      </mesh>
      <Html position={[0, 2.2, 0]} center>
        <div className="scene-badge">占位模型模式：后续可替换成 GLB 零件</div>
      </Html>
    </group>
  )
}

export default function AnatomyScene({ selectedMp, selectedVo }: Props) {
  return (
    <div className="scene-wrap">
      <Canvas camera={{ position: [0, 2.8, 7.5], fov: 45 }}>
        <ambientLight intensity={1.1} />
        <directionalLight position={[4, 8, 5]} intensity={1.1} />
        <directionalLight position={[-5, 4, -5]} intensity={0.6} />
        {USE_PLACEHOLDER_MODELS ? <PlaceholderAnatomy selectedMp={selectedMp} selectedVo={selectedVo} /> : null}
        <Grid args={[12, 12]} cellSize={0.8} cellThickness={0.5} sectionSize={2} sectionThickness={1} fadeDistance={18} />
        <OrbitControls makeDefault />
      </Canvas>
    </div>
  )
}
