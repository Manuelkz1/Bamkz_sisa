import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CartItem, Product, Promotion } from "../types";
import { supabase } from "../lib/supabase";

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  total: number;
  promotionsApplied: {
    productId: string;
    promotionId: string;
    type: string;
    discount: number;
  }[];
}

interface CartStore extends CartState {
  addItem: (product: Product, quantity?: number, selectedColor?: string) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  rehydrate: () => void;
  calculateTotal: () => void;
  getActivePromotions: () => Promise<void>;
}

// Create a custom storage object with logging
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
      promotionsApplied: [],

      toggleCart: () => set((state) => {
        console.log("[CartStore Bolt v3] toggleCart. Previous isOpen:", state.isOpen);
        return { isOpen: !state.isOpen };
      }),

      addItem: (product: Product, quantity = 1, selectedColor?: string) => {
        console.log("[CartStore Bolt v3] Adding item:", { product, quantity, selectedColor });
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

          // Después de actualizar los items, recalcular el total con promociones
          const newState = { items };
          get().getActivePromotions().then(() => {
            get().calculateTotal();
          });
          
          return newState;
        });
      },

      removeItem: (productId: string) => {
        console.log("[CartStore Bolt v3] Removing item:", { productId });
        set((state) => {
          const items = state.items.filter((item) => item.product.id !== productId);
          const newState = { items };
          
          // Recalcular el total después de eliminar el item
          get().getActivePromotions().then(() => {
            get().calculateTotal();
          });
          
          return newState;
        });
      },

      updateQuantity: (productId: string, quantity: number) => {
        console.log("[CartStore Bolt v3] Updating quantity:", { productId, quantity });
        set((state) => {
          const items = state.items
            .map((item) =>
              item.product.id === productId
                ? { ...item, quantity: Math.max(0, quantity) }
                : item
            )
            .filter((item) => item.quantity > 0);

          const newState = { items };
          
          // Recalcular el total después de actualizar la cantidad
          get().getActivePromotions().then(() => {
            get().calculateTotal();
          });
          
          return newState;
        });
      },

      clearCart: () => {
        console.log("[CartStore Bolt v3] Clearing cart");
        set({ items: [], total: 0, isOpen: false, promotionsApplied: [] });
      },

      rehydrate: () => {
        console.log("[CartStore Bolt v3] Manual rehydrate called.");
        const stored = customStorage.getItem("cart-storage-bolt-v3");
        if (stored) {
          try {
            const data = JSON.parse(stored);
            if (data && data.state && Array.isArray(data.state.items)) {
              set({
                items: data.state.items,
                total: data.state.total,
                isOpen: data.state.isOpen !== undefined ? data.state.isOpen : get().isOpen,
                promotionsApplied: data.state.promotionsApplied || [],
              });
              console.log("[CartStore Bolt v3] Manual rehydration successful:", get());
              
              // Recalcular promociones y total después de rehidratar
              get().getActivePromotions().then(() => {
                get().calculateTotal();
              });
            } else {
              console.warn("[CartStore Bolt v3] Manual rehydration: stored data format incorrect or items missing.", data);
            }
          } catch (error) {
            console.error("[CartStore Bolt v3] Manual rehydration failed:", error);
          }
        } else {
          console.log("[CartStore Bolt v3] Manual rehydration: No data found in storage for cart-storage-bolt-v3.");
        }
      },

      // Nueva función para obtener promociones activas
      getActivePromotions: async () => {
        const { items } = get();
        if (items.length === 0) {
          set({ promotionsApplied: [] });
          return;
        }

        try {
          // Obtener IDs de productos en el carrito
          const productIds = items.map(item => item.product.id);
          
          // Buscar promociones activas para estos productos
          const { data: promotionProducts, error } = await supabase
            .from('promotion_products')
            .select(`
              product_id,
              promotion:promotions(
                id, name, type, buy_quantity, get_quantity, total_price, is_active
              )
            `)
            .in('product_id', productIds)
            .filter('promotion.is_active', 'eq', true)
            .filter('promotion.start_date', 'lte', new Date().toISOString())
            .filter('promotion.end_date', 'gte', new Date().toISOString());

          if (error) {
            console.error("Error al obtener promociones:", error);
            return;
          }

          // Mapear promociones a productos
          const promotionsApplied = promotionProducts
            .filter(pp => pp.promotion) // Asegurarse de que hay una promoción válida
            .map(pp => ({
              productId: pp.product_id,
              promotionId: pp.promotion.id,
              type: pp.promotion.type,
              discount: 0, // Se calculará en calculateTotal
            }));

          set({ promotionsApplied });
        } catch (error) {
          console.error("Error al procesar promociones:", error);
        }
      },

      // Nueva función para calcular el total con promociones
      calculateTotal: () => {
        const { items, promotionsApplied } = get();
        let total = 0;
        let updatedPromotions = [...promotionsApplied];

        // Agrupar items por promoción
        const itemsByPromotion: Record<string, CartItem[]> = {};
        
        // Inicializar con todos los items sin promoción
        const itemsWithoutPromotion = [...items];
        
        // Separar items con promociones
        promotionsApplied.forEach(promo => {
          if (!itemsByPromotion[promo.promotionId]) {
            itemsByPromotion[promo.promotionId] = [];
          }
          
          const itemIndex = itemsWithoutPromotion.findIndex(
            item => item.product.id === promo.productId
          );
          
          if (itemIndex >= 0) {
            itemsByPromotion[promo.promotionId].push(itemsWithoutPromotion[itemIndex]);
            itemsWithoutPromotion.splice(itemIndex, 1);
          }
        });

        // Calcular total para items sin promoción
        itemsWithoutPromotion.forEach(item => {
          total += item.product.price * item.quantity;
        });

        // Calcular total para items con promoción
        Object.entries(itemsByPromotion).forEach(([promotionId, promoItems]) => {
          if (promoItems.length === 0) return;
          
          const promotion = promotionsApplied.find(p => p.promotionId === promotionId);
          if (!promotion) return;
          
          const item = promoItems[0]; // Tomamos el primer item para esta promoción
          
          switch (promotion.type) {
            case '2x1':
              // Por cada 2 unidades, se cobra solo 1
              const pairs = Math.floor(item.quantity / 2);
              const remaining = item.quantity % 2;
              total += (pairs * item.product.price) + (remaining * item.product.price);
              
              // Actualizar el descuento aplicado
              const discount2x1 = pairs * item.product.price;
              updatedPromotions = updatedPromotions.map(p => 
                p.promotionId === promotionId ? { ...p, discount: discount2x1 } : p
              );
              break;
              
            case '3x1':
              // Por cada 3 unidades, se cobra solo 1
              const triplets = Math.floor(item.quantity / 3);
              const remaining3x1 = item.quantity % 3;
              total += (triplets * item.product.price) + (remaining3x1 * item.product.price);
              
              // Actualizar el descuento aplicado
              const discount3x1 = triplets * item.product.price * 2; // Se ahorran 2 unidades por cada triplete
              updatedPromotions = updatedPromotions.map(p => 
                p.promotionId === promotionId ? { ...p, discount: discount3x1 } : p
              );
              break;
              
            case '3x2':
              // Por cada 3 unidades, se cobran solo 2
              const triplets3x2 = Math.floor(item.quantity / 3);
              const remaining3x2 = item.quantity % 3;
              total += (triplets3x2 * 2 * item.product.price) + (remaining3x2 * item.product.price);
              
              // Actualizar el descuento aplicado
              const discount3x2 = triplets3x2 * item.product.price; // Se ahorra 1 unidad por cada triplete
              updatedPromotions = updatedPromotions.map(p => 
                p.promotionId === promotionId ? { ...p, discount: discount3x2 } : p
              );
              break;
              
            default:
              // Promoción de precio especial o descuento
              if (promotion.type === 'discount') {
                // Aplicar descuento del 20%
                const discountedPrice = item.product.price * 0.8;
                total += discountedPrice * item.quantity;
                
                // Actualizar el descuento aplicado
                const discountAmount = (item.product.price - discountedPrice) * item.quantity;
                updatedPromotions = updatedPromotions.map(p => 
                  p.promotionId === promotionId ? { ...p, discount: discountAmount } : p
                );
              } else {
                // Usar precio normal si no se reconoce el tipo de promoción
                total += item.product.price * item.quantity;
              }
          }
        });

        set({ total, promotionsApplied: updatedPromotions });
      }
    }),
    {
      name: "cart-storage-bolt-v3",
      storage: createJSONStorage(() => customStorage),
      partialize: (state) => ({
        items: state.items,
        total: state.total,
        isOpen: state.isOpen,
        promotionsApplied: state.promotionsApplied,
      }),
      onRehydrateStorage: (state) => {
        console.log("[CartStore Bolt v3] onRehydrateStorage: Hydration starts. Zustand will manage this. Initial state from storage:", state);
        return (hydratedState, error) => {
          if (error) {
            console.error("[CartStore Bolt v3] onRehydrateStorage: An error occurred during hydration:", error);
          } else {
            console.log("[CartStore Bolt v3] onRehydrateStorage: Hydration finished. Zustand state:", hydratedState);
            // Recalcular promociones y total después de rehidratar
            if (hydratedState) {
              setTimeout(() => {
                hydratedState.getActivePromotions().then(() => {
                  hydratedState.calculateTotal();
                });
              }, 100);
            }
          }
        };
      },
    }
  )
);

console.log("[CartStore Bolt v3] Store initialized. Initial Zustand state:", useCartStore.getState());
// Iniciar cálculo de promociones después de la inicialización
setTimeout(() => {
  const store = useCartStore.getState();
  store.getActivePromotions().then(() => {
    store.calculateTotal();
  });
}, 200);

