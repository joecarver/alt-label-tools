import React, { useState, useRef } from "react";
import { Button } from "@radix-ui/themes";
import { UploadIcon } from "@radix-ui/react-icons";
import {
  validateAudioFileName,
  validateArtworkFileName,
} from "@/utils/validateFIleName";
import { ReleaseTaskName } from "@/types/ReleaseTask";
import type { TaskFile } from "@/types/TaskFile";

interface GoogleDriveUploadProps {
  onUploadComplete?: () => void;
  onError?: (error: Error) => void;
  parentId?: string;
  taskId: string;
  taskName: string;
  permittedMimeTypes: string[];
  multiple?: boolean;
  existingFiles?: TaskFile[];
}

const GoogleDriveUpload: React.FC<GoogleDriveUploadProps> = ({
  onUploadComplete,
  onError,
  parentId,
  taskId,
  permittedMimeTypes,
  taskName,
  multiple = false,
  existingFiles,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsLoading(true);
    setUploadProgress({ current: 0, total: files.length });
    let submissionError = false;
    try {
      for (const [index, file] of Array.from(files).entries()) {
        const validationFunction =
          taskName === ReleaseTaskName.PreMastersSubmitted
            ? () => validateAudioFileName(file.name, false)
            : taskName === ReleaseTaskName.MastersSubmitted
            ? () => validateAudioFileName(file.name, true)
            : () => validateArtworkFileName(file.name);

        const error = validationFunction();
        if (error) {
          alert(`Error with file ${file.name}: ${error}`);
          submissionError = true;
          break;
        }

        const formData = new FormData();
        formData.append("file", file);
        if (parentId) {
          formData.append("parentId", parentId);
        }
        formData.append("taskId", taskId);
        if (
          existingFiles &&
          existingFiles.length > 0 &&
          existingFiles.find((f) => f.name === file.name)
        ) {
          formData.append(
            "existingFileId",
            existingFiles.find((f) => f.name === file.name)?.fileId || ""
          );
        }
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            `Failed to upload ${file.name}: ${
              errorData.error || "Unknown error"
            }`
          );
        }

        setUploadProgress((prev) =>
          prev ? { ...prev, current: index + 1 } : null
        );
      }

      if (onUploadComplete && !submissionError) {
        onUploadComplete();
      }
    } catch (error) {
      console.error("Error uploading to Google Drive:", error);
      if (onError && error instanceof Error) {
        onError(error);
      }
    } finally {
      setIsLoading(false);
      setUploadProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const elementId = `file-upload-${taskId}`;

  const getButtonText = () => {
    if (!isLoading) return "Upload";
    if (!uploadProgress) return "Uploading...";
    return `Uploading ${uploadProgress.current + 1}/${
      uploadProgress.total
    } files...`;
  };

  return (
    <div>
      <input
        type="file"
        id={elementId}
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileSelect}
        disabled={isLoading}
        accept={permittedMimeTypes.join(",")}
        multiple={multiple}
      />
      <Button
        onClick={() => document.getElementById(elementId)?.click()}
        disabled={isLoading}
        style={{ cursor: "pointer" }}
        size="1"
      >
        <UploadIcon />
        {getButtonText()}
      </Button>
    </div>
  );
};

export default GoogleDriveUpload;
