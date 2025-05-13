import type { Release } from "./Release";
import type { CompletionStatus } from "./CompletionStatus";
import type { TaskStatus } from "./TaskCompletionStatus";
import type { DueDateStatus } from "./DueDateStatus";

export enum ReleaseTaskName {
    ReleaseDate = "Release Date",
    ContractCreated = "Contract Created",
    PreMastersSubmitted = "Pre Master Due",
    MastersSubmitted = "Mixing and Mastering",
    ArtworkCreation = "Artwork Creation",
    PressRelease = "Press Release",
    MarketingDriver = "Marketing Driver",
    SendToRubadub = "Send to Rubadub",
    PressAndPressRelease = "Press and Press Release",
    PitchToAppleMusic = "Pitch to Apple",
    Release = "Release",
    UpdateScentric = "Update Scentric",
}

export type DetectableReleaseTask = Extract<ReleaseTaskName, ReleaseTaskName.ContractCreated | ReleaseTaskName.PreMastersSubmitted | ReleaseTaskName.MastersSubmitted | ReleaseTaskName.ArtworkCreation>;

export interface ReleaseTask {
    id: string;
    name: ReleaseTaskName;
    releaseId: string | null;
    startDate: string;
    endDate: string;
    completedAt: string | null;
    taskStatus: TaskStatus;
    isDetectable: boolean;
}