-- CreateEnum
CREATE TYPE "InventoryCountStatus" AS ENUM ('planned', 'running', 'closed');

-- AlterTable
ALTER TABLE "Location" ADD COLUMN     "expectedQty" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "InventoryCount" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" "InventoryCountStatus" NOT NULL DEFAULT 'planned',
    "tolerancePct" DOUBLE PRECISION,
    "plannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryCount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryTask" (
    "id" TEXT NOT NULL,
    "countId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "blind" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryScan" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "skuId" TEXT,
    "qty" DOUBLE PRECISION NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deviceId" TEXT,

    CONSTRAINT "InventoryScan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryRecount" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "qty2" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryRecount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryVariance" (
    "id" TEXT NOT NULL,
    "countId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "skuId" TEXT,
    "expectedQty" DOUBLE PRECISION NOT NULL,
    "foundQty" DOUBLE PRECISION NOT NULL,
    "difference" DOUBLE PRECISION NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryVariance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventoryCount_projectId_idx" ON "InventoryCount"("projectId");

-- CreateIndex
CREATE INDEX "InventoryTask_countId_idx" ON "InventoryTask"("countId");

-- CreateIndex
CREATE INDEX "InventoryTask_zoneId_idx" ON "InventoryTask"("zoneId");

-- CreateIndex
CREATE INDEX "InventoryTask_assignedToId_idx" ON "InventoryTask"("assignedToId");

-- CreateIndex
CREATE INDEX "InventoryScan_taskId_idx" ON "InventoryScan"("taskId");

-- CreateIndex
CREATE INDEX "InventoryScan_locationId_idx" ON "InventoryScan"("locationId");

-- CreateIndex
CREATE INDEX "InventoryScan_skuId_idx" ON "InventoryScan"("skuId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryRecount_scanId_key" ON "InventoryRecount"("scanId");

-- CreateIndex
CREATE INDEX "InventoryVariance_countId_idx" ON "InventoryVariance"("countId");

-- CreateIndex
CREATE INDEX "InventoryVariance_locationId_idx" ON "InventoryVariance"("locationId");

-- CreateIndex
CREATE INDEX "InventoryVariance_skuId_idx" ON "InventoryVariance"("skuId");

-- AddForeignKey
ALTER TABLE "InventoryCount" ADD CONSTRAINT "InventoryCount_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTask" ADD CONSTRAINT "InventoryTask_countId_fkey" FOREIGN KEY ("countId") REFERENCES "InventoryCount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTask" ADD CONSTRAINT "InventoryTask_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "WarehouseZone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTask" ADD CONSTRAINT "InventoryTask_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryScan" ADD CONSTRAINT "InventoryScan_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "InventoryTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryScan" ADD CONSTRAINT "InventoryScan_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryScan" ADD CONSTRAINT "InventoryScan_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryRecount" ADD CONSTRAINT "InventoryRecount_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "InventoryScan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryVariance" ADD CONSTRAINT "InventoryVariance_countId_fkey" FOREIGN KEY ("countId") REFERENCES "InventoryCount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryVariance" ADD CONSTRAINT "InventoryVariance_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryVariance" ADD CONSTRAINT "InventoryVariance_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE SET NULL ON UPDATE CASCADE;

