import type { Release } from "./Release";
import type { ReleaseTaskStatus } from "./ReleaseTaskStatus";

export enum ReleaseTaskName {
    ContractCreated = "Contract Created",
    PreMastersSubmitted = "Pre Masters Submitted",
    MasteringSubmitted = "Mastering Submitted",
    ArtworkCreation = "Artwork Creation",
    PressRelease = "Press Release",
    MixingAndMastering = "Mixing and Mastering",
    MarketingDriver = "Marketing Driver",
    SendToRubadub = "Send to Rubadub",
    PressAndPressRelease = "Press and Press Release",
    PitchToAppleMusic = "Pitch to Apple",
    Release = "Release",
    UpdateScentric = "Update Scentric",
}

export type DetectableReleaseTask = Extract<ReleaseTaskName, ReleaseTaskName.ContractCreated | ReleaseTaskName.PreMastersSubmitted | ReleaseTaskName.MasteringSubmitted | ReleaseTaskName.ArtworkCreation>;

export interface ReleaseTask {
    id: string;
    name: ReleaseTaskName;
    status: ReleaseTaskStatus;
    releaseId: Release["id"];
    startDate: string;
    endDate: string;
}

/*
- Release scheduled - Google form submitted / Data in Notion
- Contract Created - File in Folder 
- Pre Masters Submitted - File in Folder
- Mastering Submitted - File in Folder
- Artwork Creation - File in Folder
*/



