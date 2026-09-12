import { createContext } from 'react'

/* Lives in its own module so the provider file exports only a component and
   the hook file exports only a hook — which is what keeps fast refresh
   working for both. */
export const I18nContext = createContext(null)
