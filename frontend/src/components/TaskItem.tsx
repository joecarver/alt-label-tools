import { Text, Flex, Badge, Card } from "@radix-ui/themes";
import { ReleaseTaskName, type ReleaseTask } from "@/types/ReleaseTask";
import { CompletionStatus } from "@/types/CompletionStatus";
import { DueDateStatus } from "@/types/DueDateStatus";
import { formatDateRange } from "../utils/date";
import { ClockIcon } from "@radix-ui/react-icons";

import { getDueDateStatusColor } from "../utils/getStatusColor";
import { DriveLinkButton } from "./DriveLinkButton";
import { useState } from "react";
import styles from "./TaskItem.module.css";
import { TaskItemCompletionStatus } from "./TaskItemCompletionStatus";
import GoogleDriveUpload from "./GoogleDriveUpload";
import { getPermittedMimeTypesForTask } from "@/utils/getPermittedMimeTypesForTask";
import type { Release } from "@/types/Release";

interface Props {
  task: ReleaseTask;
  taskFolderIds: Record<string, string | null>;
  release: Release;
}

export function TaskItem({ task: initialTask, taskFolderIds, release }: Props) {
  const [task, setTask] = useState(initialTask);
  const [isLoading, setIsLoading] = useState(false);

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

    document.body.dispatchEvent(
      new CustomEvent("taskCompletionUpdated", {
        detail: { releaseId: task.releaseId },
      })
    );
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

  const isOverdue =
    task.dueDateStatus === DueDateStatus.OVERDUE && !isCompleted;

  const taskClass = isCompleted
    ? styles.taskItemCompleted
    : isOverdue
    ? styles.taskItemOverdue
    : styles.taskItemNotCompleted;

  const folderId = taskFolderIds[task.name];

  const isUploadable =
    task.name === ReleaseTaskName.PreMastersSubmitted ||
    task.name === ReleaseTaskName.MastersSubmitted ||
    task.name === ReleaseTaskName.ArtworkCreation;

  return (
    <Card className={`${styles.taskItem} ${taskClass}`}>
      <Flex direction="column" gap="1">
        <Flex gap="2" align="center" justify="between">
          <Text weight="medium">{task.name}</Text>
          {folderId && isUploadable && (
            <GoogleDriveUpload
              parentId={folderId}
              taskId={task.id}
              taskName={task.name}
              onUploadComplete={handleUploadComplete}
              permittedMimeTypes={getPermittedMimeTypesForTask(task)}
              multiple={true}
            />
          )}
        </Flex>
        <Flex gap="1" wrap="wrap">
          <Badge
            size="2"
            color={getDueDateStatusColor(task.dueDateStatus as DueDateStatus)}
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
        {task.taskFiles && task.taskFiles.length > 0 && (
          <Flex gap="1" wrap="wrap" direction="column" mt="2">
            {task.taskFiles.map((file) => (
              <DriveLinkButton
                key={file.id}
                url={file.driveLink || ""}
                fileName={file.name || ""}
              />
            ))}
          </Flex>
        )}
      </Flex>
    </Card>
  );
}
