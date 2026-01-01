-- CreateTable
CREATE TABLE "measurement_share_links" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "updateWindowEnd" TIMESTAMP(3),
    "clientId" TEXT NOT NULL,
    "designerId" TEXT NOT NULL,
    "measurementId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "measurement_share_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "measurement_share_links_token_key" ON "measurement_share_links"("token");

-- CreateIndex
CREATE UNIQUE INDEX "measurement_share_links_measurementId_key" ON "measurement_share_links"("measurementId");

-- AddForeignKey
ALTER TABLE "measurement_share_links" ADD CONSTRAINT "measurement_share_links_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "measurement_share_links" ADD CONSTRAINT "measurement_share_links_designerId_fkey" FOREIGN KEY ("designerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "measurement_share_links" ADD CONSTRAINT "measurement_share_links_measurementId_fkey" FOREIGN KEY ("measurementId") REFERENCES "measurements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
