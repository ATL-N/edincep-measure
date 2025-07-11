/*
  Warnings:

  - You are about to drop the column `designerId` on the `clients` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DELETED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('ORDER_CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'DELIVERED');

-- DropForeignKey
ALTER TABLE "clients" DROP CONSTRAINT "clients_designerId_fkey";

-- DropIndex
DROP INDEX "clients_designerId_idx";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "clients" DROP COLUMN "designerId";

-- AlterTable
ALTER TABLE "measurements" ADD COLUMN     "completionDeadline" TIMESTAMP(3),
ADD COLUMN     "designImageUrl" TEXT,
ADD COLUMN     "materialImageUrl" TEXT,
ADD COLUMN     "status" "OrderStatus" NOT NULL DEFAULT 'ORDER_CONFIRMED';

-- CreateTable
CREATE TABLE "client_designers" (
    "clientId" TEXT NOT NULL,
    "designerId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_designers_pkey" PRIMARY KEY ("clientId","designerId")
);

-- AddForeignKey
ALTER TABLE "client_designers" ADD CONSTRAINT "client_designers_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_designers" ADD CONSTRAINT "client_designers_designerId_fkey" FOREIGN KEY ("designerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
