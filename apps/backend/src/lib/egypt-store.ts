// How the store is set up, decided by the owner on 2026-10-09: Egypt only, EGP
// only, one warehouse in Cairo, and one flat delivery fee for the whole country
// until Bosta prices delivery by zone. src/scripts/setup-egypt-store.ts applies
// it; changing a value here and re-running that script does not update records
// it already created (change those in the admin).
export const EGYPT_STORE = {
  currencyCode: "egp",
  countryCode: "eg",
  regionName: "Egypt",
  // No payment provider is decided yet (Paymob is blocked); production checkout
  // stays disabled in src/api/middlewares.ts until it is.
  paymentProviders: ["pp_system_default"],
  taxProvider: "tp_system",
  // Prices are entered and shown including tax, so customers pay exactly the
  // shelf price. The VAT rate is not decided yet (the tax region has none, so
  // tax is 0%); setting it later splits tax out of the same prices instead of
  // raising them.
  pricesIncludeTax: true,
  warehouse: {
    name: "Cairo Warehouse",
    address: { address_1: "Cairo", city: "Cairo", country_code: "EG" },
  },
  fulfillmentProvider: "manual_manual",
  fulfillmentSetName: "Cairo Warehouse delivery",
  serviceZoneName: "Egypt",
  shippingOption: {
    name: "Standard Delivery",
    // EGP, in major units as Medusa stores prices (70 = 70 pounds).
    amount: 70,
    type: { label: "Standard", description: "Delivery anywhere in Egypt.", code: "standard" },
  },
  publishableKeyTitle: "Vi2 Storefront",
} as const

// What Medusa's starter seed created. Only src/scripts/remove-demo-data.ts
// removes these, and only by these exact names.
export const STARTER_DEMO_DATA = {
  regionNames: ["Europe"],
  taxCountryCodes: ["gb", "de", "dk", "se", "fr", "es", "it"],
  stockLocationNames: ["European Warehouse"],
  categoryNames: ["Shirts", "Sweatshirts", "Pants", "Merch"],
  productHandles: ["t-shirt", "sweatshirt", "sweatpants", "shorts"],
} as const
