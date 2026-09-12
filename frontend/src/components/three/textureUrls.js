/*
  Globe texture paths, kept in a module of their own so nothing that only needs
  the URLs has to import three.js with them. The opening sequence uses this to
  warm the images while its 3D chunk is still downloading; index.html preloads
  the same set.
*/
export const TEX = {
  day: '/textures/earth_atmos_2048.jpg',
  night: '/textures/earth_lights_2048.png',
  specular: '/textures/earth_specular_2048.jpg',
  normal: '/textures/earth_normal_2048.jpg',
  clouds: '/textures/earth_clouds_1024.png',
  moon: '/textures/moon_1024.jpg',
}

/*
  The <link rel="preload"> tags get the bytes; this turns them into decoded
  bitmaps ahead of time. Without it, five 2048² maps are decoded on the main
  thread at the moment the canvas mounts, which is the pause between the
  wordmark landing and the planet appearing.

  crossOrigin must match what three's ImageLoader asks for, or this is a
  separate cache entry and a wasted download rather than a warm-up.
*/
export function warmTextures() {
  if (typeof Image === 'undefined') return
  for (const src of Object.values(TEX)) {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = src
    // Best-effort: a failure here just means the loader does the work later.
    img.decode?.().catch(() => {})
  }
}
