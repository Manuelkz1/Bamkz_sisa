import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Truck, CreditCard } from 'lucide-react';
import { useCartStore } from '../stores/cartStore'; // Importar el store del carrito
import type { CartItem } from '../types';

interface GuestCheckoutProps {
  // items y total ahora vendrán del store, no como props
  onBack: () => void;
  onSuccess: () => void; // Esta función podría ser responsable de llamar a clearCart del store
}

console.log('GuestCheckout component script loaded (v8)');

export function GuestCheckout({ onBack, onSuccess }: GuestCheckoutProps) {
  const { items: cartItems, total: cartTotal, clearCart: clearCartStoreAction } = useCartStore(); // Obtener estado y acciones del store
  console.log('GuestCheckout (v8) rendering. Store items:', cartItems, 'Store total:', cartTotal);

  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isStateInitialized, setIsStateInitialized] = useState(false); // Para el formulario

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'Colombia',
    paymentMethod: ''
  });

  // Función para guardar el estado del formulario en sessionStorage
  const saveFormStateToSession = useCallback(() => {
    console.log('v8: Attempting to save formData to sessionStorage:', formData);
    try {
        sessionStorage.setItem('checkoutFormData_v8', JSON.stringify(formData));
        console.log('v8: Saved formData to sessionStorage.');
    } catch (error) {
        console.error("v8: Error saving formData to sessionStorage:", error);
    }
  }, [formData]);

  // Efecto para cargar el estado del formulario desde sessionStorage al montar
  useEffect(() => {
    console.log('v8: Initializing form state from sessionStorage.');
    let initialFormData = {
      fullName: '', email: '', phone: '', address: '', city: '', postalCode: '', country: 'Colombia', paymentMethod: ''
    };

    const savedFormDataString = sessionStorage.getItem('checkoutFormData_v8');
    if (savedFormDataString) {
      try {
        initialFormData = { ...initialFormData, ...JSON.parse(savedFormDataString) };
        console.log('v8: Loaded formData from sessionStorage:', initialFormData);
      } catch (error) {
        console.error("v8: Error parsing saved form data from sessionStorage:", error);
        sessionStorage.removeItem('checkoutFormData_v8'); // Limpiar si está corrupto
      }
    }
    
    setFormData(initialFormData);
    setIsStateInitialized(true);
    console.log('v8: Form state initialization complete. formData:', initialFormData);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo se ejecuta al montar

  // Efecto para guardar el estado del formulario en sessionStorage cuando cambie
  useEffect(() => {
    if (isStateInitialized) {
      console.log('v8: formData changed, saving to sessionStorage.');
      saveFormStateToSession();
    }
  }, [formData, isStateInitialized, saveFormStateToSession]);

  // Determinar métodos de pago disponibles basados en los items del carrito del store
  const availablePaymentMethods = {
    cash_on_delivery: cartItems.every(item => 
      item.product.allowed_payment_methods?.cash_on_delivery !== false
    ),
    card: cartItems.every(item => 
      item.product.allowed_payment_methods?.card !== false
    )
  };

  // Efecto para auto-seleccionar método de pago si solo hay uno disponible
  useEffect(() => {
    if (!isStateInitialized || !cartItems || cartItems.length === 0) return;
    console.log('v8: useEffect for paymentMethod selection. Current paymentMethod:', formData.paymentMethod, 'Available:', availablePaymentMethods);
    if (!formData.paymentMethod) {
      if (availablePaymentMethods.card && !availablePaymentMethods.cash_on_delivery) {
        setFormData(prev => ({ ...prev, paymentMethod: 'mercadopago' }));
        console.log('v8: Auto-selected paymentMethod: mercadopago');
      } else if (availablePaymentMethods.cash_on_delivery && !availablePaymentMethods.card) {
        setFormData(prev => ({ ...prev, paymentMethod: 'cash_on_delivery' }));
        console.log('v8: Auto-selected paymentMethod: cash_on_delivery');
      }
    }
  }, [availablePaymentMethods.card, availablePaymentMethods.cash_on_delivery, formData.paymentMethod, cartItems, isStateInitialized]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('v8: handleSubmit. formData:', formData, 'Store items:', cartItems, 'Store total:', cartTotal);
    
    // Guardar estado del formulario una última vez antes de la lógica de envío
    saveFormStateToSession();

    if (!formData.paymentMethod) {
      toast.error('Por favor selecciona un método de pago');
      return;
    }
    if (!cartItems || cartItems.length === 0 || cartTotal <= 0) {
      toast.error('No hay productos en tu pedido o el total es incorrecto. Por favor, vuelve a la tienda y añade productos al carrito.');
      console.error('v8: Validation failed: No items in store or total is zero/negative.');
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          is_guest: true,
          guest_info: { full_name: formData.fullName, email: formData.email, phone: formData.phone },
          shipping_address: { full_name: formData.fullName, address: formData.address, city: formData.city, postal_code: formData.postalCode, country: formData.country, phone: formData.phone },
          payment_method: formData.paymentMethod,
          total: cartTotal, // Usar total del store
          status: 'pending',
          payment_status: 'pending'
        })
        .select()
        .single();

      if (orderError) throw new Error('Error al crear el pedido: ' + orderError.message);
      if (!order) throw new Error('No se pudo crear el pedido');
      console.log('v8: Order created in Supabase:', order);

      const orderItemsData = cartItems.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        price_at_time: item.product.price,
        selected_color: item.selectedColor
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItemsData);
      if (itemsError) {
        await supabase.from('orders').delete().eq('id', order.id); // Rollback
        throw new Error('Error al crear los items del pedido: ' + itemsError.message);
      }
      console.log('v8: Order items created in Supabase.');

      if (formData.paymentMethod === 'mercadopago') {
        toast.loading('Redirigiendo a Mercado Pago...');
        const paymentPayload = {
          orderId: order.id,
          items: cartItems.map(cartItem => ({
            product_id: cartItem.product.id,
            product_name: cartItem.product.name,
            product_description: cartItem.product.description || cartItem.product.name,
            product_image_url: cartItem.product.image_url || '',
            product_category: cartItem.product.category || 'others',
            product_price: Number(cartItem.product.price),
            quantity: cartItem.quantity,
          })),
          total: Number(cartTotal), // Usar total del store
        };
        console.log('v8: Sending paymentPayload to Supabase function create-payment:', paymentPayload);

        const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-payment', { body: paymentPayload });
        toast.dismiss();

        if (paymentError || !paymentData || !paymentData.init_point) {
          await supabase.from('orders').update({ payment_status: 'failed', status: 'payment_creation_failed' }).eq('id', order.id);
          toast.error(paymentData?.error || paymentError?.message || 'Error al generar el enlace de pago.');
          console.error('v8: Error creating MercadoPago preference:', paymentData?.error || paymentError?.message);
          setLoading(false);
          return;
        }
        
        console.log('v8: MercadoPago preference OK. Clearing checkout form data from session & redirecting.');
        sessionStorage.removeItem('checkoutFormData_v8');
        // onSuccess() es responsable de llamar a clearCartStoreAction() si el pago es exitoso
        onSuccess(); 
        window.location.href = paymentData.init_point;
      } else { // Cash on delivery
        console.log('v8: Cash on delivery order placed. Clearing checkout form data from session & navigating.');
        sessionStorage.removeItem('checkoutFormData_v8');
        // onSuccess() es responsable de llamar a clearCartStoreAction() aquí también
        onSuccess(); 
        toast.success('¡Pedido realizado con éxito! Pago contra entrega.');
        navigate('/pago', { state: { status: 'pending', orderId: order.id }});
      }
    } catch (error: any) {
      console.error('v8: Error in handleSubmit:', error);
      toast.error(error.message || 'Error al procesar el pedido.');
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!isStateInitialized) {
    console.log('v8: Form state not yet initialized, rendering loading or minimal UI.');
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p>Cargando checkout...</p></div>; 
  }

  console.log('v8: Rendering full GuestCheckout. Store items:', cartItems, 'Store total:', cartTotal, 'Form data:', formData);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto">
        <div className="relative">
          <button onClick={onBack} className="absolute -left-2 top-0 p-2 text-gray-600 hover:text-gray-900 focus:outline-none">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">Finalizar compra</h2>
        </div>
        <div className="mt-8">
          <div className="bg-white p-6 shadow rounded-lg">
            {cartItems && cartItems.length > 0 ? (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Resumen del pedido</h3>
                {cartItems.map((item, index) => (
                  <div key={item.product.id ? `${item.product.id}-${index}` : index} className="flex justify-between items-center py-2 border-b">
                    <div>
                      <p className="font-medium">{item.product.name}</p>
                      <p className="text-sm text-gray-600">
                        Cantidad: {item.quantity}
                        {item.selectedColor && ` - Color: ${item.selectedColor}`}
                      </p>
                    </div>
                    <p className="font-medium">${(Number(item.product.price) * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mb-6 text-center text-gray-500">
                <p>No hay productos en tu pedido para mostrar.</p>
                <p>Por favor, vuelve a la tienda para seleccionar un producto.</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">Nombre completo</label>
                <input type="text" id="fullName" name="fullName" required value={formData.fullName} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Correo electrónico</label>
                <input type="email" id="email" name="email" required value={formData.email} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Teléfono</label>
                <input type="tel" id="phone" name="phone" required value={formData.phone} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
              </div>
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">Dirección</label>
                <input type="text" id="address" name="address" required value={formData.address} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700">Ciudad</label>
                  <input type="text" id="city" name="city" required value={formData.city} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                </div>
                <div>
                  <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700">Código postal</label>
                  <input type="text" id="postalCode" name="postalCode" required value={formData.postalCode} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">Método de pago</label>
                <div className="grid grid-cols-1 gap-4">
                  {availablePaymentMethods.cash_on_delivery && (
                    <label className="relative flex cursor-pointer rounded-lg border bg-white p-4 shadow-sm focus:outline-none">
                      <input type="radio" name="paymentMethod" value="cash_on_delivery" className="sr-only" checked={formData.paymentMethod === 'cash_on_delivery'} onChange={handleInputChange} />
                      <div className="flex w-full items-center justify-between">
                        <div className="flex items-center">
                          <div className="text-sm">
                            <div className="flex items-center"><Truck className="h-5 w-5 text-gray-900 mr-2" /><p className="font-medium text-gray-900">Pago contra entrega</p></div>
                            <p className="text-gray-500">Paga en efectivo cuando recibas tu pedido</p>
                          </div>
                        </div>
                        <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${formData.paymentMethod === 'cash_on_delivery' ? 'border-transparent bg-indigo-600' : 'border-gray-300'}`}><div className={`rounded-full ${formData.paymentMethod === 'cash_on_delivery' ? 'h-2.5 w-2.5 bg-white' : ''}`} /></div>
                      </div>
                    </label>
                  )}
                  {availablePaymentMethods.card && (
                    <label className="relative flex cursor-pointer rounded-lg border bg-white p-4 shadow-sm focus:outline-none">
                      <input type="radio" name="paymentMethod" value="mercadopago" className="sr-only" checked={formData.paymentMethod === 'mercadopago'} onChange={handleInputChange} />
                      <div className="flex w-full items-center justify-between">
                        <div className="flex items-center">
                          <div className="text-sm">
                            <div className="flex items-center"><CreditCard className="h-5 w-5 text-gray-900 mr-2" /><p className="font-medium text-gray-900">Tarjeta, PSE o Efecty</p></div>
                            <p className="text-gray-500">Paga en línea de forma segura</p>
                          </div>
                        </div>
                        <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${formData.paymentMethod === 'mercadopago' ? 'border-transparent bg-indigo-600' : 'border-gray-300'}`}><div className={`rounded-full ${formData.paymentMethod === 'mercadopago' ? 'h-2.5 w-2.5 bg-white' : ''}`} /></div>
                      </div>
                    </label>
                  )}
                </div>
              </div>

              {cartItems && cartItems.length > 0 && cartTotal > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-medium text-gray-900">Total</h3>
                  <p className="text-3xl font-extrabold text-gray-900">${cartTotal.toFixed(2)}</p>
                </div>
              )}

              <button type="submit" disabled={loading || !formData.paymentMethod || !cartItems || cartItems.length === 0 || cartTotal <= 0} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
                {loading ? 'Procesando...' : (formData.paymentMethod === 'mercadopago' ? 'Pagar en línea' : 'Realizar pedido (Pago contra entrega)')}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

