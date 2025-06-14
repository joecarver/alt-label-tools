import { Badge } from "@radix-ui/themes";
import { CheckIcon } from "@radix-ui/react-icons";
import { formatSingleDate } from "../utils/date";
import { TaskCompletionButton } from "./TaskCompletionButton";
import { CompletionStatus } from "@/types/CompletionStatus";

interface TaskItemCompletionStatusProps {
  isDetectable: boolean;
  completionStatus: CompletionStatus;
  completedAt: string | null;
  onToggle: () => void;
  isLoading: boolean;
}

export const TaskItemCompletionStatus = ({
  isDetectable,
  completionStatus,
  completedAt,
  onToggle,
  isLoading,
}: TaskItemCompletionStatusProps) => {
  if (isDetectable) {
    return completionStatus === CompletionStatus.DONE_DETECTED ? (
      <Badge size="2" color="green" variant="soft">
        <CheckIcon />
        Completed: {formatSingleDate(completedAt || "")}
      </Badge>
    ) : null;
  }

  return (
    <div>
      <TaskCompletionButton
        isCompleted={completionStatus === CompletionStatus.DONE_MANUALLY}
        completedAt={completedAt || undefined}
        onToggle={onToggle}
        isLoading={isLoading}
      />
    </div>
  );
};
