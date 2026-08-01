-- CreateTable
CREATE TABLE "measurement_photos" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "measurementId" TEXT,
    "shareLinkId" TEXT,
    "uploadedById" TEXT,
    "kind" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "analysis" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "measurement_photos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "measurement_photos_measurementId_idx" ON "measurement_photos"("measurementId");
CREATE INDEX "measurement_photos_shareLinkId_idx" ON "measurement_photos"("shareLinkId");
CREATE INDEX "measurement_photos_clientId_idx" ON "measurement_photos"("clientId");

ALTER TABLE "measurement_photos" ADD CONSTRAINT "measurement_photos_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "measurement_photos" ADD CONSTRAINT "measurement_photos_measurementId_fkey" FOREIGN KEY ("measurementId") REFERENCES "measurements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "measurement_photos" ADD CONSTRAINT "measurement_photos_shareLinkId_fkey" FOREIGN KEY ("shareLinkId") REFERENCES "measurement_share_links"("id") ON DELETE SET NULL ON UPDATE CASCADE;
