DO $$ BEGIN
  CREATE TYPE "ProductAvailabilityStatus" AS ENUM ('in_stock', 'low_stock', 'preorder', 'out_of_stock', 'discontinued');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ProductAuctionStatus" AS ENUM ('scheduled', 'active', 'closed', 'awarded', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ProductPreorderStatus" AS ENUM ('reserved', 'confirmed', 'cancelled', 'fulfilled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "imageUrls" JSONB,
  ADD COLUMN IF NOT EXISTS "availabilityStatus" "ProductAvailabilityStatus" NOT NULL DEFAULT 'in_stock',
  ADD COLUMN IF NOT EXISTS "inventoryQuantity" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "leadTimeDays" INTEGER,
  ADD COLUMN IF NOT EXISTS "minimumOrderQuantity" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "compareAtAmountMinor" INTEGER,
  ADD COLUMN IF NOT EXISTS "salePriceMinor" INTEGER,
  ADD COLUMN IF NOT EXISTS "saleStartsAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "saleEndsAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "isPreorderEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "preorderReleaseAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "preorderDepositAmountMinor" INTEGER;

CREATE INDEX IF NOT EXISTS "Product_availabilityStatus_idx" ON "Product"("availabilityStatus");

CREATE TABLE IF NOT EXISTS "ProductAuction" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "status" "ProductAuctionStatus" NOT NULL DEFAULT 'active',
  "currency" TEXT NOT NULL,
  "startingBidMinor" INTEGER NOT NULL,
  "reserveBidMinor" INTEGER,
  "currentBidMinor" INTEGER,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "winnerBuyerProfileId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductAuction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProductAuction_productId_key" ON "ProductAuction"("productId");
CREATE INDEX IF NOT EXISTS "ProductAuction_status_idx" ON "ProductAuction"("status");
CREATE INDEX IF NOT EXISTS "ProductAuction_startsAt_idx" ON "ProductAuction"("startsAt");
CREATE INDEX IF NOT EXISTS "ProductAuction_endsAt_idx" ON "ProductAuction"("endsAt");
CREATE INDEX IF NOT EXISTS "ProductAuction_winnerBuyerProfileId_idx" ON "ProductAuction"("winnerBuyerProfileId");

CREATE TABLE IF NOT EXISTS "ProductAuctionBid" (
  "id" TEXT NOT NULL,
  "auctionId" TEXT NOT NULL,
  "buyerProfileId" TEXT NOT NULL,
  "amountMinor" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductAuctionBid_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProductAuctionBid_auctionId_idx" ON "ProductAuctionBid"("auctionId");
CREATE INDEX IF NOT EXISTS "ProductAuctionBid_buyerProfileId_idx" ON "ProductAuctionBid"("buyerProfileId");
CREATE INDEX IF NOT EXISTS "ProductAuctionBid_amountMinor_idx" ON "ProductAuctionBid"("amountMinor");

CREATE TABLE IF NOT EXISTS "ProductPreorderReservation" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "buyerProfileId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitAmountMinor" INTEGER NOT NULL,
  "totalAmountMinor" INTEGER NOT NULL,
  "status" "ProductPreorderStatus" NOT NULL DEFAULT 'reserved',
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductPreorderReservation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProductPreorderReservation_productId_idx" ON "ProductPreorderReservation"("productId");
CREATE INDEX IF NOT EXISTS "ProductPreorderReservation_buyerProfileId_idx" ON "ProductPreorderReservation"("buyerProfileId");
CREATE INDEX IF NOT EXISTS "ProductPreorderReservation_status_idx" ON "ProductPreorderReservation"("status");

ALTER TABLE "ProductAuction"
  ADD CONSTRAINT "ProductAuction_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductAuction"
  ADD CONSTRAINT "ProductAuction_winnerBuyerProfileId_fkey"
  FOREIGN KEY ("winnerBuyerProfileId") REFERENCES "BuyerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProductAuctionBid"
  ADD CONSTRAINT "ProductAuctionBid_auctionId_fkey"
  FOREIGN KEY ("auctionId") REFERENCES "ProductAuction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductAuctionBid"
  ADD CONSTRAINT "ProductAuctionBid_buyerProfileId_fkey"
  FOREIGN KEY ("buyerProfileId") REFERENCES "BuyerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductPreorderReservation"
  ADD CONSTRAINT "ProductPreorderReservation_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductPreorderReservation"
  ADD CONSTRAINT "ProductPreorderReservation_buyerProfileId_fkey"
  FOREIGN KEY ("buyerProfileId") REFERENCES "BuyerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "Product"
SET
  "imageUrls" = jsonb_build_array(
    concat(
      'data:image/svg+xml;base64,',
      encode(
        convert_to(
          '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#081225"/><stop offset="1" stop-color="#0f766e"/></linearGradient></defs><rect width="1200" height="900" fill="url(#g)"/><circle cx="960" cy="180" r="180" fill="rgba(255,255,255,.08)"/><text x="96" y="420" fill="#f8fafc" font-family="Arial" font-size="72" font-weight="700">Atlas Office Headphones</text><text x="96" y="500" fill="#cbd5e1" font-family="Arial" font-size="34">Retail product · Instant checkout</text></svg>',
          'UTF8'
        ),
        'base64'
      )
    )
  ),
  "availabilityStatus" = 'in_stock',
  "inventoryQuantity" = 48,
  "leadTimeDays" = 3,
  "minimumOrderQuantity" = 1,
  "compareAtAmountMinor" = 24900,
  "salePriceMinor" = 17900,
  "saleStartsAt" = CURRENT_TIMESTAMP - INTERVAL '7 day',
  "saleEndsAt" = CURRENT_TIMESTAMP + INTERVAL '30 day'
WHERE "slug" = 'atlas-office-headphones';

UPDATE "Product"
SET
  "imageUrls" = jsonb_build_array(
    concat(
      'data:image/svg+xml;base64,',
      encode(
        convert_to(
          '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#111827"/><stop offset="1" stop-color="#1d4ed8"/></linearGradient></defs><rect width="1200" height="900" fill="url(#g)"/><circle cx="940" cy="220" r="170" fill="rgba(255,255,255,.09)"/><text x="96" y="420" fill="#f8fafc" font-family="Arial" font-size="68" font-weight="700">Atlas Escrow Sensor</text><text x="96" y="500" fill="#bfdbfe" font-family="Arial" font-size="34">Wholesale auction · Escrow-ready</text></svg>',
          'UTF8'
        ),
        'base64'
      )
    )
  ),
  "availabilityStatus" = 'low_stock',
  "inventoryQuantity" = 12,
  "leadTimeDays" = 14,
  "minimumOrderQuantity" = 10
WHERE "slug" = 'atlas-escrow-sensor';

UPDATE "Product"
SET
  "imageUrls" = jsonb_build_array(
    concat(
      'data:image/svg+xml;base64,',
      encode(
        convert_to(
          '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#3f2d16"/><stop offset="1" stop-color="#b45309"/></linearGradient></defs><rect width="1200" height="900" fill="url(#g)"/><circle cx="980" cy="160" r="170" fill="rgba(255,255,255,.1)"/><text x="96" y="420" fill="#fffbeb" font-family="Arial" font-size="68" font-weight="700">Ruflo Demo Laptop</text><text x="96" y="500" fill="#fde68a" font-family="Arial" font-size="34">Wholesale preorder · Rolling release</text></svg>',
          'UTF8'
        ),
        'base64'
      )
    )
  ),
  "availabilityStatus" = 'preorder',
  "inventoryQuantity" = 0,
  "leadTimeDays" = 21,
  "minimumOrderQuantity" = 5,
  "isPreorderEnabled" = true,
  "preorderReleaseAt" = CURRENT_TIMESTAMP + INTERVAL '21 day',
  "preorderDepositAmountMinor" = 15000
WHERE "slug" = 'ruflo-demo-laptop';

INSERT INTO "ProductAuction" (
  "id",
  "productId",
  "status",
  "currency",
  "startingBidMinor",
  "reserveBidMinor",
  "currentBidMinor",
  "startsAt",
  "endsAt",
  "createdAt",
  "updatedAt"
)
SELECT
  concat('auction_', p."id"),
  p."id",
  'active',
  'USD',
  210000,
  235000,
  219500,
  CURRENT_TIMESTAMP - INTERVAL '1 day',
  CURRENT_TIMESTAMP + INTERVAL '10 day',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Product" p
WHERE p."slug" = 'atlas-escrow-sensor'
ON CONFLICT ("productId") DO UPDATE
SET
  "status" = EXCLUDED."status",
  "currency" = EXCLUDED."currency",
  "startingBidMinor" = EXCLUDED."startingBidMinor",
  "reserveBidMinor" = EXCLUDED."reserveBidMinor",
  "currentBidMinor" = EXCLUDED."currentBidMinor",
  "startsAt" = EXCLUDED."startsAt",
  "endsAt" = EXCLUDED."endsAt",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ProductAuctionBid" (
  "id",
  "auctionId",
  "buyerProfileId",
  "amountMinor",
  "createdAt",
  "updatedAt"
)
SELECT
  concat('bid_', a."id"),
  a."id",
  bp."id",
  219500,
  CURRENT_TIMESTAMP - INTERVAL '12 hour',
  CURRENT_TIMESTAMP - INTERVAL '12 hour'
FROM "ProductAuction" a
JOIN "Product" p ON p."id" = a."productId"
JOIN "BuyerProfile" bp ON bp."id" = (SELECT "id" FROM "BuyerProfile" ORDER BY "createdAt" ASC LIMIT 1)
WHERE p."slug" = 'atlas-escrow-sensor'
  AND NOT EXISTS (
    SELECT 1
    FROM "ProductAuctionBid" existing
    WHERE existing."auctionId" = a."id"
      AND existing."buyerProfileId" = bp."id"
      AND existing."amountMinor" = 219500
  );
