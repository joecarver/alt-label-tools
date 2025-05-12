import { testFunction } from "../_shared/test-utils.ts"
import { serve } from "./index.ts"

Deno.test("sync-task-statuses", async () => {
    await testFunction("sync-task-statuses", () =>
        serve(new Request("http://localhost:54321/functions/v1/sync-task-statuses"))
    )
})