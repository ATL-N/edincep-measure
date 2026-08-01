-- Per-designer private notes on shared clients
ALTER TABLE "client_designers" ADD COLUMN "notes" TEXT;

-- Carry existing client notes over to every designer already assigned,
-- so nobody loses what they wrote.
UPDATE "client_designers" cd
SET "notes" = c."notes"
FROM "clients" c
WHERE cd."clientId" = c."id" AND c."notes" IS NOT NULL;

-- CreateTable
CREATE TABLE "device_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "deviceName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "device_tokens_tokenHash_key" ON "device_tokens"("tokenHash");
CREATE INDEX "device_tokens_userId_idx" ON "device_tokens"("userId");
CREATE INDEX "device_tokens_familyId_idx" ON "device_tokens"("familyId");

ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
