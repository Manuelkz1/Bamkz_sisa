// cartStore.ts - Versión corregida con importación adecuada
// Importación adaptada a la estructura del proyecto
import { defineStore } from 'vuex';
import { supabase } from '@/supabase';

// Definición de la tienda usando la estructura de Vuex en lugar de Pinia
export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [],
    showCart: false,
    loading: false,
    error: null
  }),
  
  getters: {
    cartItems: (state) => state.items,
    cartTotal: (state) => {
      return state.items.reduce((total, item) => {
        // Calcular precio con promociones si aplica
        let finalPrice = item.price;
        
        if (item.promotion) {
          const { type, value } = item.promotion;
          const { price, quantity } = item;
          
          // Manejo síncrono de promociones
          if (type === 'discount') {
            // Para descuentos, usamos un valor predeterminado hasta que se carguen los datos
            finalPrice = price * 0.9; // Asumimos 10% de descuento por defecto
          } else if (type === 'percentage') {
            finalPrice = price * (1 - (value || 0) / 100);
          } else if (type === 'fixed') {
            finalPrice = Math.max(0, price - (value || 0));
          } else if (type === '2x1' && quantity >= 2) {
            finalPrice = Math.floor(quantity / 2) * price + (quantity % 2) * price;
          } else if (type === '3x2' && quantity >= 3) {
            finalPrice = Math.floor(quantity / 3) * 2 * price + (quantity % 3) * price;
          } else if (type === '3x1' && quantity >= 3) {
            finalPrice = Math.floor(quantity / 3) * price + (quantity % 3) * price;
          } else {
            finalPrice = price * quantity;
          }
        } else {
          finalPrice = item.price * item.quantity;
        }
        
        return total + finalPrice;
      }, 0);
    },
    cartCount: (state) => {
      return state.items.reduce((count, item) => count + item.quantity, 0);
    }
  },
  
  actions: {
    // Cargar carrito desde localStorage al iniciar
    initCart() {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        this.items = JSON.parse(savedCart);
      }
    },
    
    // Guardar carrito en localStorage
    saveCart() {
      localStorage.setItem('cart', JSON.stringify(this.items));
    },
    
    // Añadir producto al carrito
    addToCart(product, quantity = 1) {
      // Buscar si el producto ya existe en el carrito
      const existingProductIndex = this.items.findIndex(item => item.id === product.id);
      
      if (existingProductIndex >= 0) {
        // Si el producto ya existe, incrementar la cantidad
        this.items[existingProductIndex].quantity += quantity;
      } else {
        // Si es un producto nuevo, agregarlo al carrito
        this.items.push({
          ...product,
          quantity: quantity
        });
      }
      
      // Guardar carrito actualizado
      this.saveCart();
    },
    
    // Actualizar cantidad de un producto
    updateQuantity(productId, quantity) {
      const index = this.items.findIndex(item => item.id === productId);
      if (index >= 0) {
        if (quantity <= 0) {
          // Si la cantidad es 0 o negativa, eliminar el producto
          this.items.splice(index, 1);
        } else {
          // Actualizar la cantidad
          this.items[index].quantity = quantity;
        }
        this.saveCart();
      }
    },
    
    // Eliminar producto del carrito
    removeFromCart(productId) {
      const index = this.items.findIndex(item => item.id === productId);
      if (index >= 0) {
        this.items.splice(index, 1);
        this.saveCart();
      }
    },
    
    // Vaciar carrito
    clearCart() {
      this.items = [];
      this.saveCart();
    },
    
    // Mostrar/ocultar carrito
    toggleCart() {
      this.showCart = !this.showCart;
    },
    
    // Procesar compra
    checkout(shippingInfo) {
      this.loading = true;
      this.error = null;
      
      // Función para manejar la lógica asíncrona
      const processCheckout = async () => {
        try {
          // Verificar si el usuario está autenticado
          const { data: { user } } = await supabase.auth.getUser();
          
          // Crear la orden en la base de datos
          const { data, error } = await supabase
            .from('orders')
            .insert([
              {
                user_id: user?.id || null,
                total: this.cartTotal,
                products: this.items,
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
              const pointsToAdd = Math.floor(this.cartTotal * configData.points_per_purchase);
              
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
          this.clearCart();
          this.loading = false;
          
          return { success: true, order: data[0] };
        } catch (error) {
          this.error = error.message;
          this.loading = false;
          return { success: false, error: error.message };
        }
      };
      
      // Devolver la promesa para que el componente pueda manejarla
      return processCheckout();
    }
  }
});
