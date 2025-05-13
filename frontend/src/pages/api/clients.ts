import { getClients } from "frontend/src/utils/NotionApi/api";

export async function GET() {
    const clients = await getClients();
    return new Response(JSON.stringify(clients));
}
