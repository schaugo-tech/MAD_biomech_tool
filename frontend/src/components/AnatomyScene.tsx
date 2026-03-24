import { Canvas } from '@react-three/fiber'
import { ArcballControls, Bounds, GizmoHelper, GizmoViewcube, Grid, Html, useGLTF } from '@react-three/drei'
import { Suspense, useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'

type Props = {
  selectedMp: number
  selectedVo: number
}

type ManifestItem = {
  name: string
  file: string
  color: string
  style: 'Standard' | 'Wireframe' | 'Physical' | string
  opacity: number
}

function buildMaterial(item: ManifestItem) {
  const common = {
    color: new THREE.Color(item.color),
    transparent: item.opacity < 1,
    opacity: item.opacity,
  }
  if (item.style === 'Wireframe') return new THREE.MeshBasicMaterial({ ...common, wireframe: true })
  if (item.style === 'Physical') return new THREE.MeshPhysicalMaterial({ ...common, roughness: 0.65, metalness: 0.1, clearcoat: 0.2 })
  return new THREE.MeshStandardMaterial({ ...common, roughness: 0.7, metalness: 0.12 })
}

function ModelPart({ item, offset = [0, 0, 0], withLocalAxes = false }: { item: ManifestItem, offset?: [number, number, number], withLocalAxes?: boolean }) {
  const gltf = useGLTF(`/models/${item.file}`)
  const scene = useMemo(() => {
    const cloned = gltf.scene.clone(true)
    const mat = buildMaterial(item)
    cloned.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        ;(obj as THREE.Mesh).material = mat
        obj.castShadow = true
        obj.receiveShadow = true
      }
    })
    if (withLocalAxes) cloned.add(new THREE.AxesHelper(0.85))
    return cloned
  }, [gltf.scene, item, withLocalAxes])

  return <primitive object={scene} scale={1.1} position={offset} />
}

function AnatomyModel({ selectedMp, selectedVo, manifest }: Props & { manifest: ManifestItem[] }) {
  const mpShift = (selectedMp - 50) * 0.038
  const voDrop = (selectedVo - 3) * 0.085
  // 按临床要求：MP 沿 y 轴向右，VO 沿 z 轴向下
  const jawOffset = useMemo(() => [0, mpShift, -voDrop] as [number, number, number], [mpShift, voDrop])

  return (
    <group>
      {manifest.map((item) => {
        const isMandibleGroup = item.file.includes('mandible') || item.file.includes('teeth_lower')
        const offset: [number, number, number] = isMandibleGroup ? jawOffset : [0, 0, 0]
        return <ModelPart key={item.file} item={item} offset={offset} withLocalAxes={item.file.includes('mandible')} />
      })}
      <axesHelper args={[1.4]} />
      <Html position={[0, 2.6, 0]} center>
        <div className="scene-badge">推荐位姿：MP {selectedMp.toFixed(1)}% · VO {selectedVo.toFixed(2)} mm</div>
      </Html>
    </group>
  )
}

export default function AnatomyScene({ selectedMp, selectedVo }: Props) {
  const [manifest, setManifest] = useState<ManifestItem[]>([])

  useEffect(() => {
    fetch('/models/manifest.json').then((res) => res.json()).then((data) => setManifest(data.files ?? []))
  }, [])

  return (
    <div className="scene-wrap scene-wrap--bright">
      <Canvas orthographic camera={{ position: [8, 6, 8], zoom: 85 }} shadows gl={{ antialias: true }} dpr={[1, 2]}>
        <color attach="background" args={["#f3f8ff"]} />
        <hemisphereLight intensity={0.95} color="#ffffff" groundColor="#9db8dd" />
        <ambientLight intensity={1.15} />
        <directionalLight position={[8, 12, 8]} intensity={1.35} castShadow />
        <directionalLight position={[-7, 7, -8]} intensity={0.85} />
        <pointLight position={[0, 6, 3]} intensity={0.55} />

        <Suspense fallback={null}>
          {manifest.length > 0 ? (
            <Bounds fit clip observe margin={1.18}>
              <AnatomyModel selectedMp={selectedMp} selectedVo={selectedVo} manifest={manifest} />
            </Bounds>
          ) : null}
        </Suspense>

        <Grid args={[12, 12]} cellSize={0.8} cellThickness={0.5} sectionSize={2} sectionThickness={1} fadeDistance={18} />
        <ArcballControls makeDefault enablePan enableRotate enableZoom />
        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewcube />
        </GizmoHelper>
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
