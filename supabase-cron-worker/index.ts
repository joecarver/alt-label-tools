const FUNCTIONS = [
    "sync-clients",
    "sync-releases",
    "sync-tasks",
    "sync-task-statuses",
    "monitor-sync-health"
  ];
  
  type SupabaseResponse = {
    data?: Record<string, any>;
    error?: any;
  };
  
  async function callFunction(fnName: string, env: Env): Promise<{ ok: boolean; status: number; body: string }> {
    const url = `https://${env.SUPABASE_PROJECT_REF}.supabase.co/functions/v1/${fnName}`;
  
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json"
      }
    });
  
    const body = await res.text();
    const ok = res.status === 200;
  
    if (!ok) {
      console.error(`❌ Failed to sync ${fnName} (status ${res.status}): ${body}`);
    } else {
      console.log(`✅ Synced ${fnName} (status ${res.status})`);
    }
  
    return { ok, status: res.status, body };
  }
  
  export default {
    async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
      for (const fn of FUNCTIONS.slice(0, 4)) {
        const { ok } = await callFunction(fn, env);
        if (!ok) return; // short-circuit on failure like in GitHub Actions
      }
  
      // Run monitor-sync-health and validate response
      const { ok, body } = await callFunction("monitor-sync-health", env);
      if (!ok) return;
  
      try {
        const parsed: SupabaseResponse = JSON.parse(body);
        const unhealthySyncs = parsed?.data?.unhealthySyncs ?? [];
  
        if (unhealthySyncs.length > 0) {
          console.error(`❌ Found ${unhealthySyncs.length} unhealthy syncs`, unhealthySyncs);
          return;
        }
  
        console.log("✅ Sync health OK");
      } catch (err) {
        console.error("❌ Failed to parse monitor-sync-health response", err, body);
      }
    }
  };
  