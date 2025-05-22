import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { useCartStore } from '../stores/cartStore';

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  paymentMethod: string;
}

export function GuestCheckout() {
  const navigate = useNavigate();
  const cartStore = useCartStore();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState<FormData>(() => {
    const saved = sessionStorage.getItem("checkout-form");
    return saved ? JSON.parse(saved) : {
      fullName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      postalCode: "",
      country: "Colombia",
      paymentMethod: ""
    };
  });

  useEffect(() => {
    sessionStorage.setItem("checkout-form", JSON.stringify(formData));
  }, [formData]);

  // Referencia para controlar si el componente está montado
  const isMounted = useRef(true);
  
  // Limpiar la referencia cuando el componente se desmonte
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Función mejorada para detectar Chrome
  const isChrome = () => {
    if ('userAgentData' in navigator) {
      return (navigator as any).userAgentData.brands.some((brand: any) => 
        brand.brand.toLowerCase().includes('chrome')
      );
    }
    return navigator.userAgent.indexOf('Chrome') > -1;
  };

  // Función para manejar la redirección a Mercado Pago de manera segura
  const redirectToMercadoPago = (url: string) => {
    console.log('Iniciando redirección a:', url);
    
    // Desactivar cualquier interacción adicional
    document.body.style.pointerEvents = 'none';
    
    // Mostrar un mensaje de redirección
    toast.success('Redirigiendo a Mercado Pago...');
    
    try {
      // Crear una página intermedia de redirección para máxima compatibilidad
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Redirigiendo a Mercado Pago</title>
          <style>
            body {
              font-family: -apple-system, system-ui, sans-serif;
              background-color: #f5f5f5;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              padding: 20px;
              text-align: center;
            }
            .container {
              background-color: white;
              border-radius: 8px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              padding: 30px;
              max-width: 500px;
            }
            h1 {
              color: #3d4852;
              margin-bottom: 20px;
            }
            p {
              color: #606f7b;
              margin-bottom: 30px;
            }
            .loader {
              border: 5px solid #f3f3f3;
              border-top: 5px solid #3498db;
              border-radius: 50%;
              width: 50px;
              height: 50px;
              animation: spin 1s linear infinite;
              margin: 0 auto 20px auto;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            .redirect-button {
              background-color: #3490dc;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 16px;
              transition: background-color 0.3s;
            }
            .redirect-button:hover {
              background-color: #2779bd;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="loader"></div>
            <h1>Redirigiendo a Mercado Pago</h1>
            <p>Estás siendo redirigido a la plataforma de pago. Si no eres redirigido automáticamente en unos segundos, haz clic en el botón de abajo.</p>
            <button id="redirectButton" class="redirect-button" onclick="window.location.href='${url}'">
              Ir a Mercado Pago
            </button>
          </div>
          
          <script>
            setTimeout(() => {
              window.location.href = '${url}';
            }, 1500);
          </script>
        </body>
        </html>
      `;
      
      // Crear un blob con el HTML
      const blob = new Blob([html], { type: 'text/html' });
      const redirectPageUrl = URL.createObjectURL(blob);
      
      // Navegar a la página de redirección
      window.location.href = redirectPageUrl;

      // Método específico para Chrome
      if (isChrome()) {
        console.log('Detectado Chrome, aplicando método específico de redirección');
        setTimeout(() => {
          if (document.body) {
            const link = document.createElement('a');
            link.href = url;
            link.target = '_self';
            link.rel = 'noopener noreferrer';
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
              document.body.removeChild(link);
            }, 100);
          } else {
            console.warn('document.body no disponible para redirección Chrome');
            window.location.href = url;
          }
        }, 100);
      }
    } catch (e) {
      console.error('Error al crear página de redirección:', e);
      
      // Fallback directo en caso de error
      console.log('Usando método de redirección directo como fallback');
      window.location.href = url;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Evitar múltiples envíos
    if (loading) {
      console.log('Formulario ya en proceso, ignorando envío adicional');
      return;
    }
    
    if (!cartStore.items.length) {
      toast.error("El carrito está vacío");
      return;
    }

    if (!formData.paymentMethod) {
      toast.error("Por favor selecciona un método de pago");
      return;
    }

    // Activar estado de carga inmediatamente
    setLoading(true);
    
    // Variable para controlar si debemos restaurar el estado loading
    let shouldResetLoading = true;

    try {
      console.log('Iniciando proceso de checkout');
      
      // Crear orden
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          shipping_address: {
            full_name: formData.fullName,
            address: formData.address,
            city: formData.city,
            postal_code: formData.postalCode,
            country: formData.country,
            phone: formData.phone
          },
          guest_info: {
            full_name: formData.fullName,
            email: formData.email,
            phone: formData.phone
          },
          payment_method: formData.paymentMethod,
          total: cartStore.total,
          status: 'pending',
          payment_status: 'pending',
          is_guest: true
        })
        .select()
        .single();

      if (orderError) {
        console.error('Error al crear orden:', orderError);
        throw orderError;
      }
      
      console.log('Orden creada con ID:', order.id);

      // Crear items del pedido
      const orderItems = cartStore.items.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        price_at_time: item.product.price,
        selected_color: item.selectedColor
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('Error al crear items del pedido:', itemsError);
        throw itemsError;
      }
      
      console.log('Items del pedido creados correctamente');

      if (formData.paymentMethod === 'mercadopago') {
        try {
          console.log('Iniciando proceso de pago con Mercado Pago');
          
          // Crear preferencia de pago con timeout
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Tiempo de espera agotado')), 15000)
          );
          
          const paymentPromise = supabase.functions.invoke('create-payment', {
            body: {
              orderId: order.id,
              items: cartStore.items.map(item => ({
                product: {
                  name: item.product.name,
                  price: Number(item.product.price)
                },
                quantity: item.quantity
              })),
              total: cartStore.total
            }
          });
          
          console.log('Esperando respuesta de create-payment...');
          
          // Usar Promise.race para implementar timeout
          const result = await Promise.race([paymentPromise, timeoutPromise]);
          const { data: payment, error: paymentError } = result;

          if (paymentError || !payment?.init_point) {
            console.error('Error en respuesta de create-payment:', paymentError);
            throw new Error(paymentError?.message || 'Error al crear preferencia de pago');
          }
          
          console.log('Preferencia de pago creada correctamente:', payment.preference_id);

          // Limpiar datos
          cartStore.clearCart();
          sessionStorage.removeItem("checkout-form");
          
          console.log('Datos de sesión limpiados');

          // No restaurar loading ya que vamos a redirigir
          shouldResetLoading = false;
          
          // Usar nuestra función segura de redirección
          if (isMounted.current) {
            redirectToMercadoPago(payment.init_point);
          }
          
          // No continuar con la ejecución
          return;
          
        } catch (mpError) {
          console.error('Error en proceso de Mercado Pago:', mpError);
          
          if (isMounted.current) {
            toast.error(mpError.message || 'Error al conectar con MercadoPago. Intenta nuevamente.');
          }
          
          // Eliminar la orden creada para evitar órdenes huérfanas
          try {
            console.log('Eliminando orden huérfana:', order.id);
            await supabase
              .from('orders')
              .delete()
              .eq('id', order.id);
          } catch (deleteError) {
            console.error('Error al eliminar orden huérfana:', deleteError);
          }
        }
      } else { // Pago contra entrega
        console.log('Procesando pago contra entrega');
        
        await supabase
          .from('orders')
          .update({ 
            status: 'processing',
            payment_status: 'pending_cod'
          })
          .eq('id', order.id);

        cartStore.clearCart();
        sessionStorage.removeItem("checkout-form");
        
        if (isMounted.current) {
          toast.success('Pedido realizado con éxito');
          
          // No restaurar loading ya que vamos a navegar
          shouldResetLoading = false;
          
          navigate(`/pago?status=pending_cod&order_id=${order.id}`);
        }
        
        // No continuar con la ejecución
        return;
      }

    } catch (error) {
      console.error('Error general en proceso de checkout:', error);
      
      if (isMounted.current) {
        toast.error(error.message || 'Error al procesar el pedido');
      }
    } finally {
      // Restaurar el estado de carga solo si es necesario y el componente sigue montado
      if (shouldResetLoading && isMounted.current) {
        console.log('Restaurando estado de loading a false');
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto">
        <h2 className="text-center text-3xl font-extrabold text-gray-900">
          Finalizar Compra
        </h2>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="fullName" className="sr-only">Nombre completo</label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Nombre completo"
              />
            </div>
            <div>
              <label htmlFor="email" className="sr-only">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email"
              />
            </div>
            <div>
              <label htmlFor="phone" className="sr-only">Teléfono</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Teléfono"
              />
            </div>
            <div>
              <label htmlFor="address" className="sr-only">Dirección</label>
              <input
                id="address"
                name="address"
                type="text"
                required
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Dirección"
              />
            </div>
            <div>
              <label htmlFor="city" className="sr-only">Ciudad</label>
              <input
                id="city"
                name="city"
                type="text"
                required
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Ciudad"
              />
            </div>
            <div>
              <label htmlFor="postalCode" className="sr-only">Código Postal</label>
              <input
                id="postalCode"
                name="postalCode"
                type="text"
                required
                value={formData.postalCode}
                onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value }))}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Código Postal"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center">
              <input
                id="cash_on_delivery"
                name="paymentMethod"
                type="radio"
                value="cash_on_delivery"
                checked={formData.paymentMethod === 'cash_on_delivery'}
                onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
              />
              <label htmlFor="cash_on_delivery" className="ml-3 block text-sm font-medium text-gray-700">
                Pago contra entrega
              </label>
            </div>
            <div className="flex items-center">
              <input
                id="mercadopago"
                name="paymentMethod"
                type="radio"
                value="mercadopago"
                checked={formData.paymentMethod === 'mercadopago'}
                onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
              />
              <label htmlFor="mercadopago" className="ml-3 block text-sm font-medium text-gray-700">
                Pagar con Mercado Pago
              </label>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Procesando...' : 'Finalizar compra'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default GuestCheckout;