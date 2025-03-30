-- CreateTable
CREATE TABLE "qr_codes" (
    "id" TEXT NOT NULL,
    "bin_id" TEXT NOT NULL,
    "shortCode" VARCHAR(50) NOT NULL,
    "data" JSONB NOT NULL,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qr_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "qr_codes_shortCode_key" ON "qr_codes"("shortCode");

-- CreateIndex
CREATE INDEX "qr_codes_shortCode_idx" ON "qr_codes"("shortCode");

-- CreateIndex
CREATE INDEX "qr_codes_bin_id_idx" ON "qr_codes"("bin_id");

-- AddForeignKey
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_bin_id_fkey" FOREIGN KEY ("bin_id") REFERENCES "bins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
