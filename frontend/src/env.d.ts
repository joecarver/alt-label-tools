/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly NODE_ENV: string;
  readonly PRODUCTION_URL: string;
  readonly GOOGLE_CLIENT_ID: string;
  readonly GOOGLE_CLIENT_SECRET: string;
  readonly SUPABASE_URL: string;
  readonly SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Declare global environment variables for Cloudflare Workers
declare global {
  const NODE_ENV: string;
  const PRODUCTION_URL: string;
  const GOOGLE_CLIENT_ID: string;
  const GOOGLE_CLIENT_SECRET: string;
  const N8N_WEBHOOK_URL: string;
  const N8N_API_KEY: string;
  const GOOGLE_SERVICE_ACCOUNT_EMAIL: string;
  const SUPABASE_URL: string;
  const SUPABASE_ANON_KEY: string;
  const ALT_LABEL_TOOLS_METADATA: KVNamespace;
}

// Add KVNamespace type if not already defined
interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number }
  ): Promise<void>;
  delete(key: string): Promise<void>;
}

// Extend Astro's Locals interface
declare namespace App {
  interface Locals {
    runtime?: {
      env?: {
        ALT_LABEL_TOOLS_METADATA?: KVNamespace;
      };
    };
  }
}
