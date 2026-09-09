import { lazy, Suspense } from 'react'

// three.js is ~600KB of the bundle and nothing above the fold needs it to
// paint, so it loads as its own chunk. The opening sequence covers the fetch,
// and the CSS planet stands in until it lands.
const AtmosphereScene = lazy(() => import('./AtmosphereScene'))

export default function LazyAtmosphere(props) {
  return (
    <Suspense fallback={<div className={`atmos-fallback ${props.className || ''}`} aria-hidden="true" />}>
      <AtmosphereScene {...props} />
    </Suspense>
  )
}
