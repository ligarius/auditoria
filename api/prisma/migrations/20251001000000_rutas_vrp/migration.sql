-- CreateEnum
CREATE TYPE "RoutePlanStatus" AS ENUM ('draft', 'optimizing', 'completed');

-- CreateTable
CREATE TABLE "Carrier" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Carrier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutePlan" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "carrierId" TEXT,
    "scenario" TEXT NOT NULL,
    "status" "RoutePlanStatus" NOT NULL DEFAULT 'draft',
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoutePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "carrierId" TEXT,
    "name" TEXT NOT NULL,
    "capacity" DOUBLE PRECISION NOT NULL,
    "costKm" DOUBLE PRECISION NOT NULL,
    "fixed" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tariff" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "carrierId" TEXT,
    "fromClient" TEXT NOT NULL,
    "toClient" TEXT NOT NULL,
    "distanceKm" DOUBLE PRECISION,
    "cost" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tariff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteStop" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "client" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3),
    "windowEnd" TIMESTAMP(3),
    "demandVol" DOUBLE PRECISION,
    "demandKg" DOUBLE PRECISION,
    "sequence" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RouteStop_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Carrier_projectId_idx" ON "Carrier"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Carrier_projectId_name_key" ON "Carrier"("projectId", "name");

-- CreateIndex
CREATE INDEX "RoutePlan_projectId_idx" ON "RoutePlan"("projectId");

-- CreateIndex
CREATE INDEX "RoutePlan_carrierId_idx" ON "RoutePlan"("carrierId");

-- CreateIndex
CREATE INDEX "Vehicle_planId_idx" ON "Vehicle"("planId");

-- CreateIndex
CREATE INDEX "Vehicle_carrierId_idx" ON "Vehicle"("carrierId");

-- CreateIndex
CREATE INDEX "Tariff_planId_idx" ON "Tariff"("planId");

-- CreateIndex
CREATE INDEX "Tariff_carrierId_idx" ON "Tariff"("carrierId");

-- CreateIndex
CREATE INDEX "RouteStop_planId_idx" ON "RouteStop"("planId");

-- AddForeignKey
ALTER TABLE "Carrier" ADD CONSTRAINT "Carrier_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutePlan" ADD CONSTRAINT "RoutePlan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutePlan" ADD CONSTRAINT "RoutePlan_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_planId_fkey" FOREIGN KEY ("planId") REFERENCES "RoutePlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tariff" ADD CONSTRAINT "Tariff_planId_fkey" FOREIGN KEY ("planId") REFERENCES "RoutePlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tariff" ADD CONSTRAINT "Tariff_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteStop" ADD CONSTRAINT "RouteStop_planId_fkey" FOREIGN KEY ("planId") REFERENCES "RoutePlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

