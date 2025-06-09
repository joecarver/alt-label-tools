const FUNCTIONS = ["sync-task-statuses"];

async function callFunction(
  fnName: string,
  env: any
): Promise<{ ok: boolean; status: number; body: string }> {
  console.log("Environment variables available:", Object.keys(env));
  console.log("SUPABASE_PROJECT_REF value:", env.SUPABASE_PROJECT_REF);
  console.log("SUPABASE_ANON_KEY exists:", !!env.SUPABASE_ANON_KEY);

  if (!env.SUPABASE_PROJECT_REF || !env.SUPABASE_ANON_KEY) {
    throw new Error("Required environment variables are missing");
  }

  const url = `https://${env.SUPABASE_PROJECT_REF}.supabase.co/functions/v1/${fnName}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
  });

  const body = await res.text();
  const ok = res.status === 200;

  if (!ok) {
    console.error(
      `❌ Failed to sync ${fnName} (status ${res.status}): ${body}`
    );
  } else {
    console.log(`✅ Synced ${fnName} (status ${res.status})`);
  }

  return { ok, status: res.status, body };
}

export default {
  async scheduled(controller: any, env: any) {
    for (const fn of FUNCTIONS) {
      const { ok } = await callFunction(fn, env);
      if (!ok) return; // short-circuit on failure like in GitHub Actions
    }
  },
};
