-- Designs from the app's Design tab (synced from devices)
CREATE TABLE "designs" (
    "id" TEXT NOT NULL,
    "designerId" TEXT NOT NULL,
    "clientId" TEXT,
    "measurementId" TEXT,
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "designs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "designs_designerId_idx" ON "designs"("designerId");
CREATE INDEX "designs_measurementId_idx" ON "designs"("measurementId");

ALTER TABLE "designs" ADD CONSTRAINT "designs_designerId_fkey" FOREIGN KEY ("designerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
