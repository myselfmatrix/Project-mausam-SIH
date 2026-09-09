/*
  Shaders for the hero Earth.

  Textures are NASA Blue Marble / Black Marble imagery (public domain), vendored
  from the three.js examples set into /public/textures so the scene has no
  network dependency at demo time.
*/

export const earthVertex = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;

void main(){
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vViewDir = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`

export const earthFragment = /* glsl */ `
uniform sampler2D uDay;
uniform sampler2D uNight;
uniform sampler2D uSpecular;
uniform sampler2D uNormalMap;
uniform vec3  uSunDir;      // view space, normalized
uniform vec3  uAtmoColor;
uniform float uNightBoost;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;

void main(){
  vec3 N = normalize(vNormal);
  float lambert = dot(N, uSunDir);

  // Relief. A full tangent-space transform is overkill at this scale — nudging
  // the diffuse term by the normal map's xy reads as terrain just as well and
  // costs two multiplies.
  vec3 nm = texture2D(uNormalMap, vUv).rgb * 2.0 - 1.0;
  float relief = lambert + nm.x * 0.20 + nm.y * 0.13;

  // Wide terminator so the day/night boundary looks like atmosphere scattering
  // rather than a hard edge.
  float dayAmt = smoothstep(-0.20, 0.24, lambert);

  vec3 dayTex = texture2D(uDay, vUv).rgb;
  vec3 lit = dayTex * (0.34 + 0.95 * clamp(relief, 0.0, 1.0));

  // Ocean sun-glint. The specular lobe must be extremely tight: the sun and
  // camera are both fixed, so a wide lobe parks a permanent soft white disc
  // over the Pacific that reads as a render artefact rather than sunlight.
  float ocean = texture2D(uSpecular, vUv).r;
  vec3 H = normalize(uSunDir + vViewDir);
  float glint = pow(max(dot(N, H), 0.0), 1400.0) * ocean * 0.85;
  lit += vec3(0.68, 0.80, 1.0) * glint * dayAmt;

  // City lights, only where the sun genuinely isn't.
  vec3 cities = texture2D(uNight, vUv).rgb * uNightBoost * (1.0 - dayAmt);

  vec3 color = mix(cities, lit, dayAmt);

  // Atmospheric limb, brightest on the sunlit side.
  float fres = pow(1.0 - max(dot(N, vViewDir), 0.0), 3.0);
  float sunSide = smoothstep(-0.35, 0.60, lambert);
  color += uAtmoColor * fres * (0.32 + 0.90 * sunSide);

  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}
`

export const cloudsVertex = earthVertex

export const cloudsFragment = /* glsl */ `
uniform sampler2D uClouds;
uniform vec3  uSunDir;
uniform float uOpacity;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;

void main(){
  vec4 tex = texture2D(uClouds, vUv);

  // The cloud plate ships as white-with-alpha in some builds and as a
  // luminance plate in others. Taking the min of the two reads correctly
  // either way instead of producing a solid white shell.
  float lum = max(tex.r, max(tex.g, tex.b));
  float coverage = min(tex.a, lum);

  vec3 N = normalize(vNormal);
  float lambert = dot(N, uSunDir);
  float lit = smoothstep(-0.28, 0.34, lambert);

  // Night-side cloud tops keep a faint blue cast rather than going black.
  vec3 col = mix(vec3(0.05, 0.08, 0.15), vec3(1.0), lit);

  // Fade the cloud shell at the limb so it doesn't outline the sphere.
  float rim = smoothstep(0.0, 0.42, dot(N, vViewDir));

  gl_FragColor = vec4(col, coverage * uOpacity * rim);
  #include <colorspace_fragment>
}
`

export const moonVertex = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;

void main(){
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const moonFragment = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uSunDir;

varying vec2 vUv;
varying vec3 vNormal;

void main(){
  vec3 N = normalize(vNormal);
  float lambert = dot(N, uSunDir);

  // Airless body: a much harder terminator than Earth's, since there's no
  // atmosphere to scatter light around the limb.
  float lit = smoothstep(-0.08, 0.22, lambert);

  vec3 tex = texture2D(uMap, vUv).rgb;

  // The night side isn't black — it catches earthshine, faint and blue.
  vec3 earthshine = vec3(0.16, 0.22, 0.38) * 0.30;
  vec3 col = tex * (0.05 + 1.20 * lit) + tex * earthshine * (1.0 - lit);

  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`

export const glowVertex = /* glsl */ `
varying vec3 vNormal;
void main(){
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const glowFragment = /* glsl */ `
uniform vec3  uColor;
uniform float uPower;
uniform float uStrength;
varying vec3 vNormal;

void main(){
  // Classic backside-fresnel halo: brightest where the shell is edge-on.
  float intensity = pow(clamp(0.68 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0, 1.0), uPower);
  gl_FragColor = vec4(uColor, 1.0) * intensity * uStrength;
}
`
