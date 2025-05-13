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
  rehydrate: () => void; // Added from Bolt's version for manual rehydration
}

// Create a custom storage object with logging (from Bolt's version)
const customStorage = {
  getItem: (name: string): string | null => {
    const value = localStorage.getItem(name);
    console.log(`[CartStore Bolt v3] Reading from localStorage:`, { key: name, value });
    return value;
  },
  setItem: (name: string, value: string): void => {
    console.log(`[CartStore Bolt v3] Writing to localStorage:`, { key: name, value });
    localStorage.setItem(name, value);
  },
  removeItem: (name: string): void => {
    console.log(`[CartStore Bolt v3] Removing from localStorage:`, { key: name });
    localStorage.removeItem(name);
  },
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      total: 0,

      toggleCart: () => set((state) => {
        console.log('[CartStore Bolt v3] toggleCart. Previous isOpen:', state.isOpen);
        return { isOpen: !state.isOpen };
      }),

      addItem: (product: Product, quantity = 1, selectedColor?: string) => {
        console.log('[CartStore Bolt v3] Adding item:', { product, quantity, selectedColor });
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
          console.log('[CartStore Bolt v3] addItem. Product:', product.id, 'New total:', total);
          return { items, total };
        });
      },

      removeItem: (productId: string) => {
        console.log('[CartStore Bolt v3] Removing item:', { productId });
        set((state) => {
          const items = state.items.filter((item) => item.product.id !== productId);
          const total = items.reduce(
            (sum, item) => sum + item.product.price * item.quantity,
            0
          );
          console.log('[CartStore Bolt v3] removeItem. ProductID:', productId, 'New total:', total);
          return { items, total };
        });
      },

      updateQuantity: (productId: string, quantity: number) => {
        console.log('[CartStore Bolt v3] Updating quantity:', { productId, quantity });
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
          console.log('[CartStore Bolt v3] updateQuantity. ProductID:', productId, 'New quantity:', quantity, 'New total:', total);
          return { items, total };
        });
      },

      clearCart: () => {
        console.log('[CartStore Bolt v3] Clearing cart');
        set({ items: [], total: 0, isOpen: false }); // isOpen also reset as per Bolt
      },
      // Manual rehydrate function from Bolt's version
      rehydrate: () => {
        console.log('[CartStore Bolt v3] Manual rehydrate called.');
        const stored = customStorage.getItem('cart-storage-bolt-v3'); // Use the new key and custom storage
        if (stored) {
          try {
            const data = JSON.parse(stored);
            // Zustand's persist middleware stores the state under a 'state' property
            if (data && data.state && Array.isArray(data.state.items)) {
              set({
                items: data.state.items,
                total: data.state.total,
                isOpen: data.state.isOpen !== undefined ? data.state.isOpen : get().isOpen, // Persist isOpen if available
              });
              console.log('[CartStore Bolt v3] Manual rehydration successful:', get());
            } else {
              console.warn('[CartStore Bolt v3] Manual rehydration: stored data format incorrect or items missing.', data);
            }
          } catch (error) {
            console.error('[CartStore Bolt v3] Manual rehydration failed:', error);
          }
        } else {
          console.log('[CartStore Bolt v3] Manual rehydration: No data found in storage for cart-storage-bolt-v3.');
        }
      },
    }),
    {
      name: 'cart-storage-bolt-v3', // New storage key from Bolt
      storage: createJSONStorage(() => customStorage), // Using customStorage with logging
      partialize: (state) => ({
        items: state.items,
        total: state.total,
        isOpen: state.isOpen, // Persisting isOpen as per Bolt's partialize and rehydrate logic
      }),
      onRehydrateStorage: (state) => {
        console.log('[CartStore Bolt v3] onRehydrateStorage: Hydration starts. Zustand will manage this. Initial state from storage:', state);
        return (hydratedState, error) => {
          if (error) {
            console.error('[CartStore Bolt v3] onRehydrateStorage: An error occurred during hydration:', error);
          } else {
            console.log('[CartStore Bolt v3] onRehydrateStorage: Hydration finished. Zustand state:', hydratedState);
          }
        };
      },
    }
  )
);

console.log('[CartStore Bolt v3] Store initialized. Initial Zustand state:', useCartStore.getState());
// Optional: Call rehydrate once after initialization if persist doesn't trigger early enough for some race conditions.
// setTimeout(() => useCartStore.getState().rehydrate(), 100); // Example of delayed manual rehydrate if needed

