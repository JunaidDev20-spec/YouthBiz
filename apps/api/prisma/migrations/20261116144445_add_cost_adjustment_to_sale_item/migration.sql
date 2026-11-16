-- AlterTable
ALTER TABLE "SaleItem" ADD COLUMN     "costAdjustmentPaise" INTEGER NOT NULL DEFAULT 0;

-- Drop the old COGS CHECK that did not account for the rounding residual
-- absorbed when a sale exhausts all remaining stock.
ALTER TABLE "SaleItem" DROP CONSTRAINT "SaleItem_cogsPaise_equals_qty_times_cost";

-- New COGS CHECK: cogsPaise = quantity * unitCostPaise + costAdjustmentPaise
-- The costAdjustmentPaise is non-negative and absorbs the floor-rounding
-- residual when the sale that exhausts stock is recorded.
ALTER TABLE "SaleItem"
  ADD CONSTRAINT "SaleItem_cogsPaise_equals_qty_times_cost_plus_adjustment"
    CHECK ("cogsPaise" = "quantity"::BIGINT * "unitCostPaise"::BIGINT + "costAdjustmentPaise"::BIGINT);

-- The adjustment is always non-negative under the floor-rounding policy.
ALTER TABLE "SaleItem"
  ADD CONSTRAINT "SaleItem_costAdjustmentPaise_non_negative"
    CHECK ("costAdjustmentPaise" >= 0);
