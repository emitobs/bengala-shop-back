-- AlterTable
ALTER TABLE "store_settings" ADD COLUMN     "dlEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mpEnabled" BOOLEAN NOT NULL DEFAULT false;
