-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CLIENT', 'DESIGNER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('Active', 'Inactive');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CLIENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "notes" TEXT,
    "status" "ClientStatus" NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "designerId" TEXT NOT NULL,
    "userId" TEXT,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "measurements" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "shoulderToChestSnug" DOUBLE PRECISION,
    "shoulderToChestStatic" DOUBLE PRECISION,
    "shoulderToChestDynamic" DOUBLE PRECISION,
    "shoulderToBustSnug" DOUBLE PRECISION,
    "shoulderToBustStatic" DOUBLE PRECISION,
    "shoulderToBustDynamic" DOUBLE PRECISION,
    "shoulderToUnderbustSnug" DOUBLE PRECISION,
    "shoulderToUnderbustStatic" DOUBLE PRECISION,
    "shoulderToUnderbustDynamic" DOUBLE PRECISION,
    "shoulderToWaistFrontSnug" DOUBLE PRECISION,
    "shoulderToWaistFrontStatic" DOUBLE PRECISION,
    "shoulderToWaistFrontDynamic" DOUBLE PRECISION,
    "shoulderToWaistBackSnug" DOUBLE PRECISION,
    "shoulderToWaistBackStatic" DOUBLE PRECISION,
    "shoulderToWaistBackDynamic" DOUBLE PRECISION,
    "waistToHipSnug" DOUBLE PRECISION,
    "waistToHipStatic" DOUBLE PRECISION,
    "waistToHipDynamic" DOUBLE PRECISION,
    "shoulderToKneeSnug" DOUBLE PRECISION,
    "shoulderToKneeStatic" DOUBLE PRECISION,
    "shoulderToKneeDynamic" DOUBLE PRECISION,
    "shoulderToDressLengthSnug" DOUBLE PRECISION,
    "shoulderToDressLengthStatic" DOUBLE PRECISION,
    "shoulderToDressLengthDynamic" DOUBLE PRECISION,
    "shoulderToAnkleSnug" DOUBLE PRECISION,
    "shoulderToAnkleStatic" DOUBLE PRECISION,
    "shoulderToAnkleDynamic" DOUBLE PRECISION,
    "shoulderWidthSnug" DOUBLE PRECISION,
    "shoulderWidthStatic" DOUBLE PRECISION,
    "shoulderWidthDynamic" DOUBLE PRECISION,
    "nippleToNippleSnug" DOUBLE PRECISION,
    "nippleToNippleStatic" DOUBLE PRECISION,
    "nippleToNippleDynamic" DOUBLE PRECISION,
    "offShoulderSnug" DOUBLE PRECISION,
    "offShoulderStatic" DOUBLE PRECISION,
    "offShoulderDynamic" DOUBLE PRECISION,
    "bustSnug" DOUBLE PRECISION,
    "bustStatic" DOUBLE PRECISION,
    "bustDynamic" DOUBLE PRECISION,
    "underBustSnug" DOUBLE PRECISION,
    "underBustStatic" DOUBLE PRECISION,
    "underBustDynamic" DOUBLE PRECISION,
    "waistSnug" DOUBLE PRECISION,
    "waistStatic" DOUBLE PRECISION,
    "waistDynamic" DOUBLE PRECISION,
    "hipSnug" DOUBLE PRECISION,
    "hipStatic" DOUBLE PRECISION,
    "hipDynamic" DOUBLE PRECISION,
    "thighSnug" DOUBLE PRECISION,
    "thighStatic" DOUBLE PRECISION,
    "thighDynamic" DOUBLE PRECISION,
    "kneeSnug" DOUBLE PRECISION,
    "kneeStatic" DOUBLE PRECISION,
    "kneeDynamic" DOUBLE PRECISION,
    "ankleSnug" DOUBLE PRECISION,
    "ankleStatic" DOUBLE PRECISION,
    "ankleDynamic" DOUBLE PRECISION,
    "neckSnug" DOUBLE PRECISION,
    "neckStatic" DOUBLE PRECISION,
    "neckDynamic" DOUBLE PRECISION,
    "shirtSleeveSnug" DOUBLE PRECISION,
    "shirtSleeveStatic" DOUBLE PRECISION,
    "shirtSleeveDynamic" DOUBLE PRECISION,
    "elbowLengthSnug" DOUBLE PRECISION,
    "elbowLengthStatic" DOUBLE PRECISION,
    "elbowLengthDynamic" DOUBLE PRECISION,
    "longSleevesSnug" DOUBLE PRECISION,
    "longSleevesStatic" DOUBLE PRECISION,
    "longSleevesDynamic" DOUBLE PRECISION,
    "aroundArmSnug" DOUBLE PRECISION,
    "aroundArmStatic" DOUBLE PRECISION,
    "aroundArmDynamic" DOUBLE PRECISION,
    "elbowSnug" DOUBLE PRECISION,
    "elbowStatic" DOUBLE PRECISION,
    "elbowDynamic" DOUBLE PRECISION,
    "wristSnug" DOUBLE PRECISION,
    "wristStatic" DOUBLE PRECISION,
    "wristDynamic" DOUBLE PRECISION,
    "inSeamSnug" DOUBLE PRECISION,
    "inSeamStatic" DOUBLE PRECISION,
    "inSeamDynamic" DOUBLE PRECISION,
    "outSeamSnug" DOUBLE PRECISION,
    "outSeamStatic" DOUBLE PRECISION,
    "outSeamDynamic" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "measurements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "clients_userId_key" ON "clients"("userId");

-- CreateIndex
CREATE INDEX "clients_name_idx" ON "clients"("name");

-- CreateIndex
CREATE INDEX "clients_designerId_idx" ON "clients"("designerId");

-- CreateIndex
CREATE INDEX "measurements_creatorId_idx" ON "measurements"("creatorId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_designerId_fkey" FOREIGN KEY ("designerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
