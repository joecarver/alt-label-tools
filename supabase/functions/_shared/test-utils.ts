import { assertEquals } from "https://deno.land/std@0.208.0/testing/asserts.ts";

export async function testFunction(name: string, fn: () => Promise<Response>) {
  console.log(`\n🧪 Testing ${name}...`);

  try {
    const response = await fn();
    const data = await response.json();

    console.log("Response:", data);
    assertEquals(response.status, 200, "Function should return 200 status");
    assertEquals(data.success, true, "Function should return success: true");

    console.log("✅ Test passed!");
    return data;
  } catch (error) {
    console.error("❌ Test failed:", error);
    throw error;
  }
}
