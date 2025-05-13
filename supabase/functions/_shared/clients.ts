import type { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { getFolderId } from "./drive.ts";

export interface LabelClient {
    id: string;
    name: string;
    folderId: string;
}

console.log("test change 3");

export async function getClientsFromNotion(): Promise<LabelClient[]> {
    const clientsBlockId = "1bcaab79f528805bb18cf74fb628292b";
    
    const notionApiKey = Deno.env.get('NOTION_API_KEY')
    if (!notionApiKey) {
        throw new Error('NOTION_API_KEY environment variable is not set')
    }
    
    try {
        const response = await fetch(
            `https://api.notion.com/v1/blocks/${clientsBlockId}/children?page_size=100`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${notionApiKey}`,
                    'Notion-Version': '2022-06-28',
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Notion API error: ${response.status} ${errorText}`)
        }

        const data = await response.json()
        const results = data.results as BlockObjectResponse[];

        const clients = await Promise.all(
            results
                .filter((result) => result.type === "child_page")
                .map(async (result) => {
                    const folderId = await getFolderId(`Clients/${result.child_page.title}`);
                    return {
                        id: result.id,
                        name: result.child_page.title,
                        folderId: folderId ?? "",
                    };
                })
        );

        return clients;
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('Unknown error occurred');
    }
}