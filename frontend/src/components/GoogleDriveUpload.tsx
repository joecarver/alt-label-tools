import React, { useState } from "react";
import { Button } from "@radix-ui/themes";
import { UploadIcon } from "@radix-ui/react-icons";
import { validateAudioFileName } from "@/utils/validateFIleName";
import { ReleaseTaskName } from "@/types/ReleaseTask";

interface GoogleDriveUploadProps {
  onUploadComplete?: () => void;
  onError?: (error: Error) => void;
  parentId?: string;
  taskId: string;
  taskName: string;
  permittedMimeTypes: string[];
}

const GoogleDriveUpload: React.FC<GoogleDriveUploadProps> = ({
  onUploadComplete,
  onError,
  parentId,
  taskId,
  permittedMimeTypes,
  taskName,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationFunction =
      taskName === ReleaseTaskName.PreMastersSubmitted
        ? () => validateAudioFileName(file.name, false)
        : () => validateAudioFileName(file.name, true);

    const error = validationFunction();
    if (error) {
      alert(error);
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (parentId) {
        formData.append("parentId", parentId);
      }
      formData.append("taskId", taskId);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload file");
      }

      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (error) {
      console.error("Error uploading to Google Drive:", error);
      if (onError && error instanceof Error) {
        onError(error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const elementId = `file-upload-${taskId}`;

  return (
    <div>
      <input
        type="file"
        id={elementId}
        style={{ display: "none" }}
        onChange={handleFileSelect}
        disabled={isLoading}
        accept={permittedMimeTypes.join(",")}
      />
      <Button
        onClick={() => document.getElementById(elementId)?.click()}
        disabled={isLoading}
        style={{ cursor: "pointer" }}
        size="2"
      >
        <UploadIcon />
        {isLoading ? "Uploading..." : "Upload to Google Drive"}
      </Button>
    </div>
  );
};

export default GoogleDriveUpload;
