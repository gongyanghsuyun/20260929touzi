import { createClient } from '@supabase/supabase-js'
import { projectId, publicAnonKey } from '../../utils/supabase/info'

declare global {
  // Vite HMR re-evaluates modules. Keep auth state tied to one browser client.
  // eslint-disable-next-line no-var
  var __investmentKbSupabase: ReturnType<typeof createClient> | undefined
}

export const supabase = globalThis.__investmentKbSupabase ??= createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey,
  {
    auth: {
      // Make's preview can host another Supabase client for the same project.
      // A dedicated key prevents its session listener from sharing this app's client.
      storageKey: 'investment-kb-auth-token',
    },
  },
)

export const functionUrl = (path: string) =>
  `https://${projectId}.supabase.co/functions/v1/make-server-7d94821b${path}`
