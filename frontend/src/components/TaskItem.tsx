import { Text, Flex, Badge, Card } from "@radix-ui/themes";
import { ReleaseTaskName, type ReleaseTask } from "@/types/ReleaseTask";
import { CompletionStatus } from "@/types/CompletionStatus";
import { DueDateStatus } from "@/types/DueDateStatus";
import { formatDateRange } from "../utils/date";
import { ClockIcon, DotsHorizontalIcon, UploadIcon } from "@radix-ui/react-icons";

import { useState } from "react";
import styles from "./TaskItem.module.css";
import { TaskItemCompletionStatus } from "./TaskItemCompletionStatus";
import GoogleDriveUpload from "./GoogleDriveUpload";
import { getPermittedMimeTypesForTask } from "@/utils/getPermittedMimeTypesForTask";
import type { Release } from "@/types/Release";
import {
  getDueDateStatus,
  getDueDateStatusColor,
} from "@/utils/getDueDateStatus";
import { DownloadButton } from "./DownloadButton";
import { getDownloadFilename } from "@/utils/getDownloadFilename";
import { getIsUploadableTask } from "@/utils/getIsUploadableTask";
import { type ExpectedFile } from "@/utils/getExpectedFilesForTask";
import { TaskFilesList } from "./TaskFilesList";

interface Props {
  task: ReleaseTask;
  taskFolderIds: Record<string, string | null>;
  release: Release;
  isAdmin?: boolean;
  expectedFiles: ExpectedFile[];
}

export function TaskItem({
  task: initialTask,
  taskFolderIds,
  release,
  isAdmin = false,
  expectedFiles,
}: Props) {
  const [task, setTask] = useState(initialTask);
  const [isLoading, setIsLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isBandcampUploading, setIsBandcampUploading] = useState(false);

  // Helper values from release
  const premastersEmailsSent = release.premasterEmailsSent ?? false;
  const documentationFolderId = release.documentationFolderId ?? "";
  const masteringEngineerEmail = release.masteringEngineer?.email ?? "";
  const designerEmail = release.designer?.email ?? "";
  const licenseAllowPolitics = release.licenseAllowPolitics ?? false;
  const licenseAllowAlcohol = release.licenseAllowAlcohol ?? false;
  const licenseAllowPharmaceuticals =
    release.licenseAllowPharmaceuticals ?? false;
  const licenseAllowFastFood = release.licenseAllowFastfood ?? false;
  const licenseAllowFastFashion = release.licenseAllowFastfashion ?? false;

  const handleTaskCompletion = async () => {
    const taskId = task.id;
    const completedAt = task.completedAt;
    let newCompletedAt: string | undefined;

    if (completedAt) {
      newCompletedAt = undefined;
    } else {
      newCompletedAt = new Date().toISOString();
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append("taskId", taskId);
    formData.append("completedAt", newCompletedAt || "");
    formData.append("redirectTo", window.location.pathname);
    formData.append("dueDate", task.endDate || "");

    try {
      const response = await fetch("/api/update-task-completion", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to update task completion");
      }

      // Refresh the task data
      const updatedTaskResponse = await fetch(`/api/tasks/${taskId}`);
      const updatedTask = await updatedTaskResponse.json();
      setTask(updatedTask);

      document.body.dispatchEvent(
        new CustomEvent("taskCompletionUpdated", {
          detail: { releaseId: task.releaseId },
        })
      );
    } catch (error) {
      console.error("Failed to update task completion:", error);
      alert("Failed to update task completion. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearTaskStatus = async () => {
    if (!isAdmin) return;

    if (
      !confirm(
        "Are you sure you want to clear this task status? This will delete all files from Google Drive and reset the task completion status."
      )
    ) {
      return;
    }

    setIsClearing(true);
    try {
      const response = await fetch("/api/clear-task-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ taskId: task.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to clear task status");
      }

      const result = await response.json();

      // Refresh the task data
      const updatedTaskResponse = await fetch(`/api/tasks/${task.id}`);
      const updatedTask = await updatedTaskResponse.json();
      setTask(updatedTask);

      document.body.dispatchEvent(
        new CustomEvent("taskCompletionUpdated", {
          detail: { releaseId: task.releaseId },
        })
      );

      alert(
        `Task status cleared successfully. ${result.filesDeleted} files deleted.`
      );
    } catch (error) {
      console.error("Failed to clear task status:", error);
      alert(
        `Failed to clear task status: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsClearing(false);
    }
  };

  const handleUploadComplete = async () => {
    // Refresh the task data
    const updatedTaskResponse = await fetch(`/api/tasks/${task.id}`);
    const updatedTask = await updatedTaskResponse.json();
    setTask(updatedTask);

    if (
      task.name === ReleaseTaskName.PreMastersSubmitted &&
      !premastersEmailsSent
    ) {
      try {
        const response = await fetch("/api/handle-premaster-submission", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            releaseName: release.name,
            catalogNumber: release.catalogNumber,
            releaseDate: release.releaseDate,
            labelName: release.client.name,
            artists: release.artists,
            releaseId: task.releaseId,
            destFolderId: documentationFolderId,
            licenseAllowPolitics,
            licenseAllowAlcohol,
            licenseAllowPharmaceuticals,
            licenseAllowFastFood,
            licenseAllowFastFashion,
            masteringEngineerEmail,
            designerEmail,
          }),
        });
      } catch (error) {
        console.error("Failed to handle premaster submission:", error);
      }
    }

    if (task.name === ReleaseTaskName.MastersSubmitted) {
      try {
        const response = await fetch("/api/handle-master-submission", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            releaseName: release.name,
            catalogNumber: release.catalogNumber,
            artists: release.artists,
            releaseId: task.releaseId,
            labelName: release.client.name,
            clientId: release.client.id,
          }),
        });
      } catch (error) {
        console.error("Failed to handle master submission:", error);
      }
    }

    if (task.name === ReleaseTaskName.ArtworkCreation) {
      try {
        const response = await fetch("/api/handle-artwork-submission", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            releaseName: release.name,
            catalogNumber: release.catalogNumber,
            artists: release.artists,
            releaseId: task.releaseId,
            labelName: release.client.name,
            clientId: release.client.id,
          }),
        });
      } catch (error) {
        console.error("Failed to handle artwork submission:", error);
      }
    }

    document.body.dispatchEvent(
      new CustomEvent("taskCompletionUpdated", {
        detail: { releaseId: task.releaseId },
      })
    );
  };

  const handleBandcampUpload = async () => {
    if (!isAdmin) return;

    if (
      !confirm(
        "This will upload the release to Bandcamp as a draft. Continue?"
      )
    ) {
      return;
    }

    setIsBandcampUploading(true);
    try {
      const response = await fetch("/api/trigger-bandcamp-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          releaseId: task.releaseId,
          taskId: task.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to trigger Bandcamp upload"
        );
      }

      const result = await response.json();
      alert(result.message);
    } catch (error) {
      console.error("Failed to trigger Bandcamp upload:", error);
      alert(
        `Failed to trigger Bandcamp upload: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsBandcampUploading(false);
    }
  };

  const isCompleted =
    task.completionStatus === CompletionStatus.DONE_DETECTED ||
    task.completionStatus === CompletionStatus.DONE_MANUALLY;

  const completionDate =
    task.completionStatus === CompletionStatus.DONE_DETECTED
      ? task.taskFiles?.[0]?.createdAt ?? null
      : task.completionStatus === CompletionStatus.DONE_MANUALLY
      ? task.completedAt
      : null;

  const dueDateStatus = getDueDateStatus(task.endDate, isCompleted);
  const isOverdue = dueDateStatus === DueDateStatus.OVERDUE;

  const taskClass = isCompleted
    ? styles.taskItemCompleted
    : isOverdue
    ? styles.taskItemOverdue
    : styles.taskItemNotCompleted;

  const folderId = taskFolderIds[task.name];

  const isUploadable = getIsUploadableTask(
    task.name,
    isAdmin,
    release.userReleasePermissions?.map((permission) => permission.role) ?? []
  );

  const isDownloadable =
    task.isDetectable &&
    task.taskFiles &&
    task.taskFiles.length > 0 &&
    folderId;

  return (
    <Card className={`${styles.taskItem} ${taskClass}`}>
      <Flex direction="column" gap="1">
        <Flex gap="2" align="center" justify="between">
          <Text weight="medium">{task.name}</Text>
          <Flex gap="2" align="center">
            {folderId && isUploadable && (
              <GoogleDriveUpload
                parentId={folderId}
                taskId={task.id}
                taskName={task.name}
                onUploadComplete={handleUploadComplete}
                permittedMimeTypes={getPermittedMimeTypesForTask(task)}
                multiple={true}
                existingFiles={task.taskFiles}
              />
            )}
            {isDownloadable && folderId && (
              <DownloadButton
                folderId={folderId}
                fileName={getDownloadFilename(release, task.name)}
                text="Download"
              />
            )}
            {isAdmin &&
              task.name === ReleaseTaskName.UploadToBandcamp &&
              !isCompleted && (
                <button
                  onClick={handleBandcampUpload}
                  disabled={isBandcampUploading}
                  className={styles.bandcampUploadButton}
                >
                  <UploadIcon />
                  {isBandcampUploading
                    ? "Uploading..."
                    : "Upload to Bandcamp"}
                </button>
              )}
            {isAdmin && (
              <details className={styles.adminDropdown}>
                <summary className={styles.adminDropdownTrigger}>
                  <DotsHorizontalIcon />
                </summary>
                <div className={styles.adminDropdownContent}>
                  <button
                    onClick={handleClearTaskStatus}
                    disabled={isClearing}
                    className={styles.clearTaskButton}
                  >
                    {isClearing ? "Clearing..." : "Clear Task Status"}
                  </button>
                </div>
              </details>
            )}
          </Flex>
        </Flex>
        <Flex gap="1" wrap="wrap">
          <Badge
            size="2"
            color={getDueDateStatusColor(dueDateStatus)}
            variant="soft"
          >
            <ClockIcon />
            Due: {formatDateRange(task.startDate || "", task.endDate || "")}
          </Badge>
          <TaskItemCompletionStatus
            isDetectable={task.isDetectable ?? false}
            completionStatus={task.completionStatus as CompletionStatus}
            completedAt={completionDate}
            isLoading={isLoading}
            onToggle={handleTaskCompletion}
          />
        </Flex>
        <TaskFilesList task={task} expectedFiles={expectedFiles} />
      </Flex>
    </Card>
  );
}
