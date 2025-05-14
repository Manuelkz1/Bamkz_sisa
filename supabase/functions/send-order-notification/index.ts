import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

// IMPORTANT: Replace with your actual Resend API Key
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "YOUR_RESEND_API_KEY_HERE";
const TO_EMAIL_ADDRESS = "Bamkz10ficial@gmail.com";
const FROM_EMAIL_ADDRESS = "noreply@yourdomain.com"; // Replace with your verified sender domain in Resend

// Helper function to replace placeholders in HTML template
function populateTemplate(template: string, data: any): string {
  let populatedTemplate = template;
  for (const key in data) {
    if (key === "items" && Array.isArray(data[key])) {
      let itemsHtml = "";
      data[key].forEach((item: any) => {
        itemsHtml += `
          <tr>
            <td>${item.product?.name || "N/A"}</td>
            <td>${item.quantity || 0}</td>
            <td>${item.selectedColor || "N/A"}</td>
            <td>$${item.product?.price?.toFixed(2) || "0.00"}</td>
            <td>$${((item.product?.price || 0) * (item.quantity || 0)).toFixed(2)}</td>
          </tr>
        `;
      });
      populatedTemplate = populatedTemplate.replace("{{#each items}}{{/each}}", itemsHtml);
    } else {
      const regex = new RegExp(`{{${key}}}`, "g");
      populatedTemplate = populatedTemplate.replace(regex, data[key]);
    }
  }
  // Clean up any unreplaced multiply helpers or other placeholders
  populatedTemplate = populatedTemplate.replace(/{{multiply .*?}}/g, "N/A");
  populatedTemplate = populatedTemplate.replace(/{{.*?}}/g, "N/A"); 
  return populatedTemplate;
}

serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { orderData } = await req.json(); // Expect orderData in the request body

    if (!orderData) {
      throw new Error("Order data is required.");
    }

    // In a real scenario, you would fetch the HTML template. For this example, 
    // it's assumed to be available or you'd read it from a file if your environment allows.
    // For Supabase Edge Functions, you might bundle it or fetch it from storage.
    // Let's assume email_template_content is the string content of your email_template.html
    // You would need to find a way to make this template available to the function, 
    // e.g., by including its content directly, fetching from Supabase storage, or bundling.
    // For now, we'll use a placeholder. In a real deployment, you'd read /home/ubuntu/email_template.html
    // For this example, I will include a simplified version of the template structure directly
    // to avoid file reading issues in this specific execution context.
    // However, the best practice is to load it from a file or storage.
    
    const emailTemplateContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head><title>Nueva Notificación de Pedido</title></head>
      <body>
        <div class="container">
          <div class="header"><h1>¡Nuevo Pedido Recibido!</h1></div>
          <div class="content">
            <h2>Detalles del Cliente:</h2>
            <p>Nombre: {{fullName}}</p>
            <p>Email: {{email}}</p>
            <p>Teléfono: {{phone}}</p>
            <p>Dirección: {{address}}, {{city}}, {{postalCode}}, {{country}}</p>
            <h2>Detalles del Pedido:</h2>
            <p>ID Pedido: {{orderId}}</p>
            <p>Método Pago: {{paymentMethod}}</p>
            <p>Total: $ {{totalAmount}}</p>
            <h2>Productos:</h2>
            <table><thead><tr><th>Producto</th><th>Cant.</th><th>Color</th><th>Precio</th><th>Subtotal</th></tr></thead>
            <tbody>{{#each items}}{{/each}}</tbody></table>
          </div>
        </div>
      </body></html>
    `;

    const emailHtml = populateTemplate(emailTemplateContent, orderData);
    const emailSubject = `Nuevo Pedido Recibido - ID: ${orderData.orderId || "N/A"}`;

    console.log("Attempting to send email...");
    console.log("To:", TO_EMAIL_ADDRESS);
    console.log("From:", FROM_EMAIL_ADDRESS);
    console.log("Subject:", emailSubject);
    // console.log("HTML Body (snippet):", emailHtml.substring(0, 200)); // Log snippet for brevity

    if (RESEND_API_KEY === "YOUR_RESEND_API_KEY_HERE") {
      console.warn("Resend API Key not configured. Email will not be sent.");
      // For testing purposes, we'll return a success response but indicate email wasn't sent.
      return new Response(JSON.stringify({ 
        message: "Order data received, but email not sent (Resend API Key not configured).",
        orderData 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL_ADDRESS,
        to: TO_EMAIL_ADDRESS,
        subject: emailSubject,
        html: emailHtml,
      }),
    });

    const responseData = await res.json();

    if (!res.ok) {
      console.error("Resend API Error:", responseData);
      throw new Error(responseData.message || "Failed to send email via Resend");
    }

    console.log("Email sent successfully via Resend:", responseData);

    return new Response(JSON.stringify({ 
      message: "Order data received and email sent successfully!", 
      resendResponse: responseData 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error processing request:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

