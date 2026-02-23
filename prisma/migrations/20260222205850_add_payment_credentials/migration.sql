-- AlterTable
ALTER TABLE "store_settings" ADD COLUMN     "dlApiKey" TEXT,
ADD COLUMN     "dlApiUrl" TEXT,
ADD COLUMN     "dlSecretKey" TEXT,
ADD COLUMN     "mpAccessToken" TEXT,
ADD COLUMN     "mpPublicKey" TEXT,
ADD COLUMN     "mpWebhookSecret" TEXT;
