import { testFunction } from "../_shared/test-utils.ts"
import { serve } from "./index.ts"

Deno.test("sync-clients", async () => {
    await testFunction("sync-clients", () =>
        serve(new Request("http://localhost:54321/functions/v1/sync-clients"))
    )
})