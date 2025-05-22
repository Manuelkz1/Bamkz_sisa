// cartStore.ts
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { usePromotionStore } from './promotionStore';

interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  promotion?: {
    id?: string;
    type: string;
    value?: number;
    total_price?: number; // Added for discount-type promotions
  };
}

interface CartStore {
  items: CartItem[];
  showCart: boolean;
  loading: boolean;
  error: string | null;
  
  // Getters
  getCartItems: () => CartItem[];
  getCartTotal: () => number;
  getCartCount: () => number;
  
  // Actions
  initCart: () => void;
  saveCart: () => void;
  addToCart: (product: CartItem, quantity?: number) => void;
  addItem: (product: any, quantity?: number, selectedColor?: string) => void; // Added this function
  updateQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  toggleCart: () => void;
  checkout: (shippingInfo: any) => Promise<any>;
  applyPromotions: () => void;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  showCart: false,
  loading: false,
  error: null,
  
  // Getters
  getCartItems: () => get().items,
  
  getCartTotal: () => {
    return get().items.reduce((total, item) => {
      // Calcular precio con promociones si aplica
      let finalPrice = item.price;
      
      if (item.promotion) {
        const { type, value, total_price } = item.promotion;
        const { price, quantity } = item;
        
        if (type === 'discount' && total_price) {
          // Para descuentos de precio fijo, usar el precio promocional
          finalPrice = total_price * quantity;
        } else if (type === 'percentage') {
          finalPrice = price * (1 - (value || 0) / 100) * quantity;
        } else if (type === 'fixed') {
          finalPrice = Math.max(0, price - (value || 0)) * quantity;
        } else if (type === '2x1' && quantity >= 2) {
          const fullPriceSets = Math.floor(quantity / 2);
          const remainder = quantity % 2;
          finalPrice = (fullPriceSets + remainder) * price;
        } else if (type === '3x2' && quantity >= 3) {
          const fullPriceSets = Math.floor(quantity / 3);
          const remainder = quantity % 3;
          finalPrice = (fullPriceSets * 2 + remainder) * price;
        } else if (type === '3x1' && quantity >= 3) {
          const fullPriceSets = Math.floor(quantity / 3);
          const remainder = quantity % 3;
          finalPrice = (fullPriceSets + remainder) * price;
        } else {
          finalPrice = price * quantity;
        }
      } else {
        finalPrice = item.price * item.quantity;
      }
      
      return total + finalPrice;
    }, 0);
  },
  
  getCartCount: () => {
    return get().items.reduce((count, item) => count + item.quantity, 0);
  },
  
  // Actions
  initCart: () => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      set({ items: JSON.parse(savedCart) });
    }
    // Aplicar promociones al inicializar el carrito
    get().applyPromotions();
  },
  
  saveCart: () => {
    localStorage.setItem('cart', JSON.stringify(get().items));
  },
  
  addToCart: (product, quantity = 1) => {
    const items = get().items;
    const existingProductIndex = items.findIndex(item => item.id === product.id);
    
    if (existingProductIndex >= 0) {
      // Si el producto ya existe, incrementar la cantidad
      const updatedItems = [...items];
      updatedItems[existingProductIndex].quantity += quantity;
      set({ items: updatedItems });
    } else {
      // Si es un producto nuevo, agregarlo al carrito
      set({ items: [...items, { ...product, quantity }] });
    }
    
    // Aplicar promociones después de modificar el carrito
    get().applyPromotions();
    
    // Guardar carrito actualizado
    get().saveCart();
  },
  
  // Added this function to fix the error
  addItem: (product, quantity = 1, selectedColor) => {
    // Create a cart item from the product with the selected color info if needed
    const cartItem = {
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images?.[0] || '',
      quantity: quantity,
      selectedColor: selectedColor
    };
    
    // Call the existing addToCart function
    get().addToCart(cartItem, quantity);
  },
  
  updateQuantity: (productId, quantity) => {
    const items = get().items;
    const index = items.findIndex(item => item.id === productId);
    
    if (index >= 0) {
      const updatedItems = [...items];
      
      if (quantity <= 0) {
        // Si la cantidad es 0 o negativa, eliminar el producto
        updatedItems.splice(index, 1);
      } else {
        // Actualizar la cantidad
        updatedItems[index].quantity = quantity;
      }
      
      set({ items: updatedItems });
      
      // Aplicar promociones después de modificar el carrito
      get().applyPromotions();
      
      get().saveCart();
    }
  },
  
  removeFromCart: (productId) => {
    const items = get().items;
    const index = items.findIndex(item => item.id === productId);
    
    if (index >= 0) {
      const updatedItems = [...items];
      updatedItems.splice(index, 1);
      set({ items: updatedItems });
      
      // Aplicar promociones después de modificar el carrito
      get().applyPromotions();
      
      get().saveCart();
    }
  },
  
  clearCart: () => {
    set({ items: [] });
    get().saveCart();
  },
  
  toggleCart: () => {
    set(state => ({ showCart: !state.showCart }));
  },
  
  // Nueva función para aplicar promociones activas a los productos del carrito
  applyPromotions: () => {
    const promotionStore = usePromotionStore.getState();
    const activePromotions = promotionStore.getActivePromotions();
    
    if (activePromotions.length === 0) return;
    
    const updatedItems = get().items.map(item => {
      // Buscar promociones aplicables a este producto
      const applicablePromotion = activePromotions.find(promo => {
        // Si la promoción tiene product_ids, verificar si este producto está incluido
        if (promo.product_ids && promo.product_ids.length > 0) {
          return promo.product_ids.includes(item.id);
        }
        
        // Si la promoción tiene category_ids, verificar si este producto pertenece a alguna categoría
        // Esto requeriría información adicional sobre las categorías del producto
        
        // Si no hay restricciones específicas, la promoción se aplica a todos los productos
        return !promo.product_ids && !promo.category_ids;
      });
      
      if (applicablePromotion) {
        return {
          ...item,
          promotion: {
            id: applicablePromotion.id,
            type: applicablePromotion.type,
            value: applicablePromotion.value,
            total_price: applicablePromotion.total_price
          }
        };
      }
      
      return item;
    });
    
    set({ items: updatedItems });
  },
  
  checkout: async (shippingInfo) => {
    set({ loading: true, error: null });
    
    try {
      // Verificar si el usuario está autenticado
      const { data: { user } } = await supabase.auth.getUser();
      
      // Crear la orden en la base de datos
      const { data, error } = await supabase
        .from('orders')
        .insert([
          {
            user_id: user?.id || null,
            total: get().getCartTotal(),
            products: get().items,
            shipping_address: shippingInfo,
            status: 'preparation'
          }
        ])
        .select();
      
      if (error) throw error;
      
      // Si el usuario está autenticado, actualizar sus puntos
      if (user) {
        // Obtener configuración de puntos
        const { data: configData } = await supabase
          .from('loyalty_config')
          .select('*')
          .eq('id', 1)
          .single();
        
        if (configData && configData.active) {
          const pointsToAdd = Math.floor(get().getCartTotal() * configData.points_per_purchase);
          
          // Obtener puntos actuales del usuario
          const { data: userData } = await supabase
            .from('users')
            .select('points')
            .eq('id', user.id)
            .single();
          
          const currentPoints = userData?.points || 0;
          
          // Actualizar puntos
          await supabase
            .from('users')
            .update({ points: currentPoints + pointsToAdd })
            .eq('id', user.id);
        }
      }
      
      // Limpiar carrito después de la compra exitosa
      get().clearCart();
      set({ loading: false });
      
      return { success: true, order: data?.[0] };
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  }
}));