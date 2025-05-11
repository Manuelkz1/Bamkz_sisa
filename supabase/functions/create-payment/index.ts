import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { MercadoPagoConfig, Preference } from "npm:mercadopago@2.0.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*' /* IMPORTANT: In a real production environment, restrict this to your frontend's domain */,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define your Netlify site's base URL here. Make sure it's the correct one.
const NETLIFY_SITE_URL = "https://candid-malabi-eabf01.netlify.app";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204, // No Content
      headers: corsHeaders 
    });
  }

  try {
    const { orderId, items, total } = await req.json();

    // Basic validation for required parameters
    if (!orderId || !items || !Array.isArray(items) || items.length === 0 || typeof total !== 'number' || total <= 0) {
      console.error('Validation Error: Missing or invalid required parameters', { orderId, items, total });
      return new Response(
        JSON.stringify({ error: 'Missing or invalid required parameters. Ensure orderId, items (array), and total (number) are provided.' }),
        { 
          status: 400, // Bad Request
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken) {
      console.error('Configuration Error: MERCADOPAGO_ACCESS_TOKEN not configured');
      throw new Error('MERCADOPAGO_ACCESS_TOKEN not configured'); // This will be caught by the generic error handler
    }

    const client = new MercadoPagoConfig({ 
      accessToken: accessToken,
    });

    const preference = new Preference(client);
        const preferenceData = {
        items: items.map((item: any) => ({
            id: String(item.product_id),
            title: String(item.product_name),
            description: String(item.product_description || item.product_name),
            picture_url: String(item.product_image_url || ''),
            category_id: String(item.product_category || 'others'),
            unit_price: Number(item.product_price),
            quantity: Number(item.quantity),
            currency_id: "COP",
        })),
        back_urls: {
            success: `${NETLIFY_SITE_URL}/pago?status=approved&order_id=${orderId}`,
            failure: `${NETLIFY_SITE_URL}/pago?status=rejected&order_id=${orderId}`,
            pending: `${NETLIFY_SITE_URL}/pago?status=pending&order_id=${orderId}`,
        },
        auto_return: "approved",
        external_reference: String(orderId),
        notification_url: "https://xawsitihehpebojtkunk.supabase.co/functions/v1/payment-webhook" // URL del webhook de Supabase
    };


    console.log('Attempting to create MercadoPago preference with data:', JSON.stringify(preferenceData, null, 2));

    const response = await preference.create({ body: preferenceData });

    if (!response || !response.id || !response.init_point) {
      console.error('Invalid or incomplete response from MercadoPago preference creation:', response);
      throw new Error('Failed to create MercadoPago preference or received invalid response.');
    }

    console.log('MercadoPago preference created successfully. ID:', response.id);

    return new Response(
      JSON.stringify({
        success: true,
        init_point: response.init_point,
        preference_id: response.id
      }),
      { 
        status: 200, // OK
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in create-payment function:', error.message, error.stack, error.cause);
    
    // Provide a more generic error message to the client for security
    return new Response(
      JSON.stringify({ 
        error: 'An unexpected error occurred while creating the payment preference.'
        // Optionally, include a reference ID for logging/tracking if you have such a system
        // error_reference: generateErrorReferenceId() 
      }),
      { 
        status: 500, // Internal Server Error
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

