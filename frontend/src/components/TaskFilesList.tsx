import { type ExpectedFile } from "@/utils/getExpectedFilesForTask";
import { type ReleaseTask } from "@/types/ReleaseTask";
import { DriveLinkButton } from "./DriveLinkButton";
import { Badge, Button, Flex } from "@radix-ui/themes";

interface Props {
  task: ReleaseTask;
  expectedFiles: ExpectedFile[];
}

export const TaskFilesList = ({ task, expectedFiles }: Props) => {
  const missingFiles = expectedFiles.filter(
    (file) => !task.taskFiles?.some((f) => f.name === file.name)
  );

  if (missingFiles.length === 0 && task.taskFiles?.length === 0) {
    return null;
  }

  return (
    <Flex gap="1" wrap="wrap" direction="column" mt="2">
      {missingFiles.length > 0 &&
        missingFiles.map((file) => (
          <div key={file.name}>
            <Button size="1" variant="outline" className="link-button" disabled>
              {file.name}
            </Button>
          </div>
        ))}
      {task.taskFiles &&
        task.taskFiles.length > 0 &&
        task.taskFiles.map((file) => (
          <DriveLinkButton
            key={file.id}
            url={file.driveLink || ""}
            fileName={file.name || ""}
          />
        ))}
    </Flex>
  );
};
