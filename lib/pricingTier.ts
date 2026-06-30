export type PricingTier = "public" | "contract";

let activePricingTier: PricingTier = "public";

export const PRICING_TIER_LABELS: Record<PricingTier, string> = {
  public: "공개가 (고객 견적)",
  contract: "계약가 (공급·원가)",
};

export function getActivePricingTier(): PricingTier {
  return activePricingTier;
}

export function setActivePricingTier(tier: PricingTier) {
  activePricingTier = tier;
  return activePricingTier;
}
