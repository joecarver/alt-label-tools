import { getClients } from "@/utils/NotionApi";

export async function GET() {
    const clients = await getClients(import.meta.env.NOTION_API_KEY);
    return new Response(JSON.stringify(clients));
}
