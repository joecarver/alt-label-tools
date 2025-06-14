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

interface Props {
  task: ReleaseTask;
  taskFolderUrls: Record<string, string>;
}

export function TaskItem({ task: initialTask, taskFolderUrls }: Props) {
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

  const folderUrl = taskFolderUrls[task.name];

  return (
    <Card className={`${styles.taskItem} ${taskClass}`}>
      <Flex direction="column" gap="1">
        <Flex gap="2" align="center" justify="between">
          <Text weight="medium">{task.name}</Text>
          {folderUrl && <DriveLinkButton url={folderUrl} />}
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
