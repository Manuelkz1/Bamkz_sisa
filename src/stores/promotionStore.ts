import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface Promotion {
  id?: string;
  name: string;
  description?: string;
  type: 'percentage' | 'fixed' | '2x1' | '3x2' | '3x1';
  value?: number;
  active: boolean;
  start_date?: string;
  end_date?: string;
  product_ids?: string[];
  created_at?: string;
  updated_at?: string;
  buy_quantity: number;
  get_quantity: number;
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
  
  fetchPromotions: async () => {
    set({ loading: true, error: null });
    
    try {
      const { data: promotionsData, error: promotionsError } = await supabase
        .from('promotions')
        .select(`
          *,
          promotion_products (
            product_id
          )
        `)
        .order('created_at', { ascending: false });
      
      if (promotionsError) throw promotionsError;
      
      const formattedPromotions = promotionsData?.map(promotion => ({
        ...promotion,
        product_ids: promotion.promotion_products?.map(pp => pp.product_id) || []
      })) || [];

      set({ promotions: formattedPromotions, loading: false });
    } catch (error: any) {
      console.error('Error fetching promotions:', error);
      set({ error: error.message, loading: false });
    }
  },
  
  createPromotion: async (promotion) => {
    set({ loading: true, error: null });
    
    try {
      const { data: newPromotion, error: promotionError } = await supabase
        .from('promotions')
        .insert([{
          name: promotion.name,
          description: promotion.description,
          type: promotion.type,
          value: promotion.value,
          active: promotion.active,
          start_date: promotion.start_date || null,
          end_date: promotion.end_date || null,
          buy_quantity: promotion.buy_quantity || 1,
          get_quantity: promotion.get_quantity || 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (promotionError) throw promotionError;
      
      if (promotion.product_ids?.length) {
        const promotionProducts = promotion.product_ids.map(productId => ({
          promotion_id: newPromotion.id,
          product_id: productId
        }));
        
        const { error: linkError } = await supabase
          .from('promotion_products')
          .insert(promotionProducts);
        
        if (linkError) throw linkError;
      }
      
      await get().fetchPromotions();
      
      return { success: true, data: newPromotion };
    } catch (error: any) {
      console.error('Error creating promotion:', error);
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    } finally {
      set({ loading: false });
    }
  },
  
  updatePromotion: async (id, promotion) => {
    set({ loading: true, error: null });
    
    try {
      const { data: updatedPromotion, error: updateError } = await supabase
        .from('promotions')
        .update({
          ...promotion,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (updateError) throw updateError;
      
      if (promotion.product_ids !== undefined) {
        // Delete existing product links
        await supabase
          .from('promotion_products')
          .delete()
          .eq('promotion_id', id);
        
        // Create new product links
        if (promotion.product_ids.length > 0) {
          const promotionProducts = promotion.product_ids.map(productId => ({
            promotion_id: id,
            product_id: productId
          }));
          
          const { error: linkError } = await supabase
            .from('promotion_products')
            .insert(promotionProducts);
          
          if (linkError) throw linkError;
        }
      }
      
      await get().fetchPromotions();
      
      return { success: true, data: updatedPromotion };
    } catch (error: any) {
      console.error('Error updating promotion:', error);
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    } finally {
      set({ loading: false });
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
      
      set(state => ({
        promotions: state.promotions.filter(p => p.id !== id),
        loading: false
      }));
      
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting promotion:', error);
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },
  
  togglePromotionStatus: async (id) => {
    set({ loading: true, error: null });
    
    try {
      const promotion = get().promotions.find(p => p.id === id);
      if (!promotion) throw new Error('Promotion not found');
      
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
      
      set(state => ({
        promotions: state.promotions.map(p => p.id === id ? data : p),
        loading: false
      }));
      
      return { success: true };
    } catch (error: any) {
      console.error('Error toggling promotion status:', error);
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  }
}));