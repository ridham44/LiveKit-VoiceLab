-- CreateTable
CREATE TABLE "demo_orders" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "estimatedDelivery" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demo_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "confirmationId" TEXT NOT NULL,
    "customer" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "appointments_confirmationId_key" ON "appointments"("confirmationId");
