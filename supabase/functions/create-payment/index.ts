import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { MercadoPagoConfig, Preference } from "npm:mercadopago@2.0.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  try {
    const { orderId, items, total } = await req.json();

    if (!orderId || !items || !Array.isArray(items) || items.length === 0 || !total) {
      return new Response(
        JSON.stringify({ error: 'Datos inválidos' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken) {
      throw new Error('Token de MercadoPago no configurado');
    }

    const client = new MercadoPagoConfig({ 
      accessToken: accessToken,
    });

    const preference = new Preference(client);
    
    const preferenceData = {
      items: items.map(item => ({
        title: item.product.name,
        quantity: item.quantity,
        currency_id: "COP",
        unit_price: Number(item.product.price)
      })),
      back_urls: {
        success: `${req.headers.get('origin')}/pago?status=approved&order_id=${orderId}`,
        failure: `${req.headers.get('origin')}/pago?status=rejected&order_id=${orderId}`,
        pending: `${req.headers.get('origin')}/pago?status=pending&order_id=${orderId}`
      },
      auto_return: "approved",
      external_reference: orderId,
      notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/payment-webhook`
    };

    const response = await preference.create({ body: preferenceData });

    return new Response(
      JSON.stringify({
        success: true,
        init_point: response.init_point,
        preference_id: response.id
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});