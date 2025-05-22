import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Truck, CreditCard } from 'lucide-react';
import { useCartStore } from '../stores/cartStore';

interface GuestCheckoutProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function GuestCheckout({ onBack, onSuccess }: GuestCheckoutProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const cartStore = useCartStore();
  
  const [formData, setFormData] = useState(() => {
    try {
      const saved = sessionStorage.getItem("checkout-form-bolt-v3");
      if (saved) {
        return JSON.parse(saved);
      }
      return {
        fullName: "", email: "", phone: "", address: "", city: "",
        postalCode: "", country: "Colombia", paymentMethod: ""
      };
    } catch (error) {
      console.error("[GuestCheckout] Error parsing formData from sessionStorage:", error);
      return {
        fullName: "", email: "", phone: "", address: "", city: "",
        postalCode: "", country: "Colombia", paymentMethod: ""
      };
    }
  });

  useEffect(() => {
    sessionStorage.setItem("checkout-form-bolt-v3", JSON.stringify(formData));
  }, [formData]);

  useEffect(() => {
    const { items, total, rehydrate } = cartStore;
    if ((!items || items.length === 0) && total === 0) {
      rehydrate(); 
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentCartItems = cartStore.items;
    const currentCartTotal = cartStore.total;
    
    if (!currentCartItems || currentCartItems.length === 0 || currentCartTotal <= 0) {
      toast.error("No hay productos en tu pedido o el total es incorrecto. Por favor, revisa tu carrito.");
      return;
    }
    if (!formData.paymentMethod) {
      toast.error("Por favor selecciona un método de pago");
      return;
    }
    setLoading(true);

    try {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          is_guest: true,
          guest_info: { full_name: formData.fullName, email: formData.email, phone: formData.phone },
          shipping_address: { full_name: formData.fullName, address: formData.address, city: formData.city, postal_code: formData.postalCode, country: formData.country, phone: formData.phone },
          payment_method: formData.paymentMethod,
          total: currentCartTotal,
          status: "pending",
          payment_status: "pending"
        })
        .select()
        .single();

      if (orderError) throw new Error(`Error al crear el pedido: ${orderError.message}`);
      if (!order) throw new Error("No se pudo crear el pedido");

      const orderItemsData = currentCartItems.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        price_at_time: item.product.price,
        selected_color: item.selectedColor
      }));
      const { error: itemsError } = await supabase.from("order_items").insert(orderItemsData);
      if (itemsError) {
        await supabase.from("orders").delete().eq("id", order.id);
        throw new Error(`Error al crear los items del pedido: ${itemsError.message}`);
      }

      // Prepare data for email notification (common for both payment methods if successful here)
      const notificationPayload = {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        postalCode: formData.postalCode,
        country: formData.country,
        orderId: order.id,
        paymentMethod: formData.paymentMethod,
        totalAmount: currentCartTotal.toFixed(2),
        items: currentCartItems.map(item => ({
          product: { name: item.product.name, price: Number(item.product.price) },
          quantity: item.quantity,
          selectedColor: item.selectedColor || "N/A"
        }))
      };

      if (formData.paymentMethod === "mercadopago") {
        toast.loading("Redirigiendo a Mercado Pago...");
        const paymentPayload = {
          orderId: order.id,
          items: currentCartItems.map(item => ({
            product_id: item.product.id,
            product_name: item.product.name,
            product_description: item.product.description || item.product.name,
            product_image_url: (item.product.images && item.product.images.length > 0) ? item.product.images[0] : (item.product.image_url || ""),
            product_category: item.product.category || "others",
            product_price: Number(item.product.price),
            quantity: item.quantity,
          })),
          total: currentCartTotal,
          payer_email: formData.email
        };
        const { data: paymentData, error: paymentError } = await supabase.functions.invoke("create-payment", { body: paymentPayload });
        toast.dismiss();
        if (paymentError || !paymentData || !paymentData.init_point) {
          await supabase.from("orders").update({ payment_status: "failed", status: "payment_creation_failed" }).eq("id", order.id);
          throw new Error(paymentData?.error || paymentError?.message || "Error al generar el enlace de pago de Mercado Pago");
        }
        window.location.href = paymentData.init_point;
      } else { // Cash on delivery
        // For CoD, order is considered placed. Update status and send notification.
        await supabase.from("orders").update({ status: "processing", payment_status: "pending_cod" }).eq("id", order.id);
        console.log("[GuestCheckout] Cash on delivery order placed. Attempting to send notification email.");
        try {
          const { error: emailError } = await supabase.functions.invoke("send-order-notification", {
            body: { orderData: notificationPayload },
          });
          if (emailError) {
            console.error("[GuestCheckout] Error sending CoD notification email:", emailError.message);
            toast.error("Pedido realizado, pero error al notificar por correo.");
          } else {
            console.log("[GuestCheckout] CoD order notification email function invoked.");
          }
        } catch (e: any) {
          console.error("[GuestCheckout] Exception sending CoD notification email:", e.message);
          toast.error("Pedido realizado, pero excepción al notificar por correo.");
        }
        sessionStorage.removeItem("checkout-form-bolt-v3");
        onSuccess();
        toast.success("¡Pedido realizado con éxito! Pago contra entrega.");
        navigate("/pago?status=pending_cod&order_id=" + order.id); // Navigate with order_id for CoD status page
      }
    } catch (error: any) {
      console.error("[GuestCheckout] Error in handleSubmit:", error);
      toast.error(error.message || "Error al procesar el pedido.");
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const availablePaymentMethods = {
    cash_on_delivery: cartStore.items.every(item => item.product.allowed_payment_methods?.cash_on_delivery !== false),
    card: cartStore.items.every(item => item.product.allowed_payment_methods?.card !== false)
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto">
        <div className="relative mb-8">
          <button onClick={onBack} className="absolute left-0 top-1/2 -translate-y-1/2 p-2 text-gray-600 hover:text-gray-900 focus:outline-none">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">Finalizar compra</h2>
        </div>
        <div className="bg-white p-6 shadow rounded-lg">
          {cartStore.items.length > 0 ? (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Resumen del pedido</h3>
              {cartStore.items.map((item, index) => (
                <div key={`${item.product.id}-${index}-${item.selectedColor || ''}`} className="flex justify-between items-center py-2 border-b">
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
              <div className="mt-4 text-right">
                <p className="text-lg font-bold">Total: ${cartStore.total.toFixed(2)}</p>
              </div>
            </div>
          ) : (
            <div className="mb-6 text-center text-gray-500">
              <p>No hay productos en tu carrito.</p>
              <p>Por favor, vuelve a la tienda para agregar productos.</p>
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
                    <input type="radio" name="paymentMethod" value="cash_on_delivery" className="sr-only" checked={formData.paymentMethod === "cash_on_delivery"} onChange={handleInputChange} />
                    <div className="flex w-full items-center justify-between">
                      <div className="flex items-center">
                        <div className="text-sm">
                          <div className="flex items-center">
                            <Truck className="h-5 w-5 text-gray-900 mr-2" />
                            <p className="font-medium text-gray-900">Pago contra entrega</p>
                          </div>
                          <p className="text-gray-500">Paga en efectivo cuando recibas tu pedido</p>
                        </div>
                      </div>
                      <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${formData.paymentMethod === "cash_on_delivery" ? "border-transparent bg-indigo-600" : "border-gray-300"}`}><div className={`rounded-full ${formData.paymentMethod === "cash_on_delivery" ? "h-2.5 w-2.5 bg-white" : ""}`} /></div>
                    </div>
                  </label>
                )}
                {availablePaymentMethods.card && (
                  <label className="relative flex cursor-pointer rounded-lg border bg-white p-4 shadow-sm focus:outline-none">
                    <input type="radio" name="paymentMethod" value="mercadopago" className="sr-only" checked={formData.paymentMethod === "mercadopago"} onChange={handleInputChange} />
                    <div className="flex w-full items-center justify-between">
                      <div className="flex items-center">
                        <div className="text-sm">
                          <div className="flex items-center">
                            <CreditCard className="h-5 w-5 text-gray-900 mr-2" />
                            <p className="font-medium text-gray-900">Tarjeta, PSE o Efecty (Mercado Pago)</p>
                          </div>
                          <p className="text-gray-500">Paga en línea de forma segura</p>
                        </div>
                      </div>
                      <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${formData.paymentMethod === "mercadopago" ? "border-transparent bg-indigo-600" : "border-gray-300"}`}><div className={`rounded-full ${formData.paymentMethod === "mercadopago" ? "h-2.5 w-2.5 bg-white" : ""}`} /></div>
                    </div>
                  </label>
                )}
              </div>
            </div>
            <button type="submit" disabled={loading || cartStore.items.length === 0} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
              {loading ? "Procesando..." : (formData.paymentMethod === "mercadopago" ? "Pagar con Mercado Pago" : "Realizar pedido (Pago contra entrega)")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default GuestCheckout;