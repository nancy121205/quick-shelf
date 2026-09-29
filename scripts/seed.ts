import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log("🌱 Starting database seed...");

  // Remove existing development data
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.syncLog.deleteMany();
  await prisma.adminConfig.deleteMany();

  // Create categories
  const carpets = await prisma.category.create({
    data: {
      name: "Carpets",
      slug: "carpets",
      visible: true,
      sortOrder: 1,
    },
  });

  const rugs = await prisma.category.create({
    data: {
      name: "Rugs",
      slug: "rugs",
      visible: true,
      sortOrder: 2,
    },
  });

  const runners = await prisma.category.create({
    data: {
      name: "Runners",
      slug: "runners",
      visible: true,
      sortOrder: 3,
    },
  });

  // Create sample products
  await prisma.product.createMany({
    data: [
      {
        sourceType: "SHOPIFY",
        sourceId: "demo-shopify-001",
        sourceUrl: "https://example.com/products/persian-red",
        name: "Persian Red Carpet",
        sku: "CAR-001",
        description: "Traditional Persian-inspired carpet.",
        price: 45000,
        stock: 8,
        status: true,
        categoryId: carpets.id,
        images: [
          "https://placehold.co/800x800?text=Persian+Red+Carpet",
        ],
        variants: [],
        metadata: {
          demo: true,
        },
      },
      {
        sourceType: "SHOPIFY",
        sourceId: "demo-shopify-002",
        sourceUrl: "https://example.com/products/modern-blue",
        name: "Modern Blue Carpet",
        sku: "CAR-002",
        description: "Modern geometric carpet design.",
        price: 32000,
        stock: 5,
        status: true,
        categoryId: carpets.id,
        images: [
          "https://placehold.co/800x800?text=Modern+Blue+Carpet",
        ],
        variants: [],
        metadata: {
          demo: true,
        },
      },
      {
        sourceType: "WOOCOMMERCE",
        sourceId: "demo-woo-001",
        sourceUrl: "https://example.com/products/cream-rug",
        name: "Cream Living Room Rug",
        sku: "RUG-001",
        description: "Soft neutral rug for living spaces.",
        price: 18000,
        stock: 12,
        status: true,
        categoryId: rugs.id,
        images: [
          "https://placehold.co/800x800?text=Cream+Living+Room+Rug",
        ],
        variants: [],
        metadata: {
          demo: true,
        },
      },
      {
        sourceType: "WOOCOMMERCE",
        sourceId: "demo-woo-002",
        sourceUrl: "https://example.com/products/grey-runner",
        name: "Grey Hallway Runner",
        sku: "RUN-001",
        description: "Long runner suitable for hallways.",
        price: 12500,
        stock: 0,
        status: false,
        categoryId: runners.id,
        images: [
          "https://placehold.co/800x800?text=Grey+Hallway+Runner",
        ],
        variants: [],
        metadata: {
          demo: true,
        },
      },
    ],
  });

  // Create initial admin configuration
  await prisma.adminConfig.create({
    data: {
      whatsappNumber: "",
      activeDesign: "design1",
      siteSettings: {
        siteName: "Quick Shelf",
      },
    },
  });

  console.log("✅ Database seed completed.");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });