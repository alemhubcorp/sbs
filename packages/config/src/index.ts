import { z } from 'zod';

const runtimeConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().default('postgresql://ruflo:change-me@localhost:5432/ruflo?schema=public'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z.coerce.number().default(9000),
  MEILI_HOST: z.string().default('http://localhost:7700'),
  KEYCLOAK_REALM: z.string().default('ruflo'),
  KEYCLOAK_HOST: z.string().default('localhost'),
  KEYCLOAK_PORT: z.coerce.number().default(8080),
  KEYCLOAK_AUDIENCE: z.string().optional(),
  KEYCLOAK_ISSUER: z.string().optional(),
  KEYCLOAK_INTERNAL_URL: z.string().default('http://localhost:8080/auth'),
  KEYCLOAK_PUBLIC_URL: z.string().default('http://localhost:8080/auth'),
  KEYCLOAK_ADMIN_CLIENT_ID: z.string().default('ruflo-admin-ui'),
  KEYCLOAK_ADMIN_CLIENT_SECRET: z.string().default('change-me-admin-client'),
  KEYCLOAK_WEB_CLIENT_ID: z.string().default('ruflo-web-ui'),
  KEYCLOAK_WEB_CLIENT_SECRET: z.string().default('change-me-web-client'),
  KEYCLOAK_ADMIN_USER: z.string().default('admin'),
  KEYCLOAK_ADMIN_PASSWORD: z.string().default('change-me'),
  APP_URL: z.string().default('http://localhost:3001'),
  WEB_URL: z.string().default('http://localhost:3001'),
  API_URL: z.string().default('http://localhost:3000/api'),
  ADMIN_URL: z.string().default('http://localhost:3002/admin'),
  ADMIN_APP_URL: z.string().default('http://localhost:3002'),
  WEB_APP_URL: z.string().default('http://localhost:3001'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().default('http://localhost:4318'),
  AIRWALLEX_API_KEY: z.string().optional(),
  AIRWALLEX_CLIENT_ID: z.string().optional(),
  AIRWALLEX_CLIENT_SECRET: z.string().optional(),
  AIRWALLEX_WEBHOOK_SECRET: z.string().optional(),
  AIRWALLEX_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
  PAYMENT_DEFAULT_PROVIDER: z.enum(['internal_manual', 'airwallex', 'none']).default('internal_manual')
});

export function loadRuntimeConfig() {
  const parsed = runtimeConfigSchema.parse(process.env);

  return {
    app: {
      env: parsed.NODE_ENV,
      port: parsed.API_PORT
    },
    database: {
      url: parsed.DATABASE_URL
    },
    redis: {
      url: parsed.REDIS_URL
    },
    storage: {
      endpoint: parsed.MINIO_ENDPOINT,
      port: parsed.MINIO_PORT,
      url: `http://${parsed.MINIO_ENDPOINT}:${parsed.MINIO_PORT}`
    },
    search: {
      url: parsed.MEILI_HOST
    },
    auth: {
      keycloakHost: parsed.KEYCLOAK_HOST,
      keycloakPort: parsed.KEYCLOAK_PORT,
      realm: parsed.KEYCLOAK_REALM,
      audience: parsed.KEYCLOAK_AUDIENCE,
      issuer: parsed.KEYCLOAK_ISSUER,
      internalUrl: parsed.KEYCLOAK_INTERNAL_URL,
      publicUrl: parsed.KEYCLOAK_PUBLIC_URL,
      adminClientId: parsed.KEYCLOAK_ADMIN_CLIENT_ID,
      adminClientSecret: parsed.KEYCLOAK_ADMIN_CLIENT_SECRET,
      webClientId: parsed.KEYCLOAK_WEB_CLIENT_ID,
      webClientSecret: parsed.KEYCLOAK_WEB_CLIENT_SECRET,
      adminUser: parsed.KEYCLOAK_ADMIN_USER,
      adminPassword: parsed.KEYCLOAK_ADMIN_PASSWORD,
      appUrl: parsed.APP_URL,
      webUrl: parsed.WEB_URL,
      apiUrl: parsed.API_URL,
      adminUrl: parsed.ADMIN_URL,
      adminAppUrl: parsed.ADMIN_URL || parsed.ADMIN_APP_URL,
      webAppUrl: parsed.WEB_URL || parsed.WEB_APP_URL
    },
    observability: {
      otlpEndpoint: parsed.OTEL_EXPORTER_OTLP_ENDPOINT
    },
    payments: {
      defaultProvider: parsed.PAYMENT_DEFAULT_PROVIDER,
      airwallex: {
        apiKey: parsed.AIRWALLEX_API_KEY,
        clientId: parsed.AIRWALLEX_CLIENT_ID,
        clientSecret: parsed.AIRWALLEX_CLIENT_SECRET,
        webhookSecret: parsed.AIRWALLEX_WEBHOOK_SECRET,
        env: parsed.AIRWALLEX_ENV
      }
    }
  };
}
