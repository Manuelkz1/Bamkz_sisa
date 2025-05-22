import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from '../types';

export interface CartItem {
  product: Product;
  quantity: number;
  selectedColor?: string;
}

interface PromotionApplied {
  productId: string;
  type: string;
  discount: number;
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  promotionsApplied: PromotionApplied[];
  total: number;
  
  addItem: (product: Product, quantity: number, selectedColor?: string) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  calculateTotal: () => void;
  rehydrate: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      promotionsApplied: [],
      total: 0,

      addItem: (product, quantity = 1, selectedColor) => {
        const items = [...get().items];
        const existingItemIndex = items.findIndex(
          item => item.product.id === product.id && item.selectedColor === selectedColor
        );

        if (existingItemIndex >= 0) {
          items[existingItemIndex].quantity += quantity;
        } else {
          items.push({ product, quantity, selectedColor });
        }

        set({ items });
        get().calculateTotal();
      },

      removeItem: (productId) => {
        const items = get().items.filter(item => item.product.id !== productId);
        set({ items });
        get().calculateTotal();
      },

      updateQuantity: (productId, quantity) => {
        const items = get().items.map(item => 
          item.product.id === productId 
            ? { ...item, quantity: Math.max(0, quantity) }
            : item
        ).filter(item => item.quantity > 0);

        set({ items });
        get().calculateTotal();
      },

      clearCart: () => {
        set({ items: [], promotionsApplied: [], total: 0 });
      },

      toggleCart: () => {
        set(state => ({ isOpen: !state.isOpen }));
      },

      calculateTotal: () => {
        const items = get().items;
        let total = 0;
        const promotionsApplied: PromotionApplied[] = [];

        items.forEach(item => {
          const { product, quantity } = item;
          
          // Check for promotions
          if (product.promotion) {
            const { type } = product.promotion;
            
            if (type === '2x1' && quantity >= 2) {
              // For 2x1: pay for half the items (rounded up if odd number)
              const paidItems = Math.ceil(quantity / 2);
              const discount = (quantity - paidItems) * product.price;
              
              total += paidItems * product.price;
              promotionsApplied.push({
                productId: product.id,
                type,
                discount
              });
            } 
            else if (type === '3x2' && quantity >= 3) {
              // For 3x2: for every 3 items, pay for 2
              const sets = Math.floor(quantity / 3);
              const remainder = quantity % 3;
              
              const paidItems = (sets * 2) + remainder;
              const discount = (quantity - paidItems) * product.price;
              
              total += paidItems * product.price;
              promotionsApplied.push({
                productId: product.id,
                type,
                discount
              });
            }
            else if (type === '3x1' && quantity >= 3) {
              // For 3x1: for every 3 items, pay for 1
              const sets = Math.floor(quantity / 3);
              const remainder = quantity % 3;
              
              const paidItems = sets + remainder;
              const discount = (quantity - paidItems) * product.price;
              
              total += paidItems * product.price;
              promotionsApplied.push({
                productId: product.id,
                type,
                discount
              });
            }
            else if (type === 'discount') {
              // For percentage discount
              const discountPercent = 20; // Default 20% discount
              const discountAmount = (product.price * quantity) * (discountPercent / 100);
              
              total += (product.price * quantity) - discountAmount;
              promotionsApplied.push({
                productId: product.id,
                type,
                discount: discountAmount
              });
            }
            else {
              // No promotion or not enough quantity
              total += product.price * quantity;
            }
          } else {
            // No promotion
            total += product.price * quantity;
          }
        });

        set({ total, promotionsApplied });
      },

      rehydrate: () => {
        // This function is called to force a recalculation of the cart
        // after the store is rehydrated from localStorage
        get().calculateTotal();
      }
    }),
    {
      name: 'cart-storage',
      getStorage: () => localStorage,
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.calculateTotal();
        }
      }
    }
  )
);