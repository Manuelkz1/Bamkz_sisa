import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Truck, CreditCard } from 'lucide-react';
import type { CartItem } from '../types';

interface GuestCheckoutProps {
  items: CartItem[];
  total: number;
  onBack: () => void;
  onSuccess: () => void;
}

console.log('GuestCheckout component script loaded (v7)');

export function GuestCheckout({ items: propItems, total: propTotal, onBack, onSuccess }: GuestCheckoutProps) {
  console.log('GuestCheckout (v7) rendering. Initial propItems:', propItems, 'Initial propTotal:', propTotal);

  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [currentItems, setCurrentItems] = useState<CartItem[]>([]);
  const [currentTotal, setCurrentTotal] = useState<number>(0);
  const [isStateInitialized, setIsStateInitialized] = useState(false);

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

  // Function to save all relevant checkout state to sessionStorage
  const saveFullCheckoutStateToSession = useCallback(() => {
    console.log('v7: Attempting to save full checkout state. currentItems:', currentItems, 'currentTotal:', currentTotal, 'formData:', formData);
    if (currentItems && currentItems.length > 0 && currentTotal > 0) {
      try {
        sessionStorage.setItem('checkoutItems_v7', JSON.stringify(currentItems));
        sessionStorage.setItem('checkoutTotal_v7', JSON.stringify(currentTotal));
        console.log('v7: Saved currentItems and currentTotal to sessionStorage.');
      } catch (error) {
        console.error("v7: Error saving items/total to sessionStorage:", error);
      }
    }
    try {
        sessionStorage.setItem('checkoutFormData_v7', JSON.stringify(formData));
        console.log('v7: Saved formData to sessionStorage.');
    } catch (error) {
        console.error("v7: Error saving formData to sessionStorage:", error);
    }
  }, [currentItems, currentTotal, formData]);

  useEffect(() => {
    console.log('v7: Initializing state from props or sessionStorage.');
    let initialItems: CartItem[] = [];
    let initialTotal: number = 0;
    let initialFormData = {
      fullName: '', email: '', phone: '', address: '', city: '', postalCode: '', country: 'Colombia', paymentMethod: ''
    };

    const savedFormDataString = sessionStorage.getItem('checkoutFormData_v7');
    if (savedFormDataString) {
      try {
        initialFormData = { ...initialFormData, ...JSON.parse(savedFormDataString) };
        console.log('v7: Loaded formData from sessionStorage:', initialFormData);
      } catch (error) {
        console.error("v7: Error parsing saved form data:", error);
        sessionStorage.removeItem('checkoutFormData_v7');
      }
    }

    if (propItems && propItems.length > 0 && typeof propTotal === 'number' && propTotal > 0) {
      console.log('v7: Using valid propItems and propTotal for initialization:', propItems, propTotal);
      initialItems = propItems;
      initialTotal = propTotal;
      // Immediately save valid props to session storage if they are provided
      try {
        console.log('v7: Saving valid propItems/propTotal to sessionStorage on initial load with props.');
        sessionStorage.setItem('checkoutItems_v7', JSON.stringify(initialItems));
        sessionStorage.setItem('checkoutTotal_v7', JSON.stringify(initialTotal));
      } catch (error) {
        console.error("v7: Error saving propItems/propTotal to sessionStorage on initial load:", error);
      }
    } else {
      console.log('v7: propItems are empty or propTotal is zero/invalid. Attempting to load from sessionStorage.');
      const savedItemsString = sessionStorage.getItem('checkoutItems_v7');
      const savedTotalString = sessionStorage.getItem('checkoutTotal_v7');
      if (savedItemsString && savedTotalString) {
        try {
          const savedItems = JSON.parse(savedItemsString);
          const savedTotal = JSON.parse(savedTotalString);
          if (savedItems && savedItems.length > 0 && typeof savedTotal === 'number' && savedTotal > 0) {
            console.log('v7: Loaded items and total from sessionStorage:', savedItems, savedTotal);
            initialItems = savedItems;
            initialTotal = savedTotal;
          } else {
            console.log('v7: Invalid items or total found in sessionStorage during load attempt.');
          }
        } catch (error) {
          console.error("v7: Error parsing saved items/total from sessionStorage:", error);
          sessionStorage.removeItem('checkoutItems_v7');
          sessionStorage.removeItem('checkoutTotal_v7');
        }
      }
    }
    
    setCurrentItems(initialItems);
    setCurrentTotal(initialTotal);
    setFormData(initialFormData);
    setIsStateInitialized(true);
    console.log('v7: State initialization complete. currentItems:', initialItems, 'currentTotal:', initialTotal, 'formData:', initialFormData);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propItems, propTotal]);

  // This effect will run when formData, currentItems, or currentTotal changes *after* the initial setup.
  // It's designed to keep sessionStorage updated if the user interacts with the form or if items/total change for other reasons.
  useEffect(() => {
    if (isStateInitialized) {
      console.log('v7: isStateInitialized is true. Running effect to save full checkout state.');
      saveFullCheckoutStateToSession();
    }
  }, [formData, currentItems, currentTotal, isStateInitialized, saveFullCheckoutStateToSession]);


  const availablePaymentMethods = {
    cash_on_delivery: currentItems.every(item => 
      item.product.allowed_payment_methods?.cash_on_delivery !== false
    ),
    card: currentItems.every(item => 
      item.product.allowed_payment_methods?.card !== false
    )
  };

  useEffect(() => {
    if (!isStateInitialized) return;
    console.log('v7: useEffect for paymentMethod selection. Current paymentMethod:', formData.paymentMethod, 'Available:', availablePaymentMethods);
    if (!formData.paymentMethod && currentItems && currentItems.length > 0) {
      if (availablePaymentMethods.card && !availablePaymentMethods.cash_on_delivery) {
        setFormData(prev => ({ ...prev, paymentMethod: 'mercadopago' }));
      } else if (availablePaymentMethods.cash_on_delivery && !availablePaymentMethods.card) {
        setFormData(prev => ({ ...prev, paymentMethod: 'cash_on_delivery' }));
      }
    }
  }, [availablePaymentMethods.card, availablePaymentMethods.cash_on_delivery, formData.paymentMethod, currentItems, isStateInitialized]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('v7: handleSubmit. formData:', formData, 'items:', currentItems, 'total:', currentTotal);
    
    // Explicitly save state one last time before submission logic
    saveFullCheckoutStateToSession();

    if (!formData.paymentMethod) {
      toast.error('Por favor selecciona un método de pago');
      return;
    }
    if (!currentItems || currentItems.length === 0 || currentTotal <= 0) {
      toast.error('No hay productos en tu pedido o el total es incorrecto. Por favor, vuelve a la tienda y selecciona un producto.');
      console.error('v7: Validation failed: No items or total is zero/negative.');
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
          total: currentTotal,
          status: 'pending',
          payment_status: 'pending'
        })
        .select()
        .single();

      if (orderError) throw new Error('Error al crear el pedido: ' + orderError.message);
      if (!order) throw new Error('No se pudo crear el pedido');
      console.log('v7: Order created:', order);

      const orderItemsData = currentItems.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        price_at_time: item.product.price,
        selected_color: item.selectedColor
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItemsData);
      if (itemsError) {
        await supabase.from('orders').delete().eq('id', order.id);
        throw new Error('Error al crear los items del pedido: ' + itemsError.message);
      }
      console.log('v7: Order items created.');

      if (formData.paymentMethod === 'mercadopago') {
        toast.loading('Redirigiendo a Mercado Pago...');
        const paymentPayload = {
          orderId: order.id,
          items: currentItems.map(cartItem => ({
            product_id: cartItem.product.id,
            product_name: cartItem.product.name,
            product_description: cartItem.product.description || cartItem.product.name,
            product_image_url: cartItem.product.image_url || '',
            product_category: cartItem.product.category || 'others',
            product_price: Number(cartItem.product.price),
            quantity: cartItem.quantity,
          })),
          total: Number(currentTotal),
        };
        console.log('v7: Sending paymentPayload to create-payment:', paymentPayload);

        const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-payment', { body: paymentPayload });
        toast.dismiss();

        if (paymentError || !paymentData || !paymentData.init_point) {
          await supabase.from('orders').update({ payment_status: 'failed', status: 'payment_creation_failed' }).eq('id', order.id);
          toast.error(paymentData?.error || paymentError?.message || 'Error al generar el enlace de pago.');
          setLoading(false);
          return;
        }
        
        console.log('v7: MercadoPago preference OK. Clearing session & redirecting.');
        sessionStorage.removeItem('checkoutFormData_v7');
        sessionStorage.removeItem('checkoutItems_v7');
        sessionStorage.removeItem('checkoutTotal_v7');
        onSuccess();
        window.location.href = paymentData.init_point;
      } else { // Cash on delivery
        console.log('v7: Cash on delivery. Clearing session & navigating.');
        sessionStorage.removeItem('checkoutFormData_v7');
        sessionStorage.removeItem('checkoutItems_v7');
        sessionStorage.removeItem('checkoutTotal_v7');
        onSuccess();
        toast.success('¡Pedido realizado con éxito! Pago contra entrega');
        navigate('/pago', { state: { status: 'pending', orderId: order.id }});
      }
    } catch (error: any) {
      console.error('v7: Error in handleSubmit:', error);
      toast.error(error.message || 'Error al procesar el pedido.');
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!isStateInitialized) {
    console.log('v7: State not yet initialized, rendering loading or minimal UI.');
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p>Cargando checkout...</p></div>; 
  }

  console.log('v7: Rendering full GuestCheckout. currentItems:', currentItems, 'currentTotal:', currentTotal, 'formData:', formData);

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
            {currentItems && currentItems.length > 0 ? (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Resumen del pedido</h3>
                {currentItems.map((item, index) => (
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

              {currentItems && currentItems.length > 0 && currentTotal > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-medium text-gray-900">Total</h3>
                  <p className="text-3xl font-extrabold text-gray-900">${currentTotal.toFixed(2)}</p>
                </div>
              )}

              <button type="submit" disabled={loading || !formData.paymentMethod || !currentItems || currentItems.length === 0 || currentTotal <= 0} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
                {loading ? 'Procesando...' : (formData.paymentMethod === 'mercadopago' ? 'Pagar en línea' : 'Realizar pedido (Pago contra entrega)')}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

