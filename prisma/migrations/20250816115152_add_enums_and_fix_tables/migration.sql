/*
  Warnings:

  - The `status` column on the `clients` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `measurements` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('ACTIVE', 'DELETED');

-- AlterTable
ALTER TABLE "clients" DROP COLUMN "status",
ADD COLUMN     "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "measurements" ADD COLUMN     "orderStatus" "OrderStatus" NOT NULL DEFAULT 'ORDER_CONFIRMED',
DROP COLUMN "status",
ADD COLUMN     "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE';

-- DropEnum
DROP TYPE "ClientStatus";
