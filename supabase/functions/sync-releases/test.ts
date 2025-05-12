import { testFunction } from "../_shared/test-utils.ts"
import { serve } from "./index.ts"

Deno.test("sync-releases", async () => {
    await testFunction("sync-releases", () =>
        serve(new Request("http://localhost:54321/functions/v1/sync-releases"))
    )
})