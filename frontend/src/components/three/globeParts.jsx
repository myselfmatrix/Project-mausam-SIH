import { Component, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useLoader, useThree } from '@react-three/fiber'
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
import { TEX } from './textureUrls'

/*
  The globe, in pieces.

  Both the hero scene and the opening sequence render the same planet, so the
  meshes live here rather than inside either one. That is what makes the
  hand-off at the end of the intro invisible: it is not a lookalike, it is the
  same geometry, the same shaders and the same rotation maths.
*/

export { TEX }

// View-space sun direction. The camera is fixed, so a constant here keeps the
// terminator parked where it looks best — sunlit face toward the viewer, city
// lights sweeping in from the left limb as the globe turns.
export const SUN_DIR = new THREE.Vector3(0.78, 0.26, 0.38).normalize()
export const ATMO_COLOR = new THREE.Color('#4ea6ff')

// Shared framing. Anything that wants to hand a globe over to another canvas
// has to agree on these or the planet will jump size mid-crossfade.
export const CAMERA_Z = 5.8
export const CAMERA_FOV = 42

// Starting yaw and idle spin rates. Rotation is computed from these in both
// scenes, so two canvases mounted at the same moment stay in step.
export const BASE_YAW = 2.4
export const EARTH_SPIN = 0.032
export const CLOUD_SPIN = 0.041
export const AXIAL_TILT = 0.41

/* ------------------------------------------------------------------ */
/* Capability checks — the hero must never render as a blank box       */
/* ------------------------------------------------------------------ */

export function supportsWebGL() {
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

export class SceneBoundary extends Component {
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

/*
  `yawOffsetRef` is how the intro spins the planet fast without ever losing
  sync with the hero copy of it. The idle yaw is integrated identically in both
  scenes; the intro only adds an offset on top, and eases that offset to zero
  by the time the camera settles. Land on zero and the two globes are showing
  the same longitude to the pixel.
*/
export function Earth({ detail, reduced, yawOffsetRef }) {
  const meshRef = useRef()
  const yaw = useRef(BASE_YAW)
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
    if (!meshRef.current) return
    if (!reduced) yaw.current += delta * EARTH_SPIN
    meshRef.current.rotation.y = yaw.current + (yawOffsetRef?.current ?? 0)
  })

  // ~23.4° axial tilt, because it reads as Earth rather than as a ball.
  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      rotation={[0, BASE_YAW, AXIAL_TILT]}
    />
  )
}

export function Clouds({ detail, reduced, yawOffsetRef }) {
  const meshRef = useRef()
  const yaw = useRef(BASE_YAW)
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
    if (!meshRef.current) return
    if (!reduced) yaw.current += delta * CLOUD_SPIN
    meshRef.current.rotation.y = yaw.current + (yawOffsetRef?.current ?? 0)
  })

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      rotation={[0, BASE_YAW, AXIAL_TILT]}
    />
  )
}

export function Glow({ radius, power, strength, opacityScale = 1 }) {
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

  Elliptical, not circular, and deliberately so: the scene canvas hangs off the
  right edge of the hero, so a circular orbit wide enough to clear Earth swings
  the Moon two ways it must not go — past the right edge of the viewport, and
  across the headline on the left. Narrowing the horizontal radius keeps the
  whole lap inside the right-hand column while the taller vertical radius gives
  it room to sweep above and below Earth.
*/
export const MOON_ORBIT_X = 1.62
export const MOON_ORBIT_Y = 1.48
export const MOON_PERIOD = 46 // seconds per revolution

export function Moon({ reduced }) {
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

/*
  Seeded, not random.

  The intro and the hero each build their own starfield, and they cross-fade
  over each other at the hand-off. With Math.random the two shells would hold
  different stars and the sky would visibly reshuffle mid-fade; from a fixed
  seed both draw the same one.
*/
function seededRandom(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function Starfield({ count, reduced }) {
  const ref = useRef()

  const points = useMemo(() => {
    const rand = seededRandom(0x5eed57a2)
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      // Distribute through a shell so nothing spawns inside the planet.
      const radius = 2.6 + rand() * 4.4
      const theta = rand() * Math.PI * 2
      const phi = Math.acos(2 * rand() - 1)
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
export function Rig({ children, interactive, reduced }) {
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

/* Screen size and motion preference, resolved the same way in both scenes so
   they pick the same geometry detail and the same star count. */
export function useSceneEnv() {
  const [env, setEnv] = useState({ compact: false, reduced: false })

  useEffect(() => {
    const smallScreen = window.matchMedia('(max-width: 780px)')
    const motionPref = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setEnv({ compact: smallScreen.matches, reduced: motionPref.matches })
    sync()
    smallScreen.addEventListener('change', sync)
    motionPref.addEventListener('change', sync)
    return () => {
      smallScreen.removeEventListener('change', sync)
      motionPref.removeEventListener('change', sync)
    }
  }, [])

  return env
}

/* Star counts and halo strength, shared so the intro and the hero agree.
   A mismatch here would show up as the atmosphere brightening at the moment
   the two canvases swap. */
export function sceneDensity(density, compact) {
  return {
    detail: compact ? 64 : 128,
    cloudDetail: compact ? 48 : 96,
    starCount: density === 'lite' ? (compact ? 200 : 420) : compact ? 420 : 1100,
    glowScale: density === 'lite' ? 0.7 : 1,
  }
}
