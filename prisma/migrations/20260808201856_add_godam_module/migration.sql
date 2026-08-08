-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'CASHIER';

-- CreateTable
CREATE TABLE "public"."customers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50),
    "email" VARCHAR(255),
    "address" TEXT,
    "status" "public"."record_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sales" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "invoice_number" VARCHAR(100) NOT NULL,
    "customer_id" UUID,
    "salesman_id" UUID,
    "total_amount" DECIMAL(15,4) NOT NULL DEFAULT 0.00,
    "discount" DECIMAL(15,4) NOT NULL DEFAULT 0.00,
    "paid_amount" DECIMAL(15,4) NOT NULL DEFAULT 0.00,
    "payment_method" VARCHAR(50) NOT NULL DEFAULT 'CASH',
    "payment_status" VARCHAR(50) NOT NULL,
    "status" "public"."record_status" NOT NULL DEFAULT 'ACTIVE',
    "sale_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."suppliers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50),
    "email" VARCHAR(255),
    "address" TEXT,
    "company" VARCHAR(255),
    "status" "public"."record_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."purchases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "invoice_number" VARCHAR(100) NOT NULL,
    "supplier_id" UUID NOT NULL,
    "total_amount" DECIMAL(15,4) NOT NULL DEFAULT 0.00,
    "paid_amount" DECIMAL(15,4) NOT NULL DEFAULT 0.00,
    "payment_method" VARCHAR(50) NOT NULL DEFAULT 'CASH',
    "payment_status" VARCHAR(50) NOT NULL,
    "status" "public"."record_status" NOT NULL DEFAULT 'ACTIVE',
    "purchase_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."purchase_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "purchase_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "cost_price" DECIMAL(15,4) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "purchase_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sale_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sale_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "sale_price" DECIMAL(15,4) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."inventory_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "product_id" UUID NOT NULL,
    "purchase_id" UUID,
    "sale_id" UUID,
    "type" VARCHAR(50) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reference_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "sale_id" UUID,
    "purchase_id" UUID,
    "customer_id" UUID,
    "supplier_id" UUID,
    "received_by" UUID,
    "amount" DECIMAL(15,4) NOT NULL,
    "method" VARCHAR(50) NOT NULL DEFAULT 'CASH',
    "type" VARCHAR(50) NOT NULL,
    "reference_number" VARCHAR(100),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Expense" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'General',
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Shift" (
    "id" TEXT NOT NULL,
    "opened_by" TEXT NOT NULL DEFAULT 'Admin',
    "opening_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "opening_cash" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "closing_time" TIMESTAMP(3),
    "closing_cash" DOUBLE PRECISION,
    "expected_cash" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customers_phone_idx" ON "public"."customers"("phone");

-- CreateIndex
CREATE INDEX "customers_tenant_id_idx" ON "public"."customers"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_invoice_number_key" ON "public"."sales"("invoice_number");

-- CreateIndex
CREATE INDEX "sales_tenant_id_idx" ON "public"."sales"("tenant_id");

-- CreateIndex
CREATE INDEX "sales_customer_id_idx" ON "public"."sales"("customer_id");

-- CreateIndex
CREATE INDEX "sales_salesman_id_idx" ON "public"."sales"("salesman_id");

-- CreateIndex
CREATE INDEX "suppliers_phone_idx" ON "public"."suppliers"("phone");

-- CreateIndex
CREATE INDEX "suppliers_tenant_id_idx" ON "public"."suppliers"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchases_invoice_number_key" ON "public"."purchases"("invoice_number");

-- CreateIndex
CREATE INDEX "purchases_tenant_id_idx" ON "public"."purchases"("tenant_id");

-- CreateIndex
CREATE INDEX "purchases_supplier_id_idx" ON "public"."purchases"("supplier_id");

-- CreateIndex
CREATE INDEX "purchase_items_purchase_id_idx" ON "public"."purchase_items"("purchase_id");

-- CreateIndex
CREATE INDEX "purchase_items_product_id_idx" ON "public"."purchase_items"("product_id");

-- CreateIndex
CREATE INDEX "sale_items_sale_id_idx" ON "public"."sale_items"("sale_id");

-- CreateIndex
CREATE INDEX "sale_items_product_id_idx" ON "public"."sale_items"("product_id");

-- CreateIndex
CREATE INDEX "inventory_transactions_tenant_id_idx" ON "public"."inventory_transactions"("tenant_id");

-- CreateIndex
CREATE INDEX "inventory_transactions_product_id_idx" ON "public"."inventory_transactions"("product_id");

-- CreateIndex
CREATE INDEX "inventory_transactions_purchase_id_idx" ON "public"."inventory_transactions"("purchase_id");

-- CreateIndex
CREATE INDEX "inventory_transactions_sale_id_idx" ON "public"."inventory_transactions"("sale_id");

-- CreateIndex
CREATE INDEX "payments_sale_id_idx" ON "public"."payments"("sale_id");

-- CreateIndex
CREATE INDEX "payments_purchase_id_idx" ON "public"."payments"("purchase_id");

-- CreateIndex
CREATE INDEX "payments_customer_id_idx" ON "public"."payments"("customer_id");

-- CreateIndex
CREATE INDEX "payments_supplier_id_idx" ON "public"."payments"("supplier_id");

-- CreateIndex
CREATE INDEX "payments_tenant_id_idx" ON "public"."payments"("tenant_id");

-- AddForeignKey
ALTER TABLE "public"."sales" ADD CONSTRAINT "sales_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sales" ADD CONSTRAINT "sales_salesman_id_fkey" FOREIGN KEY ("salesman_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchases" ADD CONSTRAINT "purchases_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_items" ADD CONSTRAINT "purchase_items_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_items" ADD CONSTRAINT "purchase_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sale_items" ADD CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sale_items" ADD CONSTRAINT "sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventory_transactions" ADD CONSTRAINT "inventory_transactions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventory_transactions" ADD CONSTRAINT "inventory_transactions_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventory_transactions" ADD CONSTRAINT "inventory_transactions_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."serialized_products" ADD CONSTRAINT "serialized_products_purchase_invoice_id_fkey" FOREIGN KEY ("purchase_invoice_id") REFERENCES "public"."purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."serialized_products" ADD CONSTRAINT "serialized_products_purchase_item_id_fkey" FOREIGN KEY ("purchase_item_id") REFERENCES "public"."purchase_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."serialized_products" ADD CONSTRAINT "serialized_products_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."serialized_products" ADD CONSTRAINT "serialized_products_sale_invoice_id_fkey" FOREIGN KEY ("sale_invoice_id") REFERENCES "public"."sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."serialized_products" ADD CONSTRAINT "serialized_products_sale_item_id_fkey" FOREIGN KEY ("sale_item_id") REFERENCES "public"."sale_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."serialized_products" ADD CONSTRAINT "serialized_products_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
