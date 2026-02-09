import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    SERVER_URL: z.string().url().optional(),
    RESEND_API_KEY: z.string().optional(),
    FROM_EMAIL: z.string().optional(),
    REPLY_TO_EMAIL: z.string().optional(),
    MXROUTE_EMAIL_DOMAIN: z.string().optional(),
    MXROUTE_EMAIL_OUTBOUND_LIMIT: z.string().optional(),
    MXROUTE_EMAIL_QUOTA: z.string().optional(),
    MXROUTE_LOGIN_KEY: z.string().optional(),
    MXROUTE_SERVER_LOGIN: z.string().optional(),
    MXROUTE_SERVER_URL: z.string().optional(),
    OPENROUTER_API_KEY: z.string().optional(),
  },

  clientPrefix: "VITE_",

  client: {
    VITE_APP_TITLE: z.string().min(1).optional(),
    VITE_CONVEX_URL: z.string().url().optional(),
    VITE_LOGTO_ENDPOINT: z.string().url().optional(),
    VITE_LOGTO_APP_ID: z.string().optional(),
    VITE_LOGTO_REDIRECT_URI: z.string().url().optional(),
    VITE_LOGTO_SCOPES: z.string().optional(),
  },

  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
});
