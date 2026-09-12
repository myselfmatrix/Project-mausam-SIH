import { Suspense, useCallback, useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
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
  useSceneEnv,
} from '../three/globeParts'

/*
  The opening shot.

  Same planet as the hero — same meshes, same shaders, same idle spin rate —
  filmed differently. The camera opens close, below the equator and off to one
  side with the horizon tilted and the globe turning fast, then pulls back,
  levels out and lands on *exactly* the hero's framing: position (0, 0, 5.8),
  no rotation, 42° field of view.

  Close, but not so close that the planet becomes a dark wall: the opening
  radius leaves the limb and its atmosphere inside the frame, which is the part
  that actually reads as Earth.

  Landing on those numbers is the whole trick. When IntroSequence then flies
  this canvas into the hero's box and cross-fades, there is nothing to notice:
  both canvases are showing the same planet, the same size, at the same
  longitude.
*/

const FLIGHT = 3.2 // seconds of camera travel
const ARM_TIMEOUT = 2200 // start anyway if the texture set is slow

// Opening camera pose, all of which eases to zero / to the hero values.
const START_RADIUS = 2.5
const START_SWING = -0.44 // radians of azimuth, so the camera arcs as it pulls
const START_LIFT = -0.46 // below the equator, climbing to level
const START_ROLL = 0.26 // a tilted horizon that rights itself
const START_FOV = 52 // wider lens at the start — a touch of dolly-zoom

/*
  Yaw "lead": how far behind its resting longitude the planet starts. The intro
  gives this back over the flight, which is what produces the fast opening spin
  without ever desyncing from the hero copy of the globe — the offset is zero
  by the time the camera settles.
*/
const EARTH_LEAD = 3.6
const CLOUD_LEAD = 4.4

const easeInOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3)

/* Mounts only once the suspended texture loaders have resolved, which is our
   cue that there is actually a planet to fly around. */
function Ready({ onReady }) {
  useEffect(() => {
    onReady()
  }, [onReady])
  return null
}

function Flight({ armedRef, earthYaw, cloudYaw, reduced, onSettled }) {
  const camera = useThree((s) => s.camera)
  const startAt = useRef(null)
  const settled = useRef(false)

  useFrame((state) => {
    if (settled.current) return

    if (!armedRef.current) {
      // Hold the opening pose until there is actually a globe to fly around.
      applyPose(camera, earthYaw, cloudYaw, reduced ? 1 : 0)
      return
    }
    if (startAt.current === null) startAt.current = state.clock.elapsedTime

    const t = state.clock.elapsedTime - startAt.current
    const p = reduced ? 1 : Math.min(t / FLIGHT, 1)
    applyPose(camera, earthYaw, cloudYaw, p)

    if (p >= 1) {
      settled.current = true
      onSettled?.()
    }
  })

  return null
}

/* One function for the whole rig so the held pose and the animated pose can
   never drift apart. */
function applyPose(camera, earthYaw, cloudYaw, p) {
  const dolly = easeInOutCubic(p)
  /*
    Swing and roll resolve a little ahead of the dolly, so the horizon is
    level before the camera stops travelling — a controlled landing rather
    than everything snapping true at the same instant.

    The lead is small and the curve is the same ease-in-out as the dolly. An
    exponential ease here spent almost the whole tilt in the first fraction of
    a second and the roll was visibly over before the shot had begun.
  */
  const level = easeInOutCubic(Math.min(p * 1.12, 1))
  // Cubic, not quartic: the spin sheds speed over the length of the shot
  // instead of dumping most of it immediately.
  const spin = easeOutCubic(p)

  const radius = START_RADIUS + (CAMERA_Z - START_RADIUS) * dolly
  const swing = START_SWING * (1 - level)

  camera.position.set(Math.sin(swing) * radius, START_LIFT * (1 - level), Math.cos(swing) * radius)
  camera.up.set(0, 1, 0)
  camera.lookAt(0, 0, 0)
  camera.rotateZ(START_ROLL * (1 - level))

  const fov = START_FOV + (CAMERA_FOV - START_FOV) * dolly
  if (camera.fov !== fov) {
    camera.fov = fov
    camera.updateProjectionMatrix()
  }

  earthYaw.current = -EARTH_LEAD * (1 - spin)
  cloudYaw.current = -CLOUD_LEAD * (1 - spin)
}

export default function IntroGlobe({ onReady, onSettled, className = '' }) {
  const { compact, reduced } = useSceneEnv()
  const armedRef = useRef(false)
  const earthYaw = useRef(-EARTH_LEAD)
  const cloudYaw = useRef(-CLOUD_LEAD)

  const arm = useCallback(() => {
    armedRef.current = true
  }, [])

  /*
    Two separate signals, deliberately.

    onReady fires only when the planet is actually there to be looked at, and
    that is what uncovers the canvas — otherwise a slow texture set would put a
    bare atmosphere shell on screen as a flat blue disc. The timeout below only
    starts the clock, so the sequence still reaches its end and hands over even
    if the textures never arrive.
  */
  const handleReady = useCallback(() => {
    arm()
    onReady?.()
  }, [arm, onReady])

  useEffect(() => {
    const timer = window.setTimeout(arm, ARM_TIMEOUT)
    return () => window.clearTimeout(timer)
  }, [arm])

  // Density has to match the hero's defaults exactly, or the atmosphere would
  // visibly change strength at the hand-off.
  const { detail, cloudDetail, starCount, glowScale } = sceneDensity('full', compact)

  return (
    <div className={`intro-canvas ${className}`} aria-hidden="true">
      <SceneBoundary fallback={null}>
        <Canvas
          dpr={[1, compact ? 1.5 : 1.8]}
          camera={{ position: [0, 0, START_RADIUS], fov: START_FOV }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          style={{ background: 'transparent' }}
        >
          <Flight
            armedRef={armedRef}
            earthYaw={earthYaw}
            cloudYaw={cloudYaw}
            reduced={reduced}
            onSettled={onSettled}
          />
          {/* Same rig as the hero, so a cursor parked mid-screen leaves both
              globes leaning the same way when they swap. */}
          <Rig interactive reduced={reduced}>
            <Starfield count={starCount} reduced={reduced} />
            <Glow radius={1.16} power={3.0} strength={0.95} opacityScale={glowScale} />
            <Glow radius={1.42} power={4.4} strength={0.4} opacityScale={glowScale} />

            {/* The planet gates the opening; the Moon gets its own boundary so
                its texture — the one map the document doesn't preload — can't
                hold the whole shot back. */}
            <Suspense fallback={null}>
              <Earth detail={detail} reduced={reduced} yawOffsetRef={earthYaw} />
              <Clouds detail={cloudDetail} reduced={reduced} yawOffsetRef={cloudYaw} />
              <Ready onReady={handleReady} />
            </Suspense>
            <Suspense fallback={null}>
              <Moon reduced={reduced} />
            </Suspense>
          </Rig>
        </Canvas>
      </SceneBoundary>
    </div>
  )
}
