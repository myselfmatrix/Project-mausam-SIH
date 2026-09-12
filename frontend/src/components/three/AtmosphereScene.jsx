import { Suspense, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import {
  CAMERA_FOV,
  CAMERA_Z,
  Clouds,
  Earth,
  Glow,
  Moon,
  Rig,
  SceneBoundary,
  Starfield,
  sceneDensity,
  supportsWebGL,
  useSceneEnv,
} from './globeParts'
// Scene styles live in styles/ui.css so the CSS fallback is available even
// before this lazily-loaded chunk arrives. The meshes themselves live in
// globeParts.jsx, shared with the opening sequence.

function CssFallback({ className }) {
  return <div className={`atmos-fallback ${className}`} aria-hidden="true" />
}

export default function AtmosphereScene({
  className = '',
  interactive = true,
  density = 'full',
}) {
  const [webgl] = useState(supportsWebGL)
  const { compact, reduced } = useSceneEnv()

  if (!webgl) return <CssFallback className={className} />

  const { detail, cloudDetail, starCount, glowScale } = sceneDensity(density, compact)

  return (
    <div className={`atmos-scene ${interactive ? 'is-interactive' : ''} ${className}`} aria-hidden="true">
      <SceneBoundary fallback={<CssFallback className={className} />}>
        <Canvas
          dpr={[1, compact ? 1.5 : 1.8]}
          camera={{ position: [0, 0, CAMERA_Z], fov: CAMERA_FOV }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          style={{ background: 'transparent' }}
        >
          <Rig interactive={interactive} reduced={reduced}>
            {/* Stars and halo need no textures, so they paint immediately and
                the hero is never an empty rectangle while the maps load. */}
            <Starfield count={starCount} reduced={reduced} />
            <Glow radius={1.16} power={3.0} strength={0.95} opacityScale={glowScale} />
            <Glow radius={1.42} power={4.4} strength={0.4} opacityScale={glowScale} />

            <Suspense fallback={null}>
              <Earth detail={detail} reduced={reduced} />
              <Clouds detail={cloudDetail} reduced={reduced} />
              <Moon reduced={reduced} />
            </Suspense>
          </Rig>
        </Canvas>
      </SceneBoundary>
    </div>
  )
}
