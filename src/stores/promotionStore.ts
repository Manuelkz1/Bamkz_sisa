// promotionStore.ts
import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface Promotion {
  id?: string;
  name: string;
  description?: string;
  type: 'percentage' | 'fixed' | 'discount' | '2x1' | '3x2' | '3x1';
  value?: number;
  active: boolean;
  start_date?: string;
  end_date?: string;
  product_ids?: string[];
  category_ids?: string[];
  created_at?: string;
  updated_at?: string;
}

interface PromotionStore {
  promotions: Promotion[];
  loading: boolean;
  error: string | null;
  
  // Getters
  getPromotions: () => Promotion[];
  getActivePromotions: () => Promotion[];
  getPromotionById: (id: string) => Promotion | undefined;
  
  // Actions
  fetchPromotions: () => Promise<void>;
  createPromotion: (promotion: Promotion) => Promise<{ success: boolean; data?: Promotion; error?: string }>;
  updatePromotion: (id: string, promotion: Partial<Promotion>) => Promise<{ success: boolean; data?: Promotion; error?: string }>;
  deletePromotion: (id: string) => Promise<{ success: boolean; error?: string }>;
  togglePromotionStatus: (id: string) => Promise<{ success: boolean; error?: string }>;
}

export const usePromotionStore = create<PromotionStore>((set, get) => ({
  promotions: [],
  loading: false,
  error: null,
  
  // Getters
  getPromotions: () => get().promotions,
  
  getActivePromotions: () => {
    const now = new Date().toISOString();
    return get().promotions.filter(promo => 
      promo.active && 
      (!promo.start_date || promo.start_date <= now) && 
      (!promo.end_date || promo.end_date >= now)
    );
  },
  
  getPromotionById: (id) => {
    return get().promotions.find(promo => promo.id === id);
  },
  
  // Actions
  fetchPromotions: async () => {
    set({ loading: true, error: null });
    
    try {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      set({ promotions: data || [], loading: false });
    } catch (error) {
      console.error('Error fetching promotions:', error);
      set({ error: error.message, loading: false });
    }
  },
  
  createPromotion: async (promotion) => {
    set({ loading: true, error: null });
    
    try {
      // Asegurarse de que los campos requeridos estén presentes
      if (!promotion.name || !promotion.type) {
        throw new Error('Nombre y tipo de promoción son obligatorios');
      }
      
      // Validar el valor según el tipo de promoción
      if (['percentage', 'fixed', 'discount'].includes(promotion.type) && 
          (promotion.value === undefined || promotion.value <= 0)) {
        throw new Error('El valor de la promoción debe ser mayor que 0');
      }
      
      // Añadir timestamps
      const now = new Date().toISOString();
      const newPromotion = {
        ...promotion,
        created_at: now,
        updated_at: now
      };
      
      const { data, error } = await supabase
        .from('promotions')
        .insert([newPromotion])
        .select()
        .single();
      
      if (error) throw error;
      
      // Actualizar el estado con la nueva promoción
      set(state => ({
        promotions: [data, ...state.promotions],
        loading: false
      }));
      
      return { success: true, data };
    } catch (error) {
      console.error('Error creating promotion:', error);
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },
  
  updatePromotion: async (id, promotion) => {
    set({ loading: true, error: null });
    
    try {
      // Añadir timestamp de actualización
      const updatedPromotion = {
        ...promotion,
        updated_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('promotions')
        .update(updatedPromotion)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Actualizar el estado con la promoción modificada
      set(state => ({
        promotions: state.promotions.map(p => p.id === id ? data : p),
        loading: false
      }));
      
      return { success: true, data };
    } catch (error) {
      console.error('Error updating promotion:', error);
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },
  
  deletePromotion: async (id) => {
    set({ loading: true, error: null });
    
    try {
      const { error } = await supabase
        .from('promotions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Actualizar el estado eliminando la promoción
      set(state => ({
        promotions: state.promotions.filter(p => p.id !== id),
        loading: false
      }));
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting promotion:', error);
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },
  
  togglePromotionStatus: async (id) => {
    set({ loading: true, error: null });
    
    try {
      // Obtener la promoción actual
      const promotion = get().promotions.find(p => p.id === id);
      if (!promotion) throw new Error('Promoción no encontrada');
      
      // Cambiar el estado activo
      const { data, error } = await supabase
        .from('promotions')
        .update({ 
          active: !promotion.active,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Actualizar el estado con la promoción modificada
      set(state => ({
        promotions: state.promotions.map(p => p.id === id ? data : p),
        loading: false
      }));
      
      return { success: true };
    } catch (error) {
      console.error('Error toggling promotion status:', error);
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  }
}));
