import { DownloadIcon } from "@radix-ui/react-icons";
import { Button } from "@radix-ui/themes";
import { useState } from "react";

interface DownloadButtonProps {
  text: string;
  folderId: string;
  onError?: (error: Error) => void;
  fileName: string;
}

export const DownloadButton = ({
  text,
  folderId,
  onError,
  fileName,
}: DownloadButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/download-folder?folderId=${folderId}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to download zip");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading folder:", error);
      if (onError && error instanceof Error) {
        onError(error);
      } else {
        alert("Failed to download zip");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleDownload}
      disabled={isLoading}
      size="2"
      style={{ cursor: "pointer" }}
    >
      <DownloadIcon />
      {isLoading ? "Preparing download..." : text}
    </Button>
  );
};
