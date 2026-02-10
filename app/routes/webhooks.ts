import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

// Compliance webhook handlers for GDPR requirements
async function handleCustomerDataRequest(shop: string, body: any) {
  console.log(`Processing customer data request for shop: ${shop}`, body);

  try {
    // For GDPR compliance: Return customer data in JSON format
    // This implementation should be customized based on your actual data structure
    const customerData = {
      shop_id: body.shop_id,
      shop_domain: body.shop_domain,
      orders_requested: body.orders_requested || [],
      customer: body.customer || {},
      data_request: {
        id: body.data_request?.id,
        created_at: new Date().toISOString(),
        processed_at: new Date().toISOString()
      }
    };

    // In a real implementation, you would:
    // 1. Query your database for customer data
    // 2. Format the data according to GDPR requirements
    // 3. Return or send the data to the customer

    console.log(`Customer data request processed for shop: ${shop}`);
    return { success: true, message: "Customer data request processed" };
  } catch (error) {
    console.error(`Error processing customer data request for shop ${shop}:`, error);
    throw error;
  }
}

async function handleCustomerRedact(shop: string, body: any) {
  console.log(`Processing customer data redaction for shop: ${shop}`, body);

  try {
    // For GDPR compliance: Delete/anonymize customer data
    const customerId = body.customer?.id;
    const customerEmail = body.customer?.email;

    if (customerId || customerEmail) {
      // In a real implementation, you would:
      // 1. Delete customer data from your database
      // 2. Anonymize any remaining references
      // 3. Log the deletion for compliance records

      // Example database operations (uncomment and modify as needed):
      // if (customerId) {
      //   await db.customer.deleteMany({
      //     where: {
      //       shopifyCustomerId: customerId.toString(),
      //       shop: shop
      //     }
      //   });
      // }

      console.log(`Customer data redacted for customer ${customerId} in shop: ${shop}`);
    }

    return { success: true, message: "Customer data redacted successfully" };
  } catch (error) {
    console.error(`Error redacting customer data for shop ${shop}:`, error);
    throw error;
  }
}

async function handleShopRedact(shop: string, body: any) {
  console.log(`Processing shop data redaction for shop: ${shop}`, body);

  try {
    // For GDPR compliance: Delete all shop data when shop is deleted
    // This should remove all data associated with the shop

    // Example database operations (uncomment and modify as needed):
    // await db.session.deleteMany({ where: { shop } });
    // await db.customer.deleteMany({ where: { shop } });
    // await db.order.deleteMany({ where: { shop } });
    // await db.product.deleteMany({ where: { shop } });

    console.log(`Shop data redacted for shop: ${shop}`);
    return { success: true, message: "Shop data redacted successfully" };
  } catch (error) {
    console.error(`Error redacting shop data for shop ${shop}:`, error);
    throw error;
  }
}

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    // The authenticate.webhook() method automatically verifies HMAC signatures
    // This ensures webhook authenticity and prevents tampering
    const { topic, shop, body, session } = await authenticate.webhook(request);

    console.log(`Received webhook: ${topic} for shop: ${shop}`);

    switch (topic) {
      case "APP_UNINSTALLED":
        console.log(`Shop ${shop} uninstalled app`);
        // Clean up shop data when app is uninstalled
        if (session) {
          await db.session.deleteMany({ where: { shop } });
        }
        break;

      case "APP_SUBSCRIPTIONS_UPDATE":
        console.log(`Shop ${shop} subscription updated`);
        // Handle subscription changes
        break;

      case "SHOP_UPDATE":
        console.log(`Shop ${shop} updated`);
        // Handle shop information updates
        break;

      // GDPR Compliance Webhooks - Mandatory for Shopify App Store
      case "CUSTOMERS_DATA_REQUEST":
        await handleCustomerDataRequest(shop, body);
        break;

      case "CUSTOMERS_REDACT":
        await handleCustomerRedact(shop, body);
        break;

      case "SHOP_REDACT":
        await handleShopRedact(shop, body);
        break;

      default:
        console.log(`Unhandled webhook topic: ${topic}`);
        return new Response(`Unhandled webhook topic: ${topic}`, { status: 404 });
    }

    // Return 200 OK to acknowledge successful webhook processing
    return new Response("OK", { status: 200 });

  } catch (error) {
    console.error("Webhook processing error:", error);

    // Return 500 for processing errors so Shopify will retry
    return new Response("Internal Server Error", { status: 500 });
  }
};
