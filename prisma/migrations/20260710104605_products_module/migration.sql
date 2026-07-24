-- CreateEnum
CREATE TYPE "public"."sync_status" AS ENUM ('SYNCED', 'PENDING', 'CONFLICT', 'DELETED');

-- CreateEnum
CREATE TYPE "public"."record_status" AS ENUM ('ACTIVE', 'INACTIVE', 'DRAFT', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."serial_status" AS ENUM ('IN_STOCK', 'RESERVED', 'SOLD', 'RETURNED', 'IN_REPAIR', 'DAMAGED', 'LOST', 'RMA');

-- CreateEnum
CREATE TYPE "public"."barcode_type" AS ENUM ('EAN13', 'EAN8', 'UPC', 'CODE128', 'QR_CODE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."attachment_type" AS ENUM ('INVOICE', 'MANUAL', 'DRIVER', 'IMAGE', 'DOCUMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."discount_type" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateTable
CREATE TABLE "public"."categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "location_id" UUID,
    "parent_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "image" VARCHAR(512),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "status" "public"."record_status" NOT NULL DEFAULT 'ACTIVE',
    "seo_title" VARCHAR(255),
    "seo_description" TEXT,
    "seo_keywords" VARCHAR(255),
    "sync_version" INTEGER NOT NULL DEFAULT 1,
    "sync_status" "public"."sync_status" NOT NULL DEFAULT 'SYNCED',
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."brands" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "location_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "logo" VARCHAR(512),
    "country" VARCHAR(100),
    "website" VARCHAR(255),
    "status" "public"."record_status" NOT NULL DEFAULT 'ACTIVE',
    "sync_version" INTEGER NOT NULL DEFAULT 1,
    "sync_status" "public"."sync_status" NOT NULL DEFAULT 'SYNCED',
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."units" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "short_name" VARCHAR(50) NOT NULL,
    "allow_decimal" BOOLEAN NOT NULL DEFAULT false,
    "status" "public"."record_status" NOT NULL DEFAULT 'ACTIVE',
    "sync_version" INTEGER NOT NULL DEFAULT 1,
    "sync_status" "public"."sync_status" NOT NULL DEFAULT 'SYNCED',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."warranty_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "duration_months" INTEGER NOT NULL,
    "terms" TEXT,
    "replacement_policy" TEXT,
    "service_policy" TEXT,
    "status" "public"."record_status" NOT NULL DEFAULT 'ACTIVE',
    "sync_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "warranty_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "location_id" UUID,
    "category_id" UUID,
    "brand_id" UUID,
    "unit_id" UUID,
    "warranty_profile_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "short_name" VARCHAR(100),
    "slug" VARCHAR(255) NOT NULL,
    "sku" VARCHAR(100) NOT NULL,
    "master_barcode" VARCHAR(255),
    "description" TEXT,
    "search_keywords" VARCHAR(512),
    "notes" TEXT,
    "purchase_price" DECIMAL(15,4) NOT NULL DEFAULT 0.00,
    "sale_price" DECIMAL(15,4) NOT NULL DEFAULT 0.00,
    "minimum_sale_price" DECIMAL(15,4) NOT NULL DEFAULT 0.00,
    "wholesale_price" DECIMAL(15,4) NOT NULL DEFAULT 0.00,
    "cost_price" DECIMAL(15,4) NOT NULL DEFAULT 0.00,
    "average_cost" DECIMAL(15,4) NOT NULL DEFAULT 0.00,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "discount" DECIMAL(15,4) NOT NULL DEFAULT 0.00,
    "discount_type" "public"."discount_type" NOT NULL DEFAULT 'PERCENTAGE',
    "profit_margin" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "weight" DECIMAL(10,3),
    "length" DECIMAL(10,3),
    "width" DECIMAL(10,3),
    "height" DECIMAL(10,3),
    "main_image" VARCHAR(512),
    "thumbnail" VARCHAR(512),
    "status" "public"."record_status" NOT NULL DEFAULT 'ACTIVE',
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "track_inventory" BOOLEAN NOT NULL DEFAULT true,
    "is_serialized" BOOLEAN NOT NULL DEFAULT false,
    "has_variants" BOOLEAN NOT NULL DEFAULT false,
    "is_warranty_enabled" BOOLEAN NOT NULL DEFAULT false,
    "is_returnable" BOOLEAN NOT NULL DEFAULT true,
    "track_expiry" BOOLEAN NOT NULL DEFAULT false,
    "track_batch" BOOLEAN NOT NULL DEFAULT false,
    "low_stock_alert" BOOLEAN NOT NULL DEFAULT true,
    "reorder_level" DECIMAL(15,4) NOT NULL DEFAULT 0.00,
    "opening_stock" DECIMAL(15,4) NOT NULL DEFAULT 0.00,
    "opening_cost" DECIMAL(15,4) NOT NULL DEFAULT 0.00,
    "sync_version" INTEGER NOT NULL DEFAULT 1,
    "sync_status" "public"."sync_status" NOT NULL DEFAULT 'SYNCED',
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."product_images" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "url" VARCHAR(512) NOT NULL,
    "thumbnail_url" VARCHAR(512),
    "alt_text" VARCHAR(255),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."product_variants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "product_id" UUID NOT NULL,
    "sku" VARCHAR(100) NOT NULL,
    "barcode" VARCHAR(255),
    "name" VARCHAR(255) NOT NULL,
    "attributes" JSONB NOT NULL,
    "purchase_price" DECIMAL(15,4),
    "sale_price" DECIMAL(15,4),
    "weight" DECIMAL(10,3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sync_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."product_prices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "location_id" UUID,
    "product_id" UUID NOT NULL,
    "variant_id" UUID,
    "price_tier" VARCHAR(100) NOT NULL,
    "price" DECIMAL(15,4) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'PKR',
    "valid_from" TIMESTAMPTZ(6),
    "valid_to" TIMESTAMPTZ(6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "product_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."barcodes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "product_id" UUID NOT NULL,
    "variant_id" UUID,
    "barcode" VARCHAR(255) NOT NULL,
    "barcode_type" "public"."barcode_type" NOT NULL DEFAULT 'EAN13',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "barcodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."serialized_products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "product_id" UUID NOT NULL,
    "location_id" UUID,
    "serial_number" VARCHAR(255) NOT NULL,
    "manufacturer_serial" VARCHAR(255),
    "internal_tracking_no" VARCHAR(255),
    "barcode" VARCHAR(255),
    "status" "public"."serial_status" NOT NULL DEFAULT 'IN_STOCK',
    "purchase_invoice_id" UUID,
    "purchase_item_id" UUID,
    "supplier_id" UUID,
    "purchase_date" TIMESTAMPTZ(6),
    "sale_invoice_id" UUID,
    "sale_item_id" UUID,
    "customer_id" UUID,
    "sale_date" TIMESTAMPTZ(6),
    "warranty_start_date" TIMESTAMPTZ(6),
    "warranty_end_date" TIMESTAMPTZ(6),
    "last_scan_date" TIMESTAMPTZ(6),
    "sync_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "serialized_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."product_specifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "value" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "product_specifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."product_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "file_url" VARCHAR(512) NOT NULL,
    "file_type" VARCHAR(100) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "attachment_type" "public"."attachment_type" NOT NULL DEFAULT 'DOCUMENT',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "product_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "public"."categories"("slug");

-- CreateIndex
CREATE INDEX "categories_tenant_id_idx" ON "public"."categories"("tenant_id");

-- CreateIndex
CREATE INDEX "categories_parent_id_idx" ON "public"."categories"("parent_id");

-- CreateIndex
CREATE INDEX "categories_slug_idx" ON "public"."categories"("slug");

-- CreateIndex
CREATE INDEX "categories_status_idx" ON "public"."categories"("status");

-- CreateIndex
CREATE UNIQUE INDEX "brands_slug_key" ON "public"."brands"("slug");

-- CreateIndex
CREATE INDEX "brands_tenant_id_idx" ON "public"."brands"("tenant_id");

-- CreateIndex
CREATE INDEX "brands_slug_idx" ON "public"."brands"("slug");

-- CreateIndex
CREATE INDEX "brands_status_idx" ON "public"."brands"("status");

-- CreateIndex
CREATE INDEX "units_tenant_id_idx" ON "public"."units"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "units_tenant_id_name_key" ON "public"."units"("tenant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "units_tenant_id_short_name_key" ON "public"."units"("tenant_id", "short_name");

-- CreateIndex
CREATE INDEX "warranty_profiles_tenant_id_idx" ON "public"."warranty_profiles"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "public"."products"("slug");

-- CreateIndex
CREATE INDEX "products_tenant_id_idx" ON "public"."products"("tenant_id");

-- CreateIndex
CREATE INDEX "products_category_id_idx" ON "public"."products"("category_id");

-- CreateIndex
CREATE INDEX "products_brand_id_idx" ON "public"."products"("brand_id");

-- CreateIndex
CREATE INDEX "products_slug_idx" ON "public"."products"("slug");

-- CreateIndex
CREATE INDEX "products_sku_idx" ON "public"."products"("sku");

-- CreateIndex
CREATE INDEX "products_master_barcode_idx" ON "public"."products"("master_barcode");

-- CreateIndex
CREATE INDEX "products_status_idx" ON "public"."products"("status");

-- CreateIndex
CREATE INDEX "products_is_active_idx" ON "public"."products"("is_active");

-- CreateIndex
CREATE INDEX "products_is_serialized_idx" ON "public"."products"("is_serialized");

-- CreateIndex
CREATE UNIQUE INDEX "products_tenant_id_sku_key" ON "public"."products"("tenant_id", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "products_tenant_id_master_barcode_key" ON "public"."products"("tenant_id", "master_barcode");

-- CreateIndex
CREATE INDEX "product_images_product_id_idx" ON "public"."product_images"("product_id");

-- CreateIndex
CREATE INDEX "product_images_sort_order_idx" ON "public"."product_images"("sort_order");

-- CreateIndex
CREATE INDEX "product_variants_product_id_idx" ON "public"."product_variants"("product_id");

-- CreateIndex
CREATE INDEX "product_variants_sku_idx" ON "public"."product_variants"("sku");

-- CreateIndex
CREATE INDEX "product_variants_barcode_idx" ON "public"."product_variants"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_tenant_id_sku_key" ON "public"."product_variants"("tenant_id", "sku");

-- CreateIndex
CREATE INDEX "product_prices_product_id_idx" ON "public"."product_prices"("product_id");

-- CreateIndex
CREATE INDEX "product_prices_variant_id_idx" ON "public"."product_prices"("variant_id");

-- CreateIndex
CREATE INDEX "product_prices_location_id_idx" ON "public"."product_prices"("location_id");

-- CreateIndex
CREATE INDEX "product_prices_price_tier_idx" ON "public"."product_prices"("price_tier");

-- CreateIndex
CREATE INDEX "barcodes_product_id_idx" ON "public"."barcodes"("product_id");

-- CreateIndex
CREATE INDEX "barcodes_variant_id_idx" ON "public"."barcodes"("variant_id");

-- CreateIndex
CREATE INDEX "barcodes_barcode_idx" ON "public"."barcodes"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "barcodes_tenant_id_barcode_key" ON "public"."barcodes"("tenant_id", "barcode");

-- CreateIndex
CREATE INDEX "serialized_products_tenant_id_idx" ON "public"."serialized_products"("tenant_id");

-- CreateIndex
CREATE INDEX "serialized_products_product_id_idx" ON "public"."serialized_products"("product_id");

-- CreateIndex
CREATE INDEX "serialized_products_location_id_idx" ON "public"."serialized_products"("location_id");

-- CreateIndex
CREATE INDEX "serialized_products_serial_number_idx" ON "public"."serialized_products"("serial_number");

-- CreateIndex
CREATE INDEX "serialized_products_barcode_idx" ON "public"."serialized_products"("barcode");

-- CreateIndex
CREATE INDEX "serialized_products_status_idx" ON "public"."serialized_products"("status");

-- CreateIndex
CREATE INDEX "serialized_products_purchase_invoice_id_idx" ON "public"."serialized_products"("purchase_invoice_id");

-- CreateIndex
CREATE INDEX "serialized_products_sale_invoice_id_idx" ON "public"."serialized_products"("sale_invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "serialized_products_tenant_id_serial_number_key" ON "public"."serialized_products"("tenant_id", "serial_number");

-- CreateIndex
CREATE UNIQUE INDEX "serialized_products_tenant_id_internal_tracking_no_key" ON "public"."serialized_products"("tenant_id", "internal_tracking_no");

-- CreateIndex
CREATE INDEX "product_specifications_product_id_idx" ON "public"."product_specifications"("product_id");

-- CreateIndex
CREATE INDEX "product_specifications_key_idx" ON "public"."product_specifications"("key");

-- CreateIndex
CREATE UNIQUE INDEX "product_specifications_product_id_key_key" ON "public"."product_specifications"("product_id", "key");

-- CreateIndex
CREATE INDEX "product_attachments_product_id_idx" ON "public"."product_attachments"("product_id");

-- CreateIndex
CREATE INDEX "product_attachments_attachment_type_idx" ON "public"."product_attachments"("attachment_type");

-- AddForeignKey
ALTER TABLE "public"."categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."products" ADD CONSTRAINT "products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."products" ADD CONSTRAINT "products_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."products" ADD CONSTRAINT "products_warranty_profile_id_fkey" FOREIGN KEY ("warranty_profile_id") REFERENCES "public"."warranty_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_images" ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_prices" ADD CONSTRAINT "product_prices_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_prices" ADD CONSTRAINT "product_prices_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."barcodes" ADD CONSTRAINT "barcodes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."barcodes" ADD CONSTRAINT "barcodes_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."serialized_products" ADD CONSTRAINT "serialized_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_specifications" ADD CONSTRAINT "product_specifications_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_attachments" ADD CONSTRAINT "product_attachments_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
