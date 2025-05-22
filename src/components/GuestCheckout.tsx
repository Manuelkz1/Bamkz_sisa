import React, { useState, useEffect } from 'react';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cartStore.items.length) {
      toast.error("El carrito está vacío");
      return;
    }

    if (!formData.paymentMethod) {
      toast.error("Por favor selecciona un método de pago");
      return;
    }

    try {
      setLoading(true);

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

      if (orderError) throw orderError;

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

      if (itemsError) throw itemsError;

      if (formData.paymentMethod === 'mercadopago') {
        try {
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
          
          // Usar Promise.race para implementar timeout
          const result = await Promise.race([paymentPromise, timeoutPromise]);
          const { data: payment, error: paymentError } = result;

          if (paymentError || !payment?.init_point) {
            throw new Error(paymentError?.message || 'Error al crear preferencia de pago');
          }

          // Limpiar datos
          cartStore.clearCart();
          sessionStorage.removeItem("checkout-form");

          // Redirigir a MercadoPago
          window.location.href = payment.init_point;
        } catch (mpError: any) {
          console.error('Error de MercadoPago:', mpError);
          toast.error(mpError.message || 'Error al conectar con MercadoPago. Intenta nuevamente.');
          
          // Eliminar la orden creada para evitar órdenes huérfanas
          await supabase
            .from('orders')
            .delete()
            .eq('id', order.id);
            
          setLoading(false);
        }
      } else { // Pago contra entrega
        await supabase
          .from('orders')
          .update({ 
            status: 'processing',
            payment_status: 'pending_cod'
          })
          .eq('id', order.id);

        cartStore.clearCart();
        sessionStorage.removeItem("checkout-form");
        toast.success('Pedido realizado con éxito');
        navigate(`/pago?status=pending_cod&order_id=${order.id}`);
      }

    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Error al procesar el pedido');
      setLoading(false);
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