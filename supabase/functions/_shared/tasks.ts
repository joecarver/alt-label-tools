import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { ReleaseTaskName } from "../../types/ReleaseTask.ts";

export interface ReleaseTask {
    id: string;
    releaseId: string;
    name: ReleaseTaskName;
    startDate: string | undefined;
    endDate: string | undefined;
    completedAt: string | undefined;
    isDetectable: boolean;
}

function isDetectableTask(taskName: ReleaseTaskName): boolean {
    return [ReleaseTaskName.MastersSubmitted, ReleaseTaskName.ArtworkCreation, ReleaseTaskName.PreMastersSubmitted, ReleaseTaskName.ContractCreated].includes(taskName);
}

export async function getTasksFromNotion(
    releaseId: string,
    catalogNumber: string
): Promise<ReleaseTask[]> {
    const notionApiKey = Deno.env.get('NOTION_API_KEY')
    if (!notionApiKey) {
        throw new Error('NOTION_API_KEY environment variable is not set')
    }

    const response = await fetch(
        `https://api.notion.com/v1/databases/${releaseId}/query`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${notionApiKey}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                page_size: 100
            })
        }
    );

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Notion API error: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    const databaseResults = data.results as PageObjectResponse[];

    const tasks = await Promise.all(
        databaseResults.map((result) =>
            convertNotionTaskToReleaseTask(result, catalogNumber)
        )
    ).then((tasks) => tasks.filter((task) => !!task.name));

    return tasks;
}

function convertNotionTaskToReleaseTask(
    result: PageObjectResponse,
    catalogNumber: string
): ReleaseTask {
    const nameProperty = result.properties.Name;
    const dateProperty = result.properties.Date;
    const completedAtProperty = result.properties.completedAt;

    const title =
        nameProperty?.type === "title"
            ? nameProperty.title[0]?.plain_text || ""
            : "";
    const date = dateProperty?.type === "date" ? dateProperty.date : null;
    const completedAt =
        completedAtProperty?.type === "date"
            ? completedAtProperty.date?.start
            : null;

    const taskTitle = title.split(" - ")[2];
    const taskName = taskTitle as ReleaseTaskName;
    const isDetectable = isDetectableTask(taskName);

    return {
        id: result.id,
        releaseId: catalogNumber,
        name: taskName,
        startDate: date?.start || undefined,
        endDate: date?.end || date?.start || undefined,
        completedAt: completedAt || undefined,
        isDetectable,
    };
} 