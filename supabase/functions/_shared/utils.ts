import "https://deno.land/std@0.204.0/dotenv/load.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import type { Database } from "@/types/supabase.ts";

export const supabase = createClient<Database>(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

export function handleError(error: unknown) {
  return new Response(
    JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error occurred",
      timestamp: new Date().toISOString(),
    }),
    {
      status: 500,
      headers: { "Content-Type": "application/json" },
    }
  );
}

export function successResponse(data: unknown) {
  return new Response(
    JSON.stringify({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
}
