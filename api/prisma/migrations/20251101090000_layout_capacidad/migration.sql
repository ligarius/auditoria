CREATE TABLE "CapacityCalc" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "rackType" TEXT NOT NULL,
    "aisles" INTEGER NOT NULL,
    "pp" INTEGER NOT NULL,
    "memo" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CapacityCalc_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CapacityCalc_zoneId_idx" ON "CapacityCalc"("zoneId");

ALTER TABLE "CapacityCalc" ADD CONSTRAINT "CapacityCalc_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "WarehouseZone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
