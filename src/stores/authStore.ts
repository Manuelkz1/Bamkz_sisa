import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,
  error: null,
  
  initialize: async () => {
    try {
      set({ loading: true, error: null });
      
      // Get Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Get user role from database
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (userError) {
          // If user record doesn't exist, create it
          if (userError.code === 'PGRST116') {
            const { data: newUser, error: createError } = await supabase
              .from('users')
              .insert({
                id: session.user.id,
                email: session.user.email,
                full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '',
                role: 'customer',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select()
              .single();

            if (createError) {
              console.error('Error creating user record:', createError);
              set({ user: session.user, loading: false });
              return;
            }

            set({ user: newUser, loading: false });
            return;
          }

          console.error('Error fetching user data:', userError);
          set({ user: session.user, loading: false });
          return;
        }
        
        // Combine auth and database data
        const userWithRole = {
          ...session.user,
          ...userData
        };
        
        console.log('User with role loaded:', userWithRole);
        set({ user: userWithRole, loading: false });
      } else {
        set({ user: null, loading: false });
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      set({ error: error.message, loading: false });
    }
  },
  
  signIn: async (email, password) => {
    try {
      set({ loading: true, error: null });
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) throw error;
      set({ user: data.user, loading: false });
      return data;
    } catch (error) {
      console.error('Error signing in:', error);
      set({ error: error.message, loading: false });
      return { error };
    }
  },
  
  signOut: async () => {
    try {
      await supabase.auth.signOut();
      set({ user: null });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }
}));