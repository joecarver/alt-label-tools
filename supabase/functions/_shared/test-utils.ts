// supabase/functions/_shared/test-utils.ts
import { assertEquals } from "https://deno.land/std@0.208.0/testing/asserts.ts"
import { supabase } from "./utils";


export async function testFunction(
    name: string,
    fn: () => Promise<Response>
) {
    console.log(`\n🧪 Testing ${name}...`)

    try {
        const response = await fn()
        const data = await response.json()

        console.log('Response:', data)
        assertEquals(response.status, 200, 'Function should return 200 status')
        assertEquals(data.success, true, 'Function should return success: true')

        // Verify sync execution was recorded
        const { data: executions } = await supabase
            .from('sync_executions')
            .select('*')
            .eq('function_name', name)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        assertEquals(executions?.status, 'success', 'Sync execution should be recorded as success')

        console.log('✅ Test passed!')
        return data
    } catch (error) {
        console.error('❌ Test failed:', error)
        throw error
    }
}