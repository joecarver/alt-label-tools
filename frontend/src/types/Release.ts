import type { LabelClient } from "./LabelClient";
import type { CompletionStatus } from "./CompletionStatus";
import type { ReleaseTask } from "./ReleaseTask";

// Data source: Notion API
export interface Release {
    id: string;
    name: string;
    catalogNumber: string;
    artist: string;
    labelId: LabelClient["id"];
    notionUrl: string;
    folderId: string | null;
}