import { configuredSecret } from "./src/lib/secrets"
import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  featureFlags: { rbac: true },
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: configuredSecret("JWT_SECRET"),
      cookieSecret: configuredSecret("COOKIE_SECRET"),
      // Medusa JWT cryptographic expiration (format: e.g. "86400s", "1d")
      jwtExpiresIn: process.env.JWT_ACCESS_TOKEN_TTL
        ? `${process.env.JWT_ACCESS_TOKEN_TTL}s`
        : '1d',
    }
  },
  modules: [
    {
      resolve: "./src/modules/brand",
    },
  ],
})
