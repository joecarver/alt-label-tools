import { FileIcon } from "@radix-ui/react-icons";
import { Button } from "@radix-ui/themes";
import { PiFolder } from "react-icons/pi";

interface DriveLinkButtonProps {
  url: string;
  fileName?: string;
}

export const DriveLinkButton = ({ url, fileName }: DriveLinkButtonProps) => {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <Button
        size="1"
        variant="outline"
        style={{ cursor: "pointer" }}
        className="link-button"
      >
        {fileName ? <FileIcon /> : <PiFolder size={14} />}
        {fileName || "Open folder in Drive"}
      </Button>
    </a>
  );
};

// Add styles using CSS modules or styled-components if needed
const styles = `
  .link-button:hover {
    background-color: var(--color-accent-12);
  }
`;
