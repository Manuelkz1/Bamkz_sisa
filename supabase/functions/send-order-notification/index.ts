import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts"; // Mantenemos esto por si acaso, aunque no lo usemos activamente en esta prueba.

console.log("Función 'send-order-notification' (versión de prueba de invocación) cargada.");

serve(async (req: Request) => {
  console.log("[TEST_INVOCATION] Función 'send-order-notification' ha sido invocada.");
  console.log("[TEST_INVOCATION] Método de solicitud:", req.method);

  if (req.method === "OPTIONS") {
    console.log("[TEST_INVOCATION] Manejando solicitud OPTIONS.");
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("[TEST_INVOCATION] Cuerpo de la solicitud recibido:", JSON.stringify(body, null, 2));

    // Simplemente respondemos que la prueba fue recibida.
    return new Response(
      JSON.stringify({ message: "Prueba de invocación de send-order-notification recibida exitosamente." }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[TEST_INVOCATION] Error en la función de prueba:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

console.log("Función 'send-order-notification' (versión de prueba de invocación) lista para servir solicitudes.");
