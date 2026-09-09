import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import {
  earthVertex,
  earthFragment,
  cloudsVertex,
  cloudsFragment,
  moonVertex,
  moonFragment,
  glowVertex,
  glowFragment,
} from './atmosphereShaders'
// Scene styles live in styles/ui.css so the CSS fallback is available even
// before this lazily-loaded chunk arrives.

const TEX = {
  day: '/textures/earth_atmos_2048.jpg',
  night: '/textures/earth_lights_2048.png',
  specular: '/textures/earth_specular_2048.jpg',
  normal: '/textures/earth_normal_2048.jpg',
  clouds: '/textures/earth_clouds_1024.png',
  moon: '/textures/moon_1024.jpg',
}

// View-space sun direction. The camera is fixed, so a constant here keeps the
// terminator parked where it looks best — sunlit face toward the viewer, city
// lights sweeping in from the left limb as the globe turns.
const SUN_DIR = new THREE.Vector3(0.78, 0.26, 0.38).normalize()
const ATMO_COLOR = new THREE.Color('#4ea6ff')

/* ------------------------------------------------------------------ */
/* Capability checks — the hero must never render as a blank box       */
/* ------------------------------------------------------------------ */

function supportsWebGL() {
  if (typeof window === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl2') || canvas.getContext('webgl')),
    )
  } catch {
    return false
  }
}

class SceneBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error) {
    // A driver-level shader failure or a missing texture shouldn't take the
    // page down with it.
    console.warn('Atmosphere scene unavailable, using CSS fallback:', error?.message)
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

/* ------------------------------------------------------------------ */
/* Earth                                                               */
/* ------------------------------------------------------------------ */

function Earth({ detail, reduced }) {
  const meshRef = useRef()
  const gl = useThree((s) => s.gl)

  const [day, night, specular, normal] = useLoader(THREE.TextureLoader, [
    TEX.day,
    TEX.night,
    TEX.specular,
    TEX.normal,
  ])

  const material = useMemo(() => {
    // Colour plates are authored in sRGB; the data plates (specular, normal)
    // must stay linear or the lighting maths goes wrong.
    day.colorSpace = THREE.SRGBColorSpace
    night.colorSpace = THREE.SRGBColorSpace
    specular.colorSpace = THREE.NoColorSpace
    normal.colorSpace = THREE.NoColorSpace

    const maxAniso = gl.capabilities.getMaxAnisotropy()
    for (const t of [day, night, specular, normal]) {
      t.anisotropy = maxAniso
      t.needsUpdate = true
    }

    return new THREE.ShaderMaterial({
      vertexShader: earthVertex,
      fragmentShader: earthFragment,
      uniforms: {
        uDay: { value: day },
        uNight: { value: night },
        uSpecular: { value: specular },
        uNormalMap: { value: normal },
        uSunDir: { value: SUN_DIR.clone() },
        uAtmoColor: { value: ATMO_COLOR.clone() },
        uNightBoost: { value: 2.4 },
      },
    })
  }, [day, night, specular, normal, gl])

  const geometry = useMemo(() => new THREE.SphereGeometry(1, detail, detail / 2), [detail])

  useEffect(() => () => {
    geometry.dispose()
    material.dispose()
  }, [geometry, material])

  useFrame((_, delta) => {
    if (!reduced && meshRef.current) meshRef.current.rotation.y += delta * 0.032
  })

  // ~23.4° axial tilt, because it reads as Earth rather than as a ball.
  return <mesh ref={meshRef} geometry={geometry} material={material} rotation={[0, 2.4, 0.41]} />
}

function Clouds({ detail, reduced }) {
  const meshRef = useRef()
  const clouds = useLoader(THREE.TextureLoader, TEX.clouds)

  const material = useMemo(() => {
    clouds.colorSpace = THREE.SRGBColorSpace
    clouds.needsUpdate = true
    return new THREE.ShaderMaterial({
      vertexShader: cloudsVertex,
      fragmentShader: cloudsFragment,
      uniforms: {
        uClouds: { value: clouds },
        uSunDir: { value: SUN_DIR.clone() },
        uOpacity: { value: 0.9 },
      },
      transparent: true,
      depthWrite: false,
    })
  }, [clouds])

  const geometry = useMemo(() => new THREE.SphereGeometry(1.012, detail, detail / 2), [detail])

  useEffect(() => () => {
    geometry.dispose()
    material.dispose()
  }, [geometry, material])

  // Slightly faster than the surface, so weather visibly drifts over the ground.
  useFrame((_, delta) => {
    if (!reduced && meshRef.current) meshRef.current.rotation.y += delta * 0.041
  })

  return <mesh ref={meshRef} geometry={geometry} material={material} rotation={[0, 2.4, 0.41]} />
}

function Glow({ radius, power, strength, opacityScale = 1 }) {
  const { geometry, material } = useMemo(() => {
    const geo = new THREE.SphereGeometry(radius, 64, 64)
    const mat = new THREE.ShaderMaterial({
      vertexShader: glowVertex,
      fragmentShader: glowFragment,
      uniforms: {
        uColor: { value: ATMO_COLOR.clone() },
        uPower: { value: power },
        uStrength: { value: strength * opacityScale },
      },
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    })
    return { geometry: geo, material: mat }
  }, [radius, power, strength, opacityScale])

  useEffect(() => () => {
    geometry.dispose()
    material.dispose()
  }, [geometry, material])

  return <mesh geometry={geometry} material={material} />
}

/*
  The Moon. There is deliberately no drawn orbit path — a track line reads as a
  diagram overlay pasted onto the scene rather than something physically in it;
  the motion alone communicates the orbit.

  Scale is not to life: at true distance the Moon sits sixty Earth-radii away
  and would be off-screen entirely. The camera also sits further back than
  Earth alone would need, because the Moon has to complete a lap without
  colliding with the navbar, the persona marquee or the headline column.
*/
/*
  Elliptical, not circular, and deliberately so.

  The scene canvas hangs off the right edge of the hero, so a circular orbit
  wide enough to clear Earth swings the Moon two ways it must not go: past the
  right edge of the viewport, and across the headline on the left. Narrowing the
  horizontal radius keeps the whole lap inside the right-hand column while the
  taller vertical radius gives it room to sweep above and below Earth.
*/
const MOON_ORBIT_X = 1.62
const MOON_ORBIT_Y = 1.48
const MOON_PERIOD = 46 // seconds per revolution

function Moon({ reduced }) {
  const moonRef = useRef()
  const map = useLoader(THREE.TextureLoader, TEX.moon)

  const { geometry, material } = useMemo(() => {
    map.colorSpace = THREE.SRGBColorSpace
    map.needsUpdate = true
    const geo = new THREE.SphereGeometry(0.21, 48, 24)
    const mat = new THREE.ShaderMaterial({
      vertexShader: moonVertex,
      fragmentShader: moonFragment,
      uniforms: {
        uMap: { value: map },
        uSunDir: { value: SUN_DIR.clone() },
      },
    })
    return { geometry: geo, material: mat }
  }, [map])

  useEffect(() => () => {
    geometry.dispose()
    material.dispose()
  }, [geometry, material])

  useFrame((state) => {
    if (reduced || !moonRef.current) return
    const t = (state.clock.elapsedTime / MOON_PERIOD) * Math.PI * 2
    // Described in the XY plane — across the screen rather than toward the
    // camera. An orbit in XZ would swing the Moon between 1.5 and 5.9 units of
    // camera distance and it would visibly balloon and shrink each lap; the
    // group's Y-tilt below supplies just enough depth to pass behind and in
    // front of Earth instead.
    moonRef.current.position.set(
      Math.cos(t) * MOON_ORBIT_X,
      Math.sin(t) * MOON_ORBIT_Y,
      0,
    )
    // Tidally locked: for an XY orbit the near face tracks by spinning about Z.
    moonRef.current.rotation.z = t
  })

  return (
    <group rotation={[0.22, 0.5, -0.15]}>
      <mesh
        ref={moonRef}
        geometry={geometry}
        material={material}
        position={[MOON_ORBIT_X, 0, 0]}
      />
    </group>
  )
}

function Starfield({ count, reduced }) {
  const ref = useRef()

  const points = useMemo(() => {
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      // Distribute through a shell so nothing spawns inside the planet.
      const radius = 2.6 + Math.random() * 4.4
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.75
      positions[i * 3 + 2] = radius * Math.cos(phi)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const mat = new THREE.PointsMaterial({
      color: new THREE.Color('#cfe4ff'),
      size: 0.017,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    return { geo, mat }
  }, [count])

  useEffect(() => () => {
    points.geo.dispose()
    points.mat.dispose()
  }, [points])

  useFrame((_, delta) => {
    if (!reduced && ref.current) {
      ref.current.rotation.y += delta * 0.012
      ref.current.rotation.x += delta * 0.004
    }
  })

  return <points ref={ref} geometry={points.geo} material={points.mat} />
}

/* Parallax: the whole system leans toward the cursor. Damped so it feels like
   mass moving, not a cursor-follower. */
function Rig({ children, interactive, reduced }) {
  const groupRef = useRef()
  const { pointer } = useThree()

  useFrame((_, delta) => {
    if (!groupRef.current) return
    const damp = 1 - Math.pow(0.001, delta)
    const targetY = interactive && !reduced ? pointer.x * 0.2 : 0
    const targetX = interactive && !reduced ? -pointer.y * 0.14 : 0
    groupRef.current.rotation.y += (targetY - groupRef.current.rotation.y) * damp
    groupRef.current.rotation.x += (targetX - groupRef.current.rotation.x) * damp
  })

  return <group ref={groupRef}>{children}</group>
}

/* ------------------------------------------------------------------ */
/* Public component                                                    */
/* ------------------------------------------------------------------ */

function CssFallback({ className }) {
  return <div className={`atmos-fallback ${className}`} aria-hidden="true" />
}

export default function AtmosphereScene({
  className = '',
  interactive = true,
  density = 'full',
}) {
  const [webgl] = useState(supportsWebGL)
  const [compact, setCompact] = useState(false)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const smallScreen = window.matchMedia('(max-width: 780px)')
    const motionPref = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => {
      setCompact(smallScreen.matches)
      setReduced(motionPref.matches)
    }
    sync()
    smallScreen.addEventListener('change', sync)
    motionPref.addEventListener('change', sync)
    return () => {
      smallScreen.removeEventListener('change', sync)
      motionPref.removeEventListener('change', sync)
    }
  }, [])

  if (!webgl) return <CssFallback className={className} />

  const detail = compact ? 64 : 128
  const starCount = density === 'lite' ? (compact ? 200 : 420) : compact ? 420 : 1100
  const glowScale = density === 'lite' ? 0.7 : 1

  return (
    <div className={`atmos-scene ${className}`} aria-hidden="true">
      <SceneBoundary fallback={<CssFallback className={className} />}>
        <Canvas
          dpr={[1, compact ? 1.5 : 1.8]}
          camera={{ position: [0, 0, 5.8], fov: 42 }}
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
              <Clouds detail={compact ? 48 : 96} reduced={reduced} />
              <Moon reduced={reduced} />
            </Suspense>
          </Rig>
        </Canvas>
      </SceneBoundary>
    </div>
  )
}
