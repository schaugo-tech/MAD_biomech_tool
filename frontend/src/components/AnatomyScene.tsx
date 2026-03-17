import { Canvas } from '@react-three/fiber'
import { Grid, Html, OrbitControls, useGLTF } from '@react-three/drei'
import { Suspense, useMemo } from 'react'

type Props = {
  selectedMp: number
  selectedVo: number
}

type AnatomyModelProps = Props & {
  showMuscle: boolean
}

function ModelPrimitive({ url, position = [0, 0, 0] as [number, number, number], scale = 1 }: { url: string, position?: [number, number, number], scale?: number }) {
  const gltf = useGLTF(url)
  return <primitive object={gltf.scene.clone()} position={position} scale={scale} />
}

function AnatomyModel({ selectedMp, selectedVo, showMuscle }: AnatomyModelProps) {
  const mandibleX = (selectedMp - 50) * 0.035
  const biteOpen = (selectedVo - 3) * 0.08

  const jawOffset = useMemo(() => [mandibleX, -biteOpen, 0] as [number, number, number], [mandibleX, biteOpen])

  return (
    <group>
      <ModelPrimitive url="/models/maxilla.glb" scale={1.1} />
      <group position={jawOffset}>
        <ModelPrimitive url="/models/mandible.glb" scale={1.1} />
        <ModelPrimitive url="/models/teeth_lower.glb" scale={1.1} />
      </group>
      <ModelPrimitive url="/models/teeth_upper.glb" scale={1.1} />
      {showMuscle ? (
        <>
          <ModelPrimitive url="/models/muscle_cheeks.glb" scale={1.1} />
          <ModelPrimitive url="/models/muscle_lip.glb" scale={1.1} />
          <ModelPrimitive url="/models/muscle_others.glb" scale={1.1} />
        </>
      ) : null}
      <Html position={[0, 2.5, 0]} center>
        <div className="scene-badge">MP {selectedMp.toFixed(1)}% · VO {selectedVo.toFixed(2)} mm</div>
      </Html>
    </group>
  )
}

export default function AnatomyScene({ selectedMp, selectedVo }: Props) {
  return (
    <div className="scene-wrap">
      <Canvas camera={{ position: [0, 2.8, 7.5], fov: 45 }}>
        <ambientLight intensity={1.0} />
        <directionalLight position={[4, 8, 5]} intensity={1.0} />
        <directionalLight position={[-5, 4, -5]} intensity={0.5} />
        <Suspense fallback={null}>
          <AnatomyModel selectedMp={selectedMp} selectedVo={selectedVo} showMuscle />
        </Suspense>
        <Grid args={[12, 12]} cellSize={0.8} cellThickness={0.5} sectionSize={2} sectionThickness={1} fadeDistance={18} />
        <OrbitControls makeDefault enablePan enableRotate enableZoom />
      </Canvas>
    </div>
  )
}

useGLTF.preload('/models/maxilla.glb')
useGLTF.preload('/models/mandible.glb')
useGLTF.preload('/models/teeth_upper.glb')
useGLTF.preload('/models/teeth_lower.glb')
useGLTF.preload('/models/muscle_cheeks.glb')
useGLTF.preload('/models/muscle_lip.glb')
useGLTF.preload('/models/muscle_others.glb')
