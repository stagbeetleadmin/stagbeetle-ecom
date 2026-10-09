// The stock-validation rules shown on /admin/inventory-sync?tab=validation.
// Kept apart from gallaStockPull.ts (server code) so the admin page can import
// the labels without bundling the Galla client into the browser.

export type CheckResult = 'pass' | 'fail' | 'warn' | 'na';

export const VALIDATION_CHECKS = [
  { key: 'has_variant', label: 'Size record', fail: 'Offered on the product page but has no size record — invisible to Galla sync and sells as unlimited. Use Set stock to create it.' },
  { key: 'offered', label: 'Offered', fail: 'Size record exists but the product no longer offers this size — harmless leftover.' },
  { key: 'has_barcode', label: 'Barcode set', fail: 'No Galla barcode — this size can never sync.' },
  { key: 'barcode_rule', label: 'Barcode rule', fail: 'Barcode differs from the usual rule (SKU without hyphens). Fine if Galla really uses it.' },
  { key: 'barcode_unique', label: 'Unique', fail: 'Another size uses the same barcode — both would get the same stock.' },
  { key: 'in_galla', label: 'In Galla', fail: 'Galla has no item with this barcode at our location.' },
  { key: 'tracked', label: 'Stock tracked', fail: 'No stock count on the site — sells as unlimited.' },
  { key: 'qty_match', label: 'Count = Galla', fail: 'Site count differs from Galla — Sync now fixes it.' },
  { key: 'no_errors', label: 'No sync errors', fail: 'Sync errors for this size in the last 7 days — open its logs.' },
] as const;

export type ValidationCheckKey = typeof VALIDATION_CHECKS[number]['key'];
