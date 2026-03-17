import { Canvas } from '@react-three/fiber'
import { Grid, Html, OrbitControls, useGLTF } from '@react-three/drei'
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
  if (item.style === 'Wireframe') {
    return new THREE.MeshBasicMaterial({ ...common, wireframe: true })
  }
  if (item.style === 'Physical') {
    return new THREE.MeshPhysicalMaterial({ ...common, roughness: 0.65, metalness: 0.1, clearcoat: 0.2 })
  }
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
    if (withLocalAxes) {
      const helper = new THREE.AxesHelper(0.85)
      cloned.add(helper)
    }
    return cloned
  }, [gltf.scene, item, withLocalAxes])

  return <primitive object={scene} scale={1.1} position={offset} />
}

function AnatomyModel({ selectedMp, selectedVo, manifest }: Props & { manifest: ManifestItem[] }) {
  const mandibleX = (selectedMp - 50) * 0.035
  const biteOpen = (selectedVo - 3) * 0.08
  const jawOffset = useMemo(() => [mandibleX, -biteOpen, 0] as [number, number, number], [mandibleX, biteOpen])

  return (
    <group>
      {manifest.map((item) => {
        const isMandibleGroup = item.file.includes('mandible') || item.file.includes('teeth_lower')
        const offset: [number, number, number] = isMandibleGroup ? jawOffset : [0, 0, 0]
        return <ModelPart key={item.file} item={item} offset={offset} withLocalAxes={item.file.includes('mandible')} />
      })}

      <axesHelper args={[1.4]} />
      <Html position={[0, 2.6, 0]} center>
        <div className="scene-badge">MP {selectedMp.toFixed(1)}% · VO {selectedVo.toFixed(2)} mm · 含全局/下颌局部坐标系</div>
      </Html>
    </group>
  )
}

export default function AnatomyScene({ selectedMp, selectedVo }: Props) {
  const [manifest, setManifest] = useState<ManifestItem[]>([])

  useEffect(() => {
    fetch('/models/manifest.json').then((res) => res.json()).then((data) => {
      setManifest(data.files ?? [])
    })
  }, [])

  return (
    <div className="scene-wrap">
      <Canvas camera={{ position: [0, 2.8, 7.5], fov: 45 }} shadows>
        <ambientLight intensity={0.9} />
        <directionalLight position={[4, 8, 5]} intensity={1.1} castShadow />
        <directionalLight position={[-5, 4, -5]} intensity={0.45} />
        <Suspense fallback={null}>
          {manifest.length > 0 ? <AnatomyModel selectedMp={selectedMp} selectedVo={selectedVo} manifest={manifest} /> : null}
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
