import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CartItem, Product } from '../types';

// Define la nueva clave para localStorage con la utilidad persist
const CART_STORAGE_KEY_PERSIST = 'cartState_v2_persist';

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  total: number;
}

interface CartActions {
  addItem: (product: Product, quantity?: number, selectedColor?: string) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  // Añadimos una acción para rehidratar o verificar el estado si es necesario (aunque persist lo hace auto)
  hydrate: () => void;
}

interface CartStore extends CartState, CartActions {}

const initialState: CartState = {
  items: [],
  isOpen: false,
  total: 0,
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      hydrate: () => {
        console.log('cartStore (persist v2): Hydrate action called. Current state:', get());
        // Zustand persist maneja la rehidratación automáticamente al inicio.
        // Esta función puede ser usada para forzar una re-evaluación o log si es necesario.
      },

      toggleCart: () => {
        set((state) => {
          console.log('cartStore (persist v2): toggleCart. Previous isOpen:', state.isOpen);
          return { isOpen: !state.isOpen };
        });
      },

      addItem: (product: Product, quantity = 1, selectedColor?: string) => {
        set((state) => {
          const items = [...state.items];
          const existingItem = items.find(
            (item) => item.product.id === product.id && item.selectedColor === selectedColor
          );

          if (existingItem) {
            existingItem.quantity += quantity;
          } else {
            items.push({ product, quantity, selectedColor });
          }

          const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
          console.log('cartStore (persist v2): addItem. Product:', product.id, 'New total:', total);
          return { items, total };
        });
      },

      removeItem: (productId: string) => {
        set((state) => {
          const items = state.items.filter((item) => item.product.id !== productId);
          const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
          console.log('cartStore (persist v2): removeItem. ProductID:', productId, 'New total:', total);
          return { items, total };
        });
      },

      updateQuantity: (productId: string, quantity: number) => {
        set((state) => {
          const items = state.items
            .map((item) =>
              item.product.id === productId ? { ...item, quantity: Math.max(0, quantity) } : item
            )
            .filter((item) => item.quantity > 0);

          const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
          console.log('cartStore (persist v2): updateQuantity. ProductID:', productId, 'New quantity:', quantity, 'New total:', total);
          return { items, total };
        });
      },

      clearCart: () => {
        console.log('cartStore (persist v2): clearCart CALLED!');
        set({ items: [], total: 0 });
      },
    }),
    {
      name: CART_STORAGE_KEY_PERSIST, // Nombre de la clave en localStorage
      storage: createJSONStorage(() => localStorage), // Usa localStorage
      onRehydrateStorage: (state) => {
        console.log('cartStore (persist v2): Hydration starts. Current state:', state);
        return (state, error) => {
          if (error) {
            console.error('cartStore (persist v2): An error occurred during hydration:', error);
          } else {
            console.log('cartStore (persist v2): Hydration finished. Zustand state:', state);
          }
        };
      },
      // Filtro para persistir solo items y total, isOpen es transitorio o manejado diferente
      // Si queremos persistir isOpen también, lo añadimos aquí.
      // Por ahora, lo dejamos como estaba en la versión anterior (se persistía)
      partialize: (state) => ({ items: state.items, total: state.total, isOpen: state.isOpen }),
    }
  )
);

// Llamar a hydrate al inicio si es necesario para asegurar que el estado se cargue y se loguee.
// Aunque persist lo hace automáticamente, esto puede ser útil para depuración temprana.
// setTimeout(() => useCartStore.getState().hydrate(), 0);

console.log('cartStore (persist v2): Store initialized. Initial Zustand state:', useCartStore.getState());

