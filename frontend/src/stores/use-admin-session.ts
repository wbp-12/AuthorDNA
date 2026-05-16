import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

type AdminSession = {
  username: string
}

type AdminSessionStore = {
  session: AdminSession | null
  isAuthenticated: boolean
  setSession: (username: string) => void
  clearSession: () => void
}

const storageKey = 'author-dna-admin-session'

export const useAdminSession = create<AdminSessionStore>()(
  persist(
    (set) => ({
      session: null,
      isAuthenticated: false,
      setSession: (username) => set({ session: { username }, isAuthenticated: true }),
      clearSession: () => set({ session: null, isAuthenticated: false }),
    }),
    {
      name: storageKey,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        session: state.session,
      }),
      merge: (persistedState, currentState) => {
        const savedState = persistedState as Partial<AdminSessionStore> | undefined

        return {
          ...currentState,
          ...(savedState ?? {}),
          isAuthenticated: Boolean(savedState?.session),
        }
      },
    },
  ),
)
