-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('TEACHER', 'STUDENT');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "BusinessStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "BusinessEventType" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'SUSPENDED', 'REACTIVATED');

-- CreateEnum
CREATE TYPE "InventoryMovementType" AS ENUM ('STOCK_IN', 'SALE', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'REVERSAL_IN', 'REVERSAL_OUT');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('COMPLETED', 'REVERSED');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('SUPPLIES', 'TRANSPORT', 'MARKETING', 'UTILITIES', 'PACKAGING', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('ACTIVE', 'REVERSED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'SUSPEND', 'REACTIVATE', 'LOGIN', 'LOGOUT', 'REVERSE');

-- CreateTable
CREATE TABLE "School" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentInvitation" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "cohortId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "redeemedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL,

    CONSTRAINT "StudentInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cohort" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cohort_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "cohortId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "cohortId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Business" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "BusinessStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessStatusEvent" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "event" "BusinessEventType" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL,

    CONSTRAINT "BusinessStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sku" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'piece',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "type" "InventoryMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCostPaise" INTEGER NOT NULL,
    "note" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reversalOfId" UUID,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryBalance" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "quantityOnHand" INTEGER NOT NULL DEFAULT 0,
    "inventoryValuePaise" INTEGER NOT NULL DEFAULT 0,
    "averageUnitCostPaise" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "soldById" UUID NOT NULL,
    "status" "SaleStatus" NOT NULL DEFAULT 'COMPLETED',
    "totalPaise" INTEGER NOT NULL,
    "note" TEXT,
    "soldAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reversedAt" TIMESTAMP(3),
    "reversedById" UUID,
    "reversalNote" TEXT,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleItem" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "saleId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitSellingPricePaise" INTEGER NOT NULL,
    "unitCostPaise" INTEGER NOT NULL,
    "revenuePaise" INTEGER NOT NULL,
    "cogsPaise" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inventoryMovementId" UUID NOT NULL,

    CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "ExpenseCategory" NOT NULL DEFAULT 'OTHER',
    "status" "ExpenseStatus" NOT NULL DEFAULT 'ACTIVE',
    "amountPaise" INTEGER NOT NULL,
    "incurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reversalOfId" UUID,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "actorId" UUID,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "School_slug_key" ON "School"("slug");

-- CreateIndex
CREATE INDEX "User_schoolId_role_idx" ON "User"("schoolId", "role");

-- CreateIndex
CREATE INDEX "User_schoolId_status_idx" ON "User"("schoolId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "User_schoolId_username_key" ON "User"("schoolId", "username");

-- CreateIndex
CREATE UNIQUE INDEX "User_id_schoolId_key" ON "User"("id", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentInvitation_tokenHash_key" ON "StudentInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "StudentInvitation_schoolId_idx" ON "StudentInvitation"("schoolId");

-- CreateIndex
CREATE INDEX "StudentInvitation_expiresAt_idx" ON "StudentInvitation"("expiresAt");

-- CreateIndex
CREATE INDEX "Cohort_schoolId_idx" ON "Cohort"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Cohort_schoolId_name_key" ON "Cohort"("schoolId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Cohort_id_schoolId_key" ON "Cohort"("id", "schoolId");

-- CreateIndex
CREATE INDEX "Team_schoolId_idx" ON "Team"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_cohortId_name_key" ON "Team"("cohortId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Team_id_schoolId_key" ON "Team"("id", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_id_cohortId_schoolId_key" ON "Team"("id", "cohortId", "schoolId");

-- CreateIndex
CREATE INDEX "TeamMember_schoolId_idx" ON "TeamMember"("schoolId");

-- CreateIndex
CREATE INDEX "TeamMember_teamId_idx" ON "TeamMember"("teamId");

-- CreateIndex
CREATE INDEX "TeamMember_userId_idx" ON "TeamMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_cohortId_userId_key" ON "TeamMember"("cohortId", "userId");

-- CreateIndex
CREATE INDEX "Business_schoolId_status_idx" ON "Business"("schoolId", "status");

-- CreateIndex
CREATE INDEX "Business_teamId_idx" ON "Business"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Business_id_schoolId_key" ON "Business"("id", "schoolId");

-- CreateIndex
-- One business per team for the MVP.
CREATE UNIQUE INDEX "Business_teamId_key" ON "Business"("teamId");

-- CreateIndex
CREATE INDEX "BusinessStatusEvent_schoolId_businessId_createdAt_idx" ON "BusinessStatusEvent"("schoolId", "businessId", "createdAt");

-- CreateIndex
CREATE INDEX "Product_schoolId_idx" ON "Product"("schoolId");

-- CreateIndex
CREATE INDEX "Product_businessId_idx" ON "Product"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_id_businessId_schoolId_key" ON "Product"("id", "businessId", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_businessId_name_key" ON "Product"("businessId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Product_businessId_sku_key" ON "Product"("businessId", "sku");

-- CreateIndex
CREATE INDEX "InventoryMovement_schoolId_businessId_createdAt_idx" ON "InventoryMovement"("schoolId", "businessId", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryMovement_productId_createdAt_idx" ON "InventoryMovement"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryMovement_createdById_idx" ON "InventoryMovement"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryMovement_id_businessId_schoolId_productId_key" ON "InventoryMovement"("id", "businessId", "schoolId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryMovement_reversalOfId_businessId_schoolId_productI_key" ON "InventoryMovement"("reversalOfId", "businessId", "schoolId", "productId");

-- CreateIndex
CREATE INDEX "InventoryBalance_schoolId_businessId_idx" ON "InventoryBalance"("schoolId", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryBalance_productId_businessId_schoolId_key" ON "InventoryBalance"("productId", "businessId", "schoolId");

-- CreateIndex
CREATE INDEX "Sale_schoolId_businessId_soldAt_idx" ON "Sale"("schoolId", "businessId", "soldAt");

-- CreateIndex
CREATE INDEX "Sale_soldById_idx" ON "Sale"("soldById");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_id_businessId_schoolId_key" ON "Sale"("id", "businessId", "schoolId");

-- CreateIndex
CREATE INDEX "SaleItem_saleId_idx" ON "SaleItem"("saleId");

-- CreateIndex
CREATE INDEX "SaleItem_productId_idx" ON "SaleItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "SaleItem_id_businessId_schoolId_productId_key" ON "SaleItem"("id", "businessId", "schoolId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "SaleItem_inventoryMovementId_businessId_schoolId_productId_key" ON "SaleItem"("inventoryMovementId", "businessId", "schoolId", "productId");

-- CreateIndex
CREATE INDEX "Expense_schoolId_businessId_incurredAt_idx" ON "Expense"("schoolId", "businessId", "incurredAt");

-- CreateIndex
CREATE INDEX "Expense_createdById_idx" ON "Expense"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_id_businessId_schoolId_key" ON "Expense"("id", "businessId", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_reversalOfId_businessId_schoolId_key" ON "Expense"("reversalOfId", "businessId", "schoolId");

-- CreateIndex
CREATE INDEX "AuditLog_schoolId_createdAt_idx" ON "AuditLog"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentInvitation" ADD CONSTRAINT "StudentInvitation_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentInvitation" ADD CONSTRAINT "StudentInvitation_createdById_schoolId_fkey" FOREIGN KEY ("createdById", "schoolId") REFERENCES "User"("id", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentInvitation" ADD CONSTRAINT "StudentInvitation_cohortId_schoolId_fkey" FOREIGN KEY ("cohortId", "schoolId") REFERENCES "Cohort"("id", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cohort" ADD CONSTRAINT "Cohort_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_cohortId_schoolId_fkey" FOREIGN KEY ("cohortId", "schoolId") REFERENCES "Cohort"("id", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_cohortId_schoolId_fkey" FOREIGN KEY ("cohortId", "schoolId") REFERENCES "Cohort"("id", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_cohortId_schoolId_fkey" FOREIGN KEY ("teamId", "cohortId", "schoolId") REFERENCES "Team"("id", "cohortId", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_schoolId_fkey" FOREIGN KEY ("userId", "schoolId") REFERENCES "User"("id", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Business" ADD CONSTRAINT "Business_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Business" ADD CONSTRAINT "Business_teamId_schoolId_fkey" FOREIGN KEY ("teamId", "schoolId") REFERENCES "Team"("id", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessStatusEvent" ADD CONSTRAINT "BusinessStatusEvent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessStatusEvent" ADD CONSTRAINT "BusinessStatusEvent_businessId_schoolId_fkey" FOREIGN KEY ("businessId", "schoolId") REFERENCES "Business"("id", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessStatusEvent" ADD CONSTRAINT "BusinessStatusEvent_createdById_schoolId_fkey" FOREIGN KEY ("createdById", "schoolId") REFERENCES "User"("id", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_businessId_schoolId_fkey" FOREIGN KEY ("businessId", "schoolId") REFERENCES "Business"("id", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_businessId_schoolId_fkey" FOREIGN KEY ("businessId", "schoolId") REFERENCES "Business"("id", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_productId_businessId_schoolId_fkey" FOREIGN KEY ("productId", "businessId", "schoolId") REFERENCES "Product"("id", "businessId", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_createdById_schoolId_fkey" FOREIGN KEY ("createdById", "schoolId") REFERENCES "User"("id", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_reversalOfId_businessId_schoolId_product_fkey" FOREIGN KEY ("reversalOfId", "businessId", "schoolId", "productId") REFERENCES "InventoryMovement"("id", "businessId", "schoolId", "productId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryBalance" ADD CONSTRAINT "InventoryBalance_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryBalance" ADD CONSTRAINT "InventoryBalance_businessId_schoolId_fkey" FOREIGN KEY ("businessId", "schoolId") REFERENCES "Business"("id", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryBalance" ADD CONSTRAINT "InventoryBalance_productId_businessId_schoolId_fkey" FOREIGN KEY ("productId", "businessId", "schoolId") REFERENCES "Product"("id", "businessId", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_businessId_schoolId_fkey" FOREIGN KEY ("businessId", "schoolId") REFERENCES "Business"("id", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_soldById_schoolId_fkey" FOREIGN KEY ("soldById", "schoolId") REFERENCES "User"("id", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_reversedById_schoolId_fkey" FOREIGN KEY ("reversedById", "schoolId") REFERENCES "User"("id", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_saleId_businessId_schoolId_fkey" FOREIGN KEY ("saleId", "businessId", "schoolId") REFERENCES "Sale"("id", "businessId", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_productId_businessId_schoolId_fkey" FOREIGN KEY ("productId", "businessId", "schoolId") REFERENCES "Product"("id", "businessId", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_inventoryMovementId_businessId_schoolId_productId_fkey" FOREIGN KEY ("inventoryMovementId", "businessId", "schoolId", "productId") REFERENCES "InventoryMovement"("id", "businessId", "schoolId", "productId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_businessId_schoolId_fkey" FOREIGN KEY ("businessId", "schoolId") REFERENCES "Business"("id", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_createdById_schoolId_fkey" FOREIGN KEY ("createdById", "schoolId") REFERENCES "User"("id", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_reversalOfId_businessId_schoolId_fkey" FOREIGN KEY ("reversalOfId", "businessId", "schoolId") REFERENCES "Expense"("id", "businessId", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_schoolId_fkey" FOREIGN KEY ("actorId", "schoolId") REFERENCES "User"("id", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =============================================================
-- CHECK CONSTRAINTS
-- Prisma cannot express CHECK constraints in schema.prisma, so
-- they are added here as raw SQL.  They enforce financial and
-- inventory invariants at the database level, acting as a last
-- line of defence against application bugs and direct-SQL writes.
--
-- Rounding policy (integer paise, moving weighted-average cost):
--   averageUnitCostPaise = FLOOR(inventoryValuePaise / quantityOnHand)
--   cogsPaise            = quantity * unitCostPaise  (snapshot at sale time)
--   revenuePaise         = quantity * unitSellingPricePaise
-- Integer truncation on the weighted-average means
--   inventoryValuePaise != quantityOnHand * averageUnitCostPaise
-- in general, so no exact-equality constraint is placed on
-- InventoryBalance.  The service layer reconciles the rounding
-- residual; the integration test asserts the final paise values.
-- PostgreSQL INTEGER division truncates toward zero; for non-negative
-- operands this equals FLOOR, so the division-equality CHECK is safe.
-- The arithmetic CHECKs on SaleItem use BIGINT casts to prevent
-- silent int32 overflow in the CHECK expression (column storage
-- remains INTEGER throughout).
--
-- Sale.totalPaise = SUM(SaleItem.revenuePaise) is a cross-row
-- invariant and cannot be expressed as a CHECK constraint.
-- It is enforced transactionally in the sale service and verified
-- by the financial acceptance test.
-- =============================================================

-- InventoryBalance: stock and value must never go negative;
-- average unit cost is non-negative.
-- Zero-state consistency: when no stock is held, both value and
-- average cost must be zero (a non-zero value with zero quantity
-- would be unrecoverable without a stock-in).
-- Rounding-policy enforcement: when stock is held, averageUnitCostPaise
-- must equal FLOOR(inventoryValuePaise / quantityOnHand).  PostgreSQL
-- INTEGER division truncates toward zero, which is identical to FLOOR
-- for non-negative operands.  The rounding residual is therefore always
-- in [0, quantityOnHand-1] paise and is preserved in inventoryValuePaise.
-- These constraints reference only same-row columns and are valid
-- single-row PostgreSQL CHECK expressions.
ALTER TABLE "InventoryBalance"
  ADD CONSTRAINT "InventoryBalance_quantityOnHand_non_negative"
    CHECK ("quantityOnHand" >= 0),
  ADD CONSTRAINT "InventoryBalance_inventoryValuePaise_non_negative"
    CHECK ("inventoryValuePaise" >= 0),
  ADD CONSTRAINT "InventoryBalance_averageUnitCostPaise_non_negative"
    CHECK ("averageUnitCostPaise" >= 0),
  ADD CONSTRAINT "InventoryBalance_zero_state_consistency"
    CHECK (
      "quantityOnHand" != 0
      OR ("inventoryValuePaise" = 0 AND "averageUnitCostPaise" = 0)
    ),
  ADD CONSTRAINT "InventoryBalance_average_cost_rounding_policy"
    CHECK (
      "quantityOnHand" = 0
      OR "averageUnitCostPaise" = "inventoryValuePaise" / NULLIF("quantityOnHand", 0)
    );

-- InventoryMovement: quantity must be positive (direction is typed,
-- not signed); unit cost must be non-negative.
ALTER TABLE "InventoryMovement"
  ADD CONSTRAINT "InventoryMovement_quantity_positive"
    CHECK ("quantity" > 0),
  ADD CONSTRAINT "InventoryMovement_unitCostPaise_non_negative"
    CHECK ("unitCostPaise" >= 0);

-- Sale: total revenue must be non-negative.
-- (The cross-row invariant totalPaise = SUM(item.revenuePaise) is
-- enforced by the sale service, not here.)
ALTER TABLE "Sale"
  ADD CONSTRAINT "Sale_totalPaise_non_negative"
    CHECK ("totalPaise" >= 0);

-- SaleItem: quantity and selling price must be positive.
-- revenuePaise and cogsPaise must equal their per-unit snapshots
-- multiplied by quantity.  These are single-row computed CHECK
-- constraints; they are intentionally exact because both inputs
-- are integer column values on the same row (no floating-point
-- rounding).  Prisma is unaware of these constraints; the service
-- layer must compute the values correctly before inserting.
-- BIGINT casts on the RHS operands prevent silent INTEGER overflow
-- in the CHECK expression itself when quantity * price exceeds the
-- int32 maximum (2,147,483,647).  The column storage remains INTEGER;
-- only the arithmetic in the CHECK is promoted to int8.  PostgreSQL
-- will also implicitly promote "revenuePaise" / "cogsPaise" (int4)
-- to BIGINT for the comparison.  If the computed product genuinely
-- exceeds int32, the column INSERT will fail with an overflow error
-- before the CHECK fires, which is the correct behaviour.
ALTER TABLE "SaleItem"
  ADD CONSTRAINT "SaleItem_quantity_positive"
    CHECK ("quantity" > 0),
  ADD CONSTRAINT "SaleItem_unitSellingPricePaise_positive"
    CHECK ("unitSellingPricePaise" > 0),
  ADD CONSTRAINT "SaleItem_unitCostPaise_non_negative"
    CHECK ("unitCostPaise" >= 0),
  ADD CONSTRAINT "SaleItem_revenuePaise_equals_qty_times_price"
    CHECK ("revenuePaise" = "quantity"::BIGINT * "unitSellingPricePaise"::BIGINT),
  ADD CONSTRAINT "SaleItem_cogsPaise_equals_qty_times_cost"
    CHECK ("cogsPaise" = "quantity"::BIGINT * "unitCostPaise"::BIGINT);

-- Expense: an expense of zero paise has no meaning.
ALTER TABLE "Expense"
  ADD CONSTRAINT "Expense_amountPaise_positive"
    CHECK ("amountPaise" > 0);
