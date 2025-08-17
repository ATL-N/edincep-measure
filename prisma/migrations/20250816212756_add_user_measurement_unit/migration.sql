-- CreateEnum
CREATE TYPE "MeasurementUnit" AS ENUM ('INCH', 'CENTIMETER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "measurementUnit" "MeasurementUnit" NOT NULL DEFAULT 'INCH';
