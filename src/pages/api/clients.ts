import { getClients } from "@/utils/NotionApi";

export async function GET() {
    const clients = await getClients();
    return new Response(JSON.stringify(clients));
}
