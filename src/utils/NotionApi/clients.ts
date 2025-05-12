import type { LabelClient } from "@/types/LabelClient";
import type { BlockObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { getFolderId } from '../drive';
import { getCachedClients } from '../cache';
import { notion, cacheManager } from './api';


export async function getClientsFromNotion(): Promise<LabelClient[]> {
    const clientsBlockId = "1bcaab79f528805bb18cf74fb628292b";
    const response = await notion.blocks.children.list({
        block_id: clientsBlockId,
        page_size: 100,
    });

    const results = response.results as BlockObjectResponse[];

    const clients = await Promise.all(results.filter((result) => result.type === "child_page").map(async (result) => {
        const folderId = await getFolderId(`Clients/${result.child_page.title}`);
        return {
            id: result.id,
            name: result.child_page.title,
            folderId,
        };
    }));

    return clients;
}

export async function getClients(): Promise<LabelClient[]> {
    if (!cacheManager) {
        return getClientsFromNotion();
    }

    return await getCachedClients(
        cacheManager,
        getClientsFromNotion
    );
} 