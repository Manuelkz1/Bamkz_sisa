import { create } from 'zustand';
import { User } from '../types';
import { supabase, initSupabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

interface AuthStore {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (provider: 'facebook' | 'email') => Promise<void>;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: true,
  error: null,

  signIn: async (provider) => {
    try {
      set({ loading: true, error: null });
      if (provider === 'facebook') {
        await supabase.auth.signInWithOAuth({
          provider: 'facebook',
          options: {
            redirectTo: `${window.location.origin}/auth/callback`
          }
        });
      }
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    try {
      set({ loading: true, error: null });
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      set({ user: null, error: null });
      
      // Clear any stored session data
      localStorage.removeItem('supabase.auth.token');
      
      // Optional: Clear other stored data if needed
      // localStorage.clear();
      
      // Redirect to home page
      window.location.href = '/';
    } catch (error: any) {
      console.error('Error during sign out:', error);
      set({ error: null }); // Reset error state even if there's an error
      toast.error('Error al cerrar sesión. Por favor, intenta de nuevo.');
    } finally {
      set({ loading: false });
    }
  },

  checkAuth: async () => {
    const retryWithDelay = async (fn: () => Promise<any>, retries: number): Promise<any> => {
      try {
        return await fn();
      } catch (error) {
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          return retryWithDelay(fn, retries - 1);
        }
        throw error;
      }
    };

    try {
      set({ loading: true, error: null });
      
      // Initialize Supabase with retries
      const session = await retryWithDelay(async () => {
        try {
          return await initSupabase();
        } catch (error) {
          console.error('Failed to initialize Supabase:', error);
          throw error;
        }
      }, MAX_RETRIES);
      
      if (!session) {
        set({ user: null, loading: false });
        return;
      }

      // Get user data with retries
      const { data: { user: authUser }, error: authError } = await retryWithDelay(async () => {
        try {
          return await supabase.auth.getUser();
        } catch (error) {
          console.error('Failed to get user:', error);
          throw error;
        }
      }, MAX_RETRIES);
      
      if (authError) throw authError;

      if (authUser) {
        try {
          // Get existing user data with retries
          const { data: userData, error: userError } = await retryWithDelay(async () => {
            return await supabase
              .from('users')
              .select('*')
              .eq('id', authUser.id)
              .maybeSingle();
          }, MAX_RETRIES);

          if (userError) throw userError;

          if (userData) {
            // Update existing user
            const updates = {
              email: authUser.email,
              full_name: authUser.user_metadata?.full_name || userData.full_name,
              updated_at: new Date().toISOString()
            };

            const { data: updatedUser, error: updateError } = await retryWithDelay(async () => {
              return await supabase
                .from('users')
                .update(updates)
                .eq('id', authUser.id)
                .select()
                .single();
            }, MAX_RETRIES);

            if (updateError) throw updateError;
            set({ user: updatedUser });
          } else {
            // Create new user
            const newUser = {
              id: authUser.id,
              email: authUser.email,
              full_name: authUser.user_metadata?.full_name || '',
              role: 'customer',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };

            const { data: createdUser, error: createError } = await retryWithDelay(async () => {
              return await supabase
                .from('users')
                .insert([newUser])
                .select()
                .single();
            }, MAX_RETRIES);

            if (createError) {
              console.error('Error creating user:', createError);
              // If insert fails, try upsert
              const { data: upsertedUser, error: upsertError } = await retryWithDelay(async () => {
                return await supabase
                  .from('users')
                  .upsert([newUser], {
                    onConflict: 'id',
                    ignoreDuplicates: false
                  })
                  .select()
                  .single();
              }, MAX_RETRIES);

              if (upsertError) throw upsertError;
              set({ user: upsertedUser });
            } else {
              set({ user: createdUser });
            }
          }
        } catch (error: any) {
          console.error('Error managing user data:', error);
          // If there's an error, we still want to set basic user info
          set({
            user: {
              id: authUser.id,
              email: authUser.email || '',
              full_name: authUser.user_metadata?.full_name || '',
              role: 'customer'
            }
          });
        }
      } else {
        set({ user: null });
      }
    } catch (error: any) {
      console.error('Auth check error:', error);
      set({ error: 'Error de conexión. Por favor, verifica tu conexión a internet e intenta de nuevo.' });
      set({ user: null });
    } finally {
      set({ loading: false });
    }
  },
}));