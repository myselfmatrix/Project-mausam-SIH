import * as THREE from 'three'
import { AXIAL_TILT, BASE_YAW } from '../three/globeParts'

/*
  Turning coordinates into globe rotations, and back.

  The picker's whole interaction rests on two conversions: "spin the Earth so
  that Chennai faces the camera", and "the user tapped here - which place is
  that?". Both are pure geometry, so they live apart from the React component
  and can be reasoned about (and tested) on their own.

  Frames, because mixing them up is the easy mistake here:

    local  - the Earth mesh's own space, the one the equirectangular texture
             is mapped onto. Latitude and longitude are only meaningful here.
    world  - after the mesh's baked rotation (a base yaw so India faces the
             camera at rest, plus the 23.4 degree axial tilt).
    view   - after the picker's orientation group, which is the thing being
             animated. The camera looks down -Z, so a point is centred on
             screen when its view-space direction is +Z.
*/

const DEG = Math.PI / 180
const FORWARD = new THREE.Vector3(0, 0, 1)

/*
  The mesh's own rotation, reproduced exactly.

  globeParts renders the Earth at rotation [0, BASE_YAW, AXIAL_TILT] with
  Euler order XYZ, so the same values in the same order are what map a texture
  coordinate to where it actually appears. Deriving this from the shared
  constants rather than restating the numbers means the picker cannot drift
  out of agreement with the hero globe.
*/
export const MESH_QUATERNION = new THREE.Quaternion().setFromEuler(
  new THREE.Euler(0, BASE_YAW, AXIAL_TILT, 'XYZ'),
)

/** Earth's north pole, as a direction in world space. */
const NORTH_WORLD = new THREE.Vector3(0, 1, 0).applyQuaternion(MESH_QUATERNION)

/**
 * Latitude/longitude to a point in the mesh's local frame.
 *
 * The azimuth is offset by 180 degrees because three's SphereGeometry starts
 * its texture seam at the antimeridian: without the offset, every longitude
 * would be half a world out and the pins would sit in the wrong ocean.
 */
export function latLonToVector3(lat, lon, radius = 1) {
  const polar = (90 - lat) * DEG
  const azimuth = (lon + 180) * DEG
  return new THREE.Vector3(
    -radius * Math.cos(azimuth) * Math.sin(polar),
    radius * Math.cos(polar),
    radius * Math.sin(azimuth) * Math.sin(polar),
  )
}

/** Wraps a longitude into [-180, 180). */
export const normaliseLon = (lon) => (((lon + 180) % 360) + 360) % 360 - 180

/** The inverse of latLonToVector3, for turning a tap into a place. */
export function vector3ToLatLon(vector) {
  const length = vector.length() || 1
  const lat = 90 - Math.acos(THREE.MathUtils.clamp(vector.y / length, -1, 1)) / DEG
  const lon = normaliseLon(Math.atan2(vector.z, -vector.x) / DEG - 180)
  return { lat, lon }
}

/**
 * The orientation that brings `lat`/`lon` to face the camera.
 *
 * Built as an explicit basis rather than with setFromUnitVectors, which
 * returns the shortest rotation between two directions and therefore lets the
 * globe arrive rolled over - flying from Chennai to London would leave the
 * Atlantic upright and Europe lying on its side. Constructing the basis from
 * Earth's own axis keeps north pointing up at every destination.
 */
export function orientationFor(lat, lon) {
  const target = latLonToVector3(lat, lon).normalize().applyQuaternion(MESH_QUATERNION)

  // Right-hand vector, from Earth's axis and the view direction.
  let right = new THREE.Vector3().crossVectors(NORTH_WORLD, target)

  /* Directly over a pole the axis and the view direction are parallel, so
     that cross product collapses to zero and the basis would be degenerate.
     Any perpendicular will do there - the concept of "up" is arbitrary when
     you are looking straight down the axis. */
  if (right.lengthSq() < 1e-8) {
    right = new THREE.Vector3(1, 0, 0).cross(target)
    if (right.lengthSq() < 1e-8) right.set(0, 1, 0).cross(target)
  }
  right.normalize()

  const up = new THREE.Vector3().crossVectors(target, right).normalize()

  // A basis that maps X->right, Y->up, Z->target; inverting it maps the
  // target direction onto +Z, which is where the camera is looking from.
  const basis = new THREE.Matrix4().makeBasis(right, up, target)
  return new THREE.Quaternion().setFromRotationMatrix(basis).invert()
}

/**
 * The latitude/longitude currently facing the camera.
 *
 * Used after a drag: the user has spun the globe, and whatever ends up in the
 * centre is what they have selected.
 */
export function centredLatLon(orientation) {
  const direction = FORWARD.clone()
    .applyQuaternion(orientation.clone().invert())
    .applyQuaternion(MESH_QUATERNION.clone().invert())
  return vector3ToLatLon(direction)
}

/** Whether a point is on the near side of the globe, so its pin is visible. */
export function isFacingCamera(lat, lon, orientation) {
  const direction = latLonToVector3(lat, lon)
    .normalize()
    .applyQuaternion(MESH_QUATERNION)
    .applyQuaternion(orientation)
  return direction.z > 0.12
}

export { FORWARD }
