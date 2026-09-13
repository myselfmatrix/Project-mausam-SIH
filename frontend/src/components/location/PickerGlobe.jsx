import { Suspense, useCallback, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import {
  AXIAL_TILT, BASE_YAW, CAMERA_FOV, CAMERA_Z, Clouds, Earth, Glow, SceneBoundary,
  Starfield, sceneDensity, supportsWebGL, useSceneEnv,
} from '../three/globeParts'
import { MESH_QUATERNION, latLonToVector3, orientationFor, vector3ToLatLon } from './globeMath'

/*
  The globe you pick a location on.

  It renders the same Earth as the landing page - the same meshes, shaders and
  textures out of globeParts - so the picker does not look like a different
  planet from the one in the hero. What it adds is control: the globe flies to
  whatever place is selected, can be spun by hand, and can be tapped to choose
  a point directly.

  The auto-spin is switched off by passing `reduced` to Earth and Clouds, which
  is the flag that gates their per-frame yaw increment. A picker whose globe
  keeps turning would drift the selected location off centre a second after it
  arrived.
*/

// How far the camera can be pushed in and pulled out. Closer than 3.4 and the
// sphere overflows the frame; further than 9 and it is a marble.
const ZOOM_MIN = 3.4
const ZOOM_MAX = 9

// Degrees of rotation per pixel dragged, at the default zoom. Scaled by the
// zoom level so dragging feels the same whether zoomed in or out.
const DRAG_SENSITIVITY = 0.32

// Beyond this many pixels a pointer sequence is a drag, not a tap. Without it
// every attempt to spin the globe would also select whatever was underneath
// the finger when it lifted.
const TAP_SLOP_PX = 6

/** Latitude is clamped short of the poles: past ~85 the globe reads upside down. */
const LAT_LIMIT = 85

/*
  Flying to a place.

  A map zooms in when you choose somewhere. A globe that only rotates loses
  that, and worse, a long rotation across the planet reads as the texture
  sliding past rather than as travel. So the camera follows an arc: it pulls
  back as the globe turns, then comes in close as the destination arrives -
  the same shape as lifting off, crossing, and landing.

  The lift is scaled by how far the journey actually is, so tapping a point
  already on screen barely moves the camera while jumping from Kochi to
  Reykjavik pulls right back. `FOCUS_Z` is where it settles afterwards, closer
  than the resting view, which is what makes the choice feel confirmed.
*/
const FOCUS_Z = 4.3
const LIFT_MAX = 1.7
const FLIGHT_SECONDS = 1.05

/** Ease in and out, so the camera neither jerks away nor slams to a halt. */
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

function GlobeScene({ selection, savedPlaces, onPick, zoomRef, dragRef }) {
  const orientRef = useRef()
  const pickRef = useRef()
  // Held at zero so Earth and Clouds keep their base yaw and this component
  // owns all rotation through the parent group.
  const fixedYaw = useRef(0)
  const { compact, reduced } = useSceneEnv()
  const { detail, cloudDetail, starCount, glowScale } = sceneDensity('full', compact)
  const camera = useThree((s) => s.camera)

  const target = useMemo(
    () => orientationFor(selection.lat, selection.lon),
    [selection.lat, selection.lon],
  )

  const flightRef = useRef({ active: false, t: 0, arc: 0, fromZ: CAMERA_Z, toZ: CAMERA_Z })

  // Start already pointing at the opening selection, so the picker does not
  // open mid-flight from an arbitrary angle.
  useEffect(() => {
    if (orientRef.current && !orientRef.current.userData.initialised) {
      orientRef.current.quaternion.copy(target)
      orientRef.current.userData.initialised = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /*
    Begin a flight whenever the destination changes.

    The distance is measured from where the globe actually is, not from the
    previous selection - retargeting mid-flight (arrow-keying down a list of
    results) then measures the journey that is really left to travel.

    A drag is excluded: the selection updates continuously while the finger
    moves, and starting a flight on each of those would fight the hand.
  */
  useEffect(() => {
    const group = orientRef.current
    if (!group || !group.userData.initialised || dragRef.current.active || reduced) return

    const angle = group.quaternion.angleTo(target)
    const arc = Math.min(angle / (Math.PI * 0.55), 1)

    /*
      Only a real journey is allowed to change the resting zoom. Tapping a
      point already on screen is not a request to be moved closer, and
      overriding the zoom someone chose by hand is the kind of help nobody
      asks for.
    */
    const settle = arc > 0.12 ? Math.min(zoomRef.current, FOCUS_Z) : zoomRef.current
    zoomRef.current = settle

    dragRef.current.zoomed = false
    flightRef.current = {
      active: true,
      t: 0,
      arc,
      fromZ: camera.position.z,
      toZ: settle,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  useFrame((_, delta) => {
    const group = orientRef.current
    if (!group) return

    /*
      Exponential approach rather than a fixed-duration tween.

      The flight has no defined start: the target changes while the previous
      one is still being approached (arrow-keying down a list of results does
      this constantly). An exponential ease is always continuous from wherever
      the globe happens to be, so those retargets blend instead of snapping.

      The base is per-second, so raising it to `delta` keeps the speed
      identical at 60 and 120 Hz.
    */
    if (reduced) {
      group.quaternion.copy(target)
    } else {
      group.quaternion.slerp(target, 1 - Math.pow(0.0016, delta))
    }

    const flight = flightRef.current

    /*
      A drag or a wheel during a flight is the user taking over. Their input
      wins immediately rather than being overwritten for the rest of the arc.
    */
    if (flight.active && (dragRef.current.active || dragRef.current.zoomed)) {
      flight.active = false
    }

    if (flight.active) {
      flight.t = Math.min(1, flight.t + delta / (FLIGHT_SECONDS * (0.55 + 0.45 * flight.arc)))
      const eased = easeInOut(flight.t)
      const base = flight.fromZ + (flight.toZ - flight.fromZ) * eased
      // Zero at both ends, widest in the middle: the arc of the journey.
      const lift = flight.arc * LIFT_MAX * Math.sin(flight.t * Math.PI)
      camera.position.z = THREE.MathUtils.clamp(base + lift, ZOOM_MIN, ZOOM_MAX + LIFT_MAX)
      if (flight.t >= 1) flight.active = false
    } else {
      const z = THREE.MathUtils.clamp(zoomRef.current, ZOOM_MIN, ZOOM_MAX)
      if (Math.abs(camera.position.z - z) > 0.0005) {
        camera.position.z += (z - camera.position.z) * (1 - Math.pow(0.002, delta))
      }
    }
  })

  /*
    A tap on the globe is a location.

    `event.point` is the intersection in world space; worldToLocal on the pick
    sphere unwinds both the parent group's orientation and the mesh's own baked
    rotation in one step, which is what makes the result directly convertible
    to latitude and longitude.
  */
  const handleClick = useCallback(
    (event) => {
      // A pointer sequence that moved was a spin, not a selection.
      if (dragRef.current.moved > TAP_SLOP_PX) return
      if (!pickRef.current) return
      event.stopPropagation()

      const local = pickRef.current.worldToLocal(event.point.clone())
      onPick(vector3ToLatLon(local))
    },
    [dragRef, onPick],
  )

  const pins = useMemo(
    () =>
      (savedPlaces || [])
        .filter((p) => Number.isFinite(p?.lat) && Number.isFinite(p?.lon))
        .map((p) => ({ key: `${p.lat},${p.lon}`, position: latLonToVector3(p.lat, p.lon, 1.012) })),
    [savedPlaces],
  )

  return (
    <>
      <Starfield count={starCount} reduced={reduced} />
      <group ref={orientRef}>
        <Suspense fallback={null}>
          <Earth detail={detail} reduced yawOffsetRef={fixedYaw} />
        </Suspense>
        <Suspense fallback={null}>
          <Clouds detail={cloudDetail} reduced yawOffsetRef={fixedYaw} />
        </Suspense>
        <Glow radius={1.055} power={2.6} strength={1.05} opacityScale={glowScale} />
        <Glow radius={1.22} power={3.4} strength={0.42} opacityScale={glowScale} />

        {/*
          The surface the ray actually hits.

          Slightly outside the Earth so the intersection is unambiguous, and
          transparent rather than `visible={false}` because an invisible object
          is skipped by the event system's raycast - the tap would land on
          nothing. It writes no depth, so it occludes neither the globe nor the
          pins.
        */}
        <mesh ref={pickRef} rotation={[0, BASE_YAW, AXIAL_TILT]} onClick={handleClick}>
          <sphereGeometry args={[1.004, 48, 24]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>

        {/* Saved locations, in the Earth's own frame so they travel with it.
            The globe writes depth, so pins on the far side are occluded by it
            without any facing calculation. */}
        <group quaternion={MESH_QUATERNION}>
          {pins.map((pin) => (
            <mesh key={pin.key} position={pin.position}>
              <sphereGeometry args={[0.016, 12, 12]} />
              <meshBasicMaterial color="#7dd3fc" toneMapped={false} />
            </mesh>
          ))}
        </group>
      </group>
    </>
  )
}

/**
 * The interactive globe, plus its pointer handling.
 *
 * Rotation is expressed as a change to the selected coordinates rather than as
 * a free-floating quaternion: dragging moves the selection, and the globe
 * follows it. That keeps one source of truth - the picker always agrees with
 * the list beside it about which place is chosen - and it means a drag can be
 * undone simply by selecting something else.
 */
export default function PickerGlobe({ selection, savedPlaces, onSelectionChange, onPick }) {
  const hostRef = useRef(null)
  const zoomRef = useRef(CAMERA_Z)
  const dragRef = useRef({ active: false, x: 0, y: 0, moved: 0 })
  const canRender = useMemo(() => supportsWebGL(), [])

  const onPointerDown = useCallback((event) => {
    // Ignore secondary buttons so a right-click never starts a spin.
    if (event.button !== 0 && event.pointerType === 'mouse') return
    /*
      Pointer capture is deliberately NOT taken here.

      Capturing on pointerdown redirects every later event for this pointer to
      this element, including pointerup - and the canvas needs that pointerup
      to synthesise the click that selects a point. Capturing immediately made
      tapping the globe do nothing at all, while dragging still worked, which
      is a confusing way for it to fail. Capture is taken in onPointerMove
      instead, once the gesture has travelled far enough to be a drag rather
      than a tap.
    */
    dragRef.current = { active: true, x: event.clientX, y: event.clientY, moved: 0, captured: false }
  }, [])

  const onPointerMove = useCallback(
    (event) => {
      const drag = dragRef.current
      if (!drag.active) return

      const dx = event.clientX - drag.x
      const dy = event.clientY - drag.y
      drag.x = event.clientX
      drag.y = event.clientY
      drag.moved += Math.abs(dx) + Math.abs(dy)

      /* Now that this is unmistakably a drag, capture the pointer so the spin
         keeps tracking if the cursor leaves the globe mid-gesture. */
      if (!drag.captured && drag.moved > TAP_SLOP_PX) {
        drag.captured = true
        hostRef.current?.setPointerCapture?.(event.pointerId)
      }

      /*
        Sensitivity scales with distance so the surface moves at roughly the
        pixel rate under the finger. Zoomed in, the same drag covers fewer
        degrees - which is what makes it possible to pick a specific coastline
        rather than only a region.
      */
      const scale = (DRAG_SENSITIVITY * zoomRef.current) / CAMERA_Z

      onSelectionChange((current) => {
        const lat = Math.max(-LAT_LIMIT, Math.min(LAT_LIMIT, current.lat + dy * scale))
        // Dragging right turns the globe west, the way a physical globe under
        // your hand would.
        const lon = current.lon - dx * scale
        return { lat, lon }
      })
    },
    [onSelectionChange],
  )

  const endDrag = useCallback((event) => {
    const drag = dragRef.current
    drag.active = false
    if (drag.captured) {
      hostRef.current?.releasePointerCapture?.(event.pointerId)
      drag.captured = false
    }
    /*
      The tap-versus-drag distance has to outlive this handler: the click
      event that decides whether to select a point fires after pointerup, so
      clearing `moved` here would make every spin end in a selection. It is
      reset on the next pointerdown instead.
    */
  }, [])

  const onWheel = useCallback((event) => {
    event.preventDefault()
    const next = zoomRef.current + event.deltaY * 0.0016 * zoomRef.current
    zoomRef.current = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, next))
    // Taking the wheel ends any flight in progress — see the frame loop.
    dragRef.current.zoomed = true
  }, [])

  /*
    Wheel listeners must be non-passive to be able to preventDefault, and React
    attaches its own as passive. Without this, scrolling over the globe zooms
    the globe AND scrolls the page behind it.
  */
  useEffect(() => {
    const host = hostRef.current
    if (!host) return undefined
    const handler = (event) => onWheel(event)
    host.addEventListener('wheel', handler, { passive: false })
    return () => host.removeEventListener('wheel', handler)
  }, [onWheel])

  if (!canRender) {
    /* No WebGL: the picker still works entirely through search, GPS and the
       saved list, so this is a backdrop rather than an error. */
    return <div className="pglobe pglobe-fallback" aria-hidden="true" />
  }

  return (
    <div
      className="pglobe"
      ref={hostRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <SceneBoundary>
        <Canvas
          camera={{ position: [0, 0, CAMERA_Z], fov: CAMERA_FOV }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true }}
          // The picker is a modal surface; there is no reason to keep
          // rendering it once it closes, and the parent unmounts it.
          frameloop="always"
        >
          <GlobeScene
            selection={selection}
            savedPlaces={savedPlaces}
            onPick={onPick}
            zoomRef={zoomRef}
            dragRef={dragRef}
          />
        </Canvas>
      </SceneBoundary>

      {/* The crosshair is HTML rather than geometry: it must stay pin-sharp at
          any device pixel ratio, and it never moves - the globe moves under
          it, which is what communicates that the centre IS the selection. */}
      <div className="pglobe-reticle" aria-hidden="true">
        <span className="pglobe-reticle-ring" />
        <span className="pglobe-reticle-dot" />
      </div>
    </div>
  )
}
