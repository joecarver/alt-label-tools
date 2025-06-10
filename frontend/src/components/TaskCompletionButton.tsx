import { Button } from "@radix-ui/themes";
import { CheckIcon, Cross2Icon } from "@radix-ui/react-icons";
import { formatSingleDate } from "../utils/date";
import { useState } from "react";

interface Props {
  completedAt?: string;
  isCompleted: boolean;
  isLoading: boolean;
  onToggle: () => void;
}

export function TaskCompletionButton({
  completedAt,
  isCompleted,
  isLoading,
  onToggle,
}: Props) {
  const [isHovering, setIsHovering] = useState(false);

  if (isCompleted) {
    return (
      <Button
        type="button"
        size="1"
        color={isHovering ? "red" : "green"}
        variant="soft"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onClick={onToggle}
        style={{ cursor: isLoading ? "not-allowed" : "pointer" }}
        disabled={isLoading}
        loading={isLoading}
      >
        {isHovering ? <Cross2Icon /> : <CheckIcon />}
        {`Completed: ${formatSingleDate(completedAt!)} (manually)`}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size="1"
      variant="outline"
      color="green"
      onClick={onToggle}
      disabled={isLoading}
      loading={isLoading}
      style={{
        cursor: isLoading ? "not-allowed" : "pointer",
      }}
    >
      <CheckIcon /> Mark as Complete
    </Button>
  );
}
