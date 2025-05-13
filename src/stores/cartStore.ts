import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CartItem, Product } from '../types';

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  total: number;
}

interface CartStore extends CartState {
  addItem: (product: Product, quantity?: number, selectedColor?: string) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
}

// Create a custom storage object with logging
const customStorage = {
  getItem: (name: string): string | null => {
    const value = localStorage.getItem(name);
    console.log(`[CartStore] Reading from localStorage:`, { key: name, value });
    return value;
  },
  setItem: (name: string, value: string): void => {
    console.log(`[CartStore] Writing to localStorage:`, { key: name, value });
    localStorage.setItem(name, value);
  },
  removeItem: (name: string): void => {
    console.log(`[CartStore] Removing from localStorage:`, { key: name });
    localStorage.removeItem(name);
  },
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      total: 0,

      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      addItem: (product: Product, quantity = 1, selectedColor?: string) => {
        console.log('[CartStore] Adding item:', { product, quantity, selectedColor });
        set((state) => {
          const items = [...state.items];
          const existingItem = items.find(
            (item) =>
              item.product.id === product.id && item.selectedColor === selectedColor
          );

          if (existingItem) {
            existingItem.quantity += quantity;
          } else {
            items.push({ product, quantity, selectedColor });
          }

          const total = items.reduce(
            (sum, item) => sum + item.product.price * item.quantity,
            0
          );

          return { items, total };
        });
      },

      removeItem: (productId: string) => {
        console.log('[CartStore] Removing item:', { productId });
        set((state) => {
          const items = state.items.filter((item) => item.product.id !== productId);
          const total = items.reduce(
            (sum, item) => sum + item.product.price * item.quantity,
            0
          );
          return { items, total };
        });
      },

      updateQuantity: (productId: string, quantity: number) => {
        console.log('[CartStore] Updating quantity:', { productId, quantity });
        set((state) => {
          const items = state.items
            .map((item) =>
              item.product.id === productId
                ? { ...item, quantity: Math.max(0, quantity) }
                : item
            )
            .filter((item) => item.quantity > 0);

          const total = items.reduce(
            (sum, item) => sum + item.product.price * item.quantity,
            0
          );
          return { items, total };
        });
      },

      clearCart: () => {
        console.log('[CartStore] Clearing cart');
        set({ items: [], total: 0, isOpen: false });
      },
    }),
    {
      name: 'cart-storage-v3',
      storage: createJSONStorage(() => customStorage),
      partialize: (state) => ({
        items: state.items,
        total: state.total,
      }),
      onRehydrateStorage: () => (state) => {
        console.log('[CartStore] Rehydration complete:', state);
      },
    }
  )
);

// Export a function to manually rehydrate the cart if needed
export const rehydrateCart = () => {
  const stored = localStorage.getItem('cart-storage-v3');
  if (stored) {
    try {
      const data = JSON.parse(stored);
      if (data.state && Array.isArray(data.state.items)) {
        useCartStore.setState({
          items: data.state.items,
          total: data.state.total,
          isOpen: false,
        });
        console.log('[CartStore] Manual rehydration successful:', data.state);
      }
    } catch (error) {
      console.error('[CartStore] Manual rehydration failed:', error);
    }
  }
};