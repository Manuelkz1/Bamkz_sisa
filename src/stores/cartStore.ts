import { create } from 'zustand';
import { CartItem, Product } from '../types';

// Define la clave para sessionStorage
const CART_STORAGE_KEY = 'cartState_v1';

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

// Función para cargar el estado inicial desde sessionStorage
const loadState = (): CartState => {
  try {
    const storedState = sessionStorage.getItem(CART_STORAGE_KEY);
    if (storedState) {
      const parsedState = JSON.parse(storedState);
      if (Array.isArray(parsedState.items) && typeof parsedState.total === 'number') {
        console.log('cartStore: Loaded state from sessionStorage:', parsedState);
        return parsedState;
      }
    }
  } catch (error) {
    console.error('cartStore: Error loading state from sessionStorage:', error);
    sessionStorage.removeItem(CART_STORAGE_KEY);
  }
  console.log('cartStore: No valid state in sessionStorage, initializing with default.');
  return { items: [], isOpen: false, total: 0 };
};

// Función para guardar el estado en sessionStorage
const saveState = (state: CartState) => {
  try {
    const stateToSave = { items: state.items, total: state.total, isOpen: state.isOpen };
    sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(stateToSave));
    console.log('cartStore: Saved state to sessionStorage:', stateToSave);
  } catch (error) {
    console.error('cartStore: Error saving state to sessionStorage:', error);
  }
};

export const useCartStore = create<CartStore>((set, get) => {
  const initialState = loadState();

  return {
    ...initialState,

    toggleCart: () => {
      set((state) => {
        const newState = { ...state, isOpen: !state.isOpen };
        saveState(newState);
        return { isOpen: !state.isOpen };
      });
    },

    addItem: (product: Product, quantity = 1, selectedColor?: string) => {
      set((state) => {
        const items = [...state.items];
        const existingItem = items.find(item => 
          item.product.id === product.id && 
          item.selectedColor === selectedColor
        );

        if (existingItem) {
          existingItem.quantity += quantity;
        } else {
          items.push({ product, quantity, selectedColor });
        }

        const total = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
        const newState = { ...state, items, total };
        saveState(newState);
        return newState;
      });
    },

    removeItem: (productId: string) => {
      set((state) => {
        const items = state.items.filter(item => item.product.id !== productId);
        const total = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
        const newState = { ...state, items, total };
        saveState(newState);
        return newState;
      });
    },

    updateQuantity: (productId: string, quantity: number) => {
      set((state) => {
        const items = state.items.map(item => 
          item.product.id === productId 
            ? { ...item, quantity: Math.max(0, quantity) }
            : item
        ).filter(item => item.quantity > 0);

        const total = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
        const newState = { ...state, items, total };
        saveState(newState);
        return newState;
      });
    },

    clearCart: () => {
      console.log('cartStore: clearCart CALLED!'); // <--- LÍNEA AÑADIDA PARA DEPURACIÓN
      set((state) => {
        const newState = { ...state, items: [], total: 0 };
        saveState(newState);
        return { items: [], total: 0 }; 
      });
    },
  };
});

// Opcional: Si necesitas una forma de recargar el estado manualmente desde fuera del store
// (aunque con esta implementación, se carga al inicio automáticamente)
// export const hydrateCartStore = () => {
//   useCartStore.setState(loadState());
// };

