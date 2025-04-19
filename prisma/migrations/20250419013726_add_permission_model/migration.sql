-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "objectType" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "grantedBy" TEXT,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "permissions_objectType_objectId_idx" ON "permissions"("objectType", "objectId");

-- CreateIndex
CREATE INDEX "permissions_subjectType_subjectId_idx" ON "permissions"("subjectType", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_objectType_objectId_subjectType_subjectId_actio_key" ON "permissions"("objectType", "objectId", "subjectType", "subjectId", "action");
