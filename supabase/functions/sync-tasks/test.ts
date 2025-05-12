import { testFunction } from "../_shared/test-utils.ts"
import { serve } from "./index.ts"

Deno.test("sync-tasks", async () => {
    await testFunction("sync-tasks", () =>
        serve(new Request("http://localhost:54321/functions/v1/sync-tasks"))
    )
})