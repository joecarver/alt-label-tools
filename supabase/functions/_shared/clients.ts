import type { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { getFolderId } from "./drive.ts";
import { notion } from "./utils.ts";

export interface LabelClient {
    id: string;
    name: string;
    folderId: string;
}

export async function getClientsFromNotion(): Promise<LabelClient[]> {
    const clientsBlockId = "1bcaab79f528805bb18cf74fb628292b";
    const response = await notion.blocks.children.list({
        block_id: clientsBlockId,
        page_size: 100,
    });

    const results = response.results as BlockObjectResponse[];

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
}