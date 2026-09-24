# Vi2 Arabic website

The Arabic website localization is complete across the storefront, search, cart, checkout, order confirmation, account, authentication, brands, best sellers, and deals pages. Use the existing **EN / AR** switch in the header to change languages. Arabic uses RTL layout; product names, brand names, prices, routes, and internal values intentionally remain unchanged.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production check

```bash
npm run build
npm start
```

The account, checkout, and order flow remain local demo behavior. No production backend or live payment integration has been added.
