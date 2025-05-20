import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,
  error: null,
  
  initialize: async () => {
    try {
      set({ loading: true, error: null })
      
      // Simplificar la inicialización para evitar errores
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        set({ user: session.user, loading: false })
      } else {
        set({ user: null, loading: false })
      }
    } catch (error) {
      console.error('Error initializing auth:', error)
      set({ error: error.message, loading: false })
    }
  },
  
  signIn: async (email, password) => {
    try {
      set({ loading: true, error: null })
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      
      if (error) throw error
      set({ user: data.user, loading: false })
      return data
    } catch (error) {
      console.error('Error signing in:', error)
      set({ error: error.message, loading: false })
      return { error }
    }
  },
  
  signOut: async () => {
    try {
      await supabase.auth.signOut()
      set({ user: null })
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }
}))
