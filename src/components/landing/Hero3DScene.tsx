'use client'

import { Canvas, useFrame, extend } from '@react-three/fiber'
import { Stars, shaderMaterial } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

// Grid shader — lignes horizontales défilantes (orange route) + perspective verticales (bleu voyage)
// Inspiration : Tesla dashboard + cockpit moto nuit. Zéro modèle 3D importé = bundle mini.
const GridRoadMaterial = shaderMaterial(
  {
    uTime: 0,
    uColorWarm: new THREE.Color('#F97316'),
    uColorCool: new THREE.Color('#0EA5E9'),
    uFade: 28.0,
  },
  /* vert */ `
    varying vec2 vUv;
    varying vec3 vWorldPos;
    void main() {
      vUv = uv;
      vec4 world = modelMatrix * vec4(position, 1.0);
      vWorldPos = world.xyz;
      gl_Position = projectionMatrix * viewMatrix * world;
    }
  `,
  /* frag */ `
    precision mediump float;
    varying vec2 vUv;
    varying vec3 vWorldPos;
    uniform float uTime;
    uniform vec3 uColorWarm;
    uniform vec3 uColorCool;
    uniform float uFade;

    // soft line at position p in [0..1], width w
    float line(float p, float w) {
      return smoothstep(w, 0.0, abs(p));
    }

    void main() {
      // scroll V toward viewer at 1.2 units/s — ligne horizontale apparaît depuis l'horizon
      float scrolledV = fract(vUv.y * 10.0 - uTime * 0.6);
      float horiz = line(scrolledV - 0.5, 0.02);

      // lignes verticales statiques, density variable selon distance
      float verticalDensity = mix(6.0, 14.0, smoothstep(0.0, 1.0, vUv.y));
      float u = fract(vUv.x * verticalDensity - 0.5);
      float vert = line(u - 0.5, 0.015);

      // fade distance (horizon noir)
      float distance = length(vWorldPos.xz);
      float fade = 1.0 - smoothstep(5.0, uFade, distance);

      // mix couleurs : horizontales = warm orange, verticales = cool cyan
      vec3 colorH = uColorWarm * horiz * 1.4;
      vec3 colorV = uColorCool * vert * 0.9;
      vec3 finalColor = colorH + colorV;

      // glow diffus au loin (halo doux orange)
      float horizonGlow = smoothstep(0.6, 1.0, vUv.y) * 0.25;
      finalColor += uColorWarm * horizonGlow;

      float alpha = (horiz + vert * 0.7 + horizonGlow) * fade;
      if (alpha < 0.005) discard;
      gl_FragColor = vec4(finalColor, alpha);
    }
  `,
)

extend({ GridRoadMaterial })

declare module '@react-three/fiber' {
  interface ThreeElements {
    gridRoadMaterial: ThreeElements['shaderMaterial'] & {
      uTime?: number
    }
  }
}

function GridRoad() {
  const matRef = useRef<THREE.ShaderMaterial & { uTime: number }>(null)
  useFrame((state) => {
    if (matRef.current) matRef.current.uTime = state.clock.elapsedTime
  })
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, -12]}>
      <planeGeometry args={[40, 60, 1, 1]} />
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <gridRoadMaterial ref={matRef as any} transparent depthWrite={false} />
    </mesh>
  )
}

function Horizon() {
  // disque subtil orange au fond pour évoquer un lever de soleil — renforce la composition
  return (
    <mesh position={[0, 0.2, -22]}>
      <circleGeometry args={[6, 64]} />
      <meshBasicMaterial color="#F97316" transparent opacity={0.08} />
    </mesh>
  )
}

export default function Hero3DScene() {
  const dpr = useMemo<[number, number]>(() => [1, 1.5], [])
  return (
    <Canvas
      dpr={dpr}
      camera={{ position: [0, 0.6, 0.1], fov: 60, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={['#03040a']} />
      <fog attach="fog" args={['#03040a', 8, 24]} />
      <ambientLight intensity={0.15} />
      <directionalLight position={[3, 2, -5]} intensity={1.0} color="#F97316" />
      <directionalLight position={[-3, 2, 5]} intensity={0.5} color="#0EA5E9" />
      <Stars radius={80} depth={40} count={800} factor={2} saturation={0} fade speed={0.4} />
      <Horizon />
      <GridRoad />
    </Canvas>
  )
}
