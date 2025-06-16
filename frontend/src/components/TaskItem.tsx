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

interface Props {
  task: ReleaseTask;
  taskFolderIds: Record<string, string | null>;
  releaseName: string;
  catalogNumber: string;
  releaseDate: string;
  labelName: string;
  artists: any[];
  tasksData: ReleaseTask[];
  premastersEmailsSent: boolean;
}

export function TaskItem({
  task: initialTask,
  taskFolderIds,
  releaseName,
  catalogNumber,
  releaseDate,
  labelName,
  artists,
  tasksData,
  premastersEmailsSent,
}: Props) {
  const [task, setTask] = useState(initialTask);
  const [isLoading, setIsLoading] = useState(false);

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
        await fetch("/api/handle-premaster-submission", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            releaseName,
            catalogNumber,
            releaseDate,
            labelName,
            artists,
            tasks: tasksData,
            releaseId: task.releaseId,
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
      ? task.taskFiles[0].createdAt
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

  return (
    <Card className={`${styles.taskItem} ${taskClass}`}>
      <Flex direction="column" gap="1">
        <Flex gap="2" align="center" justify="between">
          <Text weight="medium">{task.name}</Text>
          {folderId && (
            <GoogleDriveUpload
              parentId={folderId}
              taskId={task.id}
              taskName={task.name}
              onUploadComplete={handleUploadComplete}
              permittedMimeTypes={getPermittedMimeTypesForTask(task)}
              multiple={
                task.name === ReleaseTaskName.PreMastersSubmitted ||
                task.name === ReleaseTaskName.MastersSubmitted
              }
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
