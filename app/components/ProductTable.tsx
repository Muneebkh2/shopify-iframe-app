// app/components/ProductTable.tsx
import { useEffect, useState } from "react";
import {
  Card,
  IndexTable,
  TextField,
  Button,
  Modal,
  Spinner,
  Text,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { Toast } from "@shopify/app-bridge/actions";

export default function ProductTable() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [iframeUrl, setIframeUrl] = useState("");
  const [modalActive, setModalActive] = useState(false);

  const app = useAppBridge();

  const fetchProducts = () => {
    setLoading(true);
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => {
        setProducts(data.products);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSave = () => {
    fetch("/api/metafields", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        productId: selectedProduct.id,
        iframeUrl,
      }),
    })
      .then(async (res) => {
        const result = await res.json();
        if (result.success) {
          Toast.create(app, {
            message: "Iframe URL saved successfully!",
            duration: 3000,
          });
          setModalActive(false);
          setIframeUrl("");
          fetchProducts();
        } else {
          console.error("Save failed", result.errors);
          Toast.create(app, {
            message: "Failed to save iframe URL.",
            duration: 3000,
            isError: true,
          });
        }
      })
      .catch(() => {
        Toast.create(app, {
          message: "An error occurred while saving.",
          duration: 3000,
          isError: true,
        });
      });
  };

  if (loading) {
    return <Spinner accessibilityLabel="Loading products" size="large" />;
  }

  return (
    <Card>
      <IndexTable
        resourceName={{ singular: "product", plural: "products" }}
        itemCount={products.length}
        headings={[
          { title: "Product" },
          { title: "Variants" },
          { title: "Iframe URL" },
          { title: "Actions" },
        ]}
        selectable={false}
      >
        {products.map((product) => {
          const iframeMetafield =
            product.metafields?.edges?.find(
              (m) => m.node.key === "iframe_url"
            )?.node.value || "";

          return (
            <IndexTable.Row
              id={product.id}
              key={product.id}
              position={0}
            >
              <IndexTable.Cell>{product.title}</IndexTable.Cell>
              <IndexTable.Cell>
                {product.variants?.edges?.map((v) => v.node.title).join(", ")}
              </IndexTable.Cell>
              <IndexTable.Cell>{iframeMetafield}</IndexTable.Cell>
              <IndexTable.Cell>
                <Button
                  onClick={() => {
                    setSelectedProduct(product);
                    setIframeUrl(iframeMetafield);
                    setModalActive(true);
                  }}
                >
                  Set iframe URL
                </Button>
              </IndexTable.Cell>
            </IndexTable.Row>
          );
        })}
      </IndexTable>

      {selectedProduct && (
        <Modal
          open={modalActive}
          onClose={() => setModalActive(false)}
          title="Set iframe URL"
          primaryAction={{
            content: "Save",
            onAction: handleSave,
          }}
        >
          <Modal.Section>
            <TextField
              label="Iframe URL"
              value={iframeUrl}
              onChange={setIframeUrl}
              autoComplete="off"
            />
          </Modal.Section>
        </Modal>
      )}
    </Card>
  );
}
