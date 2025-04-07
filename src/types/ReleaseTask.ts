import type { Release } from "./Release";
import type { ReleaseTaskStatus } from "./ReleaseTaskStatus";

export interface ReleaseTask {
    id: string;
    name: string;
    status: ReleaseTaskStatus;
    releaseId: Release["id"];
    startDate: string;
    endDate: string;
}