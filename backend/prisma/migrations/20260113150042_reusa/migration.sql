/*
  Warnings:

  - You are about to drop the column `userId` on the `Product` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,deviceToken]` on the table `UserDevice` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `sellerId` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'COUNTERED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OfferType" AS ENUM ('PRICE', 'TRADE', 'MIXED');

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_userId_fkey";

-- DropIndex
DROP INDEX "Product_userId_idx";

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "co2Footprint" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
ADD COLUMN     "waterFootprint" DOUBLE PRECISION NOT NULL DEFAULT 2000;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "userId",
ADD COLUMN     "sellerId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "targetId" TEXT;

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "reviewedUserId" TEXT,
ADD COLUMN     "tags" TEXT[];

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "amount" DOUBLE PRECISION,
ADD COLUMN     "conversationId" TEXT,
ADD COLUMN     "deliveryMethod" TEXT,
ADD COLUMN     "offerId" TEXT,
ADD COLUMN     "paymentPreferenceId" TEXT,
ADD COLUMN     "paymentStatus" TEXT,
ADD COLUMN     "paymentStatusDetail" TEXT,
ADD COLUMN     "shippingAddress" TEXT,
ADD COLUMN     "shippingBarcode" TEXT,
ADD COLUMN     "shippingCity" TEXT,
ADD COLUMN     "shippingCountyCode" TEXT,
ADD COLUMN     "shippingLabelData" TEXT,
ADD COLUMN     "shippingLabelType" TEXT,
ADD COLUMN     "shippingLabelUrl" TEXT,
ADD COLUMN     "shippingNotes" TEXT,
ADD COLUMN     "shippingOrderNumber" TEXT,
ADD COLUMN     "shippingPostalCode" TEXT,
ADD COLUMN     "shippingState" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bankDetails" JSONB,
ADD COLUMN     "isOnline" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "itemsRescued" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastSeenAt" TIMESTAMP(3),
ADD COLUMN     "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "reviewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalCo2Saved" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalWaterSaved" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "UserDevice" ADD COLUMN     "platform" TEXT,
ADD COLUMN     "token" TEXT;

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "type" "OfferType" NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DOUBLE PRECISION,
    "cashDifference" DOUBLE PRECISION,
    "tradeProductIds" TEXT[],
    "message" TEXT,
    "rejectionReason" TEXT,
    "parentOfferId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_TradeProducts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_token_idx" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- CreateIndex
CREATE INDEX "Offer_productId_idx" ON "Offer"("productId");

-- CreateIndex
CREATE INDEX "Offer_buyerId_idx" ON "Offer"("buyerId");

-- CreateIndex
CREATE INDEX "Offer_sellerId_idx" ON "Offer"("sellerId");

-- CreateIndex
CREATE INDEX "Offer_status_idx" ON "Offer"("status");

-- CreateIndex
CREATE INDEX "Offer_createdAt_idx" ON "Offer"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "_TradeProducts_AB_unique" ON "_TradeProducts"("A", "B");

-- CreateIndex
CREATE INDEX "_TradeProducts_B_index" ON "_TradeProducts"("B");

-- CreateIndex
CREATE INDEX "Product_sellerId_idx" ON "Product"("sellerId");

-- CreateIndex
CREATE INDEX "Report_targetId_idx" ON "Report"("targetId");

-- CreateIndex
CREATE INDEX "Review_reviewedUserId_idx" ON "Review"("reviewedUserId");

-- CreateIndex
CREATE INDEX "Transaction_offerId_idx" ON "Transaction"("offerId");

-- CreateIndex
CREATE UNIQUE INDEX "UserDevice_userId_deviceToken_key" ON "UserDevice"("userId", "deviceToken");

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_parentOfferId_fkey" FOREIGN KEY ("parentOfferId") REFERENCES "Offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TradeProducts" ADD CONSTRAINT "_TradeProducts_A_fkey" FOREIGN KEY ("A") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TradeProducts" ADD CONSTRAINT "_TradeProducts_B_fkey" FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
