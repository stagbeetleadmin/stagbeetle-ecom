// =========================================================================
// SKU ↔ GALLA BARCODE
//
// Each size of a product is its own variant with its own SKU:
// STYLE-COLOUR-SIZE, e.g. "WINGS-F.S-XXL". That SKU is the same string as
// the ITEM NAME in Galla's Item Manager.
//
// Galla's order webhook doesn't match on the item name though — it matches
// on the BARCODE / EAN CODE column, which (confirmed from their Item Manager,
// 2026-10-06) is the item name with the hyphens dropped and everything else,
// dots included, kept as-is:
//
//   WINGS-F.S-XXL → WINGSF.SXXL
//   FETHR-F.S-M   → FETHRF.SM
//
// So the barcode is derived, not typed. It's stored per variant (in
// product_variants.galla_sku) only so an admin can override one size whose
// Galla barcode doesn't follow the rule.
// =========================================================================

export const variantSkuFor = (productSku: string, size: string) =>
  `${productSku.trim().toUpperCase()}-${size.trim().toUpperCase()}`;

export const gallaBarcodeFor = (variantSku: string) =>
  variantSku.trim().toUpperCase().replace(/-/g, '');

// True when a stored barcode is still whatever the system filled in for
// this SKU (the current rule, or the pre-2026-10-06 rule that sent the SKU
// itself) — i.e. nobody overrode it by hand, so it's safe to re-derive.
export const isAutoBarcode = (stored: string | null | undefined, variantSku: string) =>
  !stored || stored === variantSku || stored === gallaBarcodeFor(variantSku);
