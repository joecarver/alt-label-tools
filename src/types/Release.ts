import type { LabelClient } from "./LabelClient";
import type { ReleaseStatus } from "./ReleaseStatus";
import type { ReleaseTask } from "./ReleaseTask";

// Data source: Notion API
export interface Release {
    id: string;
    name: string;
    catalogNumber: string;
    artist: string;
    tasks: ReleaseTask[];
    status?: ReleaseStatus;
    labelId: LabelClient["id"];
    notionUrl: string;
    releaseDate: string;
}