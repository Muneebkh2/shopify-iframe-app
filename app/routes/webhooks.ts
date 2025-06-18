import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { topic, shop, body, session } = await authenticate.webhook(request);

  switch (topic) {
    case "APP_UNINSTALLED":
      console.log(`Shop ${shop} uninstalled app`);
      // Optional: clean up shop data
      break;

    case "SHOP_UPDATE":
      console.log(`Shop ${shop} updated`);
      break;

    case "CUSTOMERS_DATA_REQUEST":
    case "CUSTOMERS_REDACT":
    case "SHOP_REDACT":
      console.log(`GDPR webhook ${topic} from ${shop}`, body);
      break;

    default:
      return new Response("Unhandled topic", { status: 404 });
  }

  return new Response(null, { status: 200 });
};
