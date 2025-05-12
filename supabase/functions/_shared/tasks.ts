
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { notion } from "./notion.ts";
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
    const databaseResponse = await notion.databases.query({
        database_id: releaseId,
    });

    const databaseResults = databaseResponse.results as PageObjectResponse[];

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