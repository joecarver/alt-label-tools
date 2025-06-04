import type { FileInfo } from "../types/FileInfo";
import { getSecret } from "astro:env/server";

// Cache for storing folder paths to their IDs
const folderIdCache: Record<string, string> = {};

// Service account credentials
const serviceAccountEmail = getSecret("GOOGLE_SERVICE_ACCOUNT_EMAIL");
const serviceAccountKey = getSecret("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");

// Format the private key by replacing literal \n with actual newlines
const formatPrivateKey = (key: string) => {
  return key.replace(/\\n/g, "\n");
};

// Generate JWT for service account authentication
async function generateServiceAccountToken() {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600; // Token expires in 1 hour

  const header = {
    alg: "RS256",
    typ: "JWT",
    kid: getSecret("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID"),
  };

  const claim = {
    iss: serviceAccountEmail,
    scope: [
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/drive.metadata.readonly",
    ].join(" "),
    aud: "https://oauth2.googleapis.com/token",
    exp,
    iat: now,
  };

  const encodedHeader = btoa(JSON.stringify(header));
  const encodedClaim = btoa(JSON.stringify(claim));
  const signatureInput = `${encodedHeader}.${encodedClaim}`;

  // Convert PEM to raw key format
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = formatPrivateKey(serviceAccountKey || "")
    .replace(pemHeader, "")
    .replace(pemFooter, "")
    .replace(/\s/g, "");

  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  // Import the key
  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  // Sign the JWT
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    encoder.encode(signatureInput)
  );

  const encodedSignature = btoa(
    String.fromCharCode(...new Uint8Array(signature))
  );
  const jwt = `${signatureInput}.${encodedSignature}`;

  // Exchange JWT for access token
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }).toString(),
  });

  if (!response.ok) {
    throw new Error("Failed to get access token");
  }

  const { access_token } = await response.json();
  return access_token;
}

interface DriveFile {
  id?: string;
  name?: string;
  webViewLink?: string;
  mimeType?: string;
  createdTime?: string;
}

export function convertToFileInfo(file: DriveFile): FileInfo | null {
  if (!file.id || !file.name || !file.webViewLink || !file.mimeType) {
    return null;
  }
  return {
    id: file.id,
    name: file.name,
    webViewLink: file.webViewLink,
    mimeType: file.mimeType,
    createdTime: file.createdTime,
  };
}

export async function listFilesInFolder(folderId: string): Promise<FileInfo[]> {
  try {
    const token = await generateServiceAccountToken();
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed+=+false&fields=files(id,name,webViewLink,mimeType)`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to list files");
    }

    const data = await response.json();
    const files: DriveFile[] = data.files || [];
    return files.map(convertToFileInfo).filter((file) => file !== null);
  } catch (error) {
    console.error("Error listing files:", error);
    throw error;
  }
}

export async function getFileInfo(
  folderId: string | null,
  fileName: string
): Promise<FileInfo | null> {
  if (!folderId) {
    return null;
  }

  try {
    const token = await generateServiceAccountToken();
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+name+contains+'${fileName}'+and+trashed+=+false&fields=files(id,name,webViewLink,mimeType,createdTime)`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to get file info");
    }

    const data = await response.json();

    // If no exact match, try a more flexible search
    if (!data.files?.length) {
      const flexibleResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+name+contains+'${fileName.toLowerCase()}'+and+trashed+=+false&fields=files(id,name,webViewLink,mimeType,createdTime)`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!flexibleResponse.ok) {
        throw new Error("Failed to get file info");
      }

      const flexibleData = await flexibleResponse.json();
      return flexibleData.files?.[0]
        ? convertToFileInfo(flexibleData.files[0])
        : null;
    }

    return data.files[0] ? convertToFileInfo(data.files[0]) : null;
  } catch (error) {
    console.error("Error getting file info:", error);
    throw error;
  }
}

interface DriveFolder {
  id: string;
  name: string;
  parents: string[];
}

export async function getFolderId(folderName: string): Promise<string | null> {
  // Check cache first
  if (folderIdCache[folderName]) {
    return folderIdCache[folderName];
  }

  // If the folderName contains slashes, it's a path
  const pathParts = folderName.split("/").filter((part) => part.trim() !== "");
  if (pathParts.length === 0) {
    return null;
  }

  try {
    const token = await generateServiceAccountToken();
    let currentFolderId: string | null = null;
    let currentPath = "";

    // First, find the root folder that was shared with the service account
    const rootResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name+=+'${pathParts[0]}'+and+mimeType+=+'application/vnd.google-apps.folder'+and+trashed+=+false+and+sharedWithMe+=+true&fields=files(id)`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!rootResponse.ok) {
      if (rootResponse.status === 429) {
        // Rate limit error
        console.warn("Rate limit hit, retrying after delay...");
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
        return getFolderId(folderName); // Retry the entire operation
      }
      throw new Error("Failed to search for root folder");
    }

    const rootData = await rootResponse.json();
    if (!rootData.files?.length) {
      return null;
    }

    currentFolderId = rootData.files[0].id;
    if (!currentFolderId) {
      return null;
    }

    currentPath = pathParts[0];
    folderIdCache[currentPath] = currentFolderId;

    // If there's only one part in the path, we're done
    if (pathParts.length === 1) {
      return currentFolderId;
    }

    // For the remaining parts, build a query that searches for all remaining folders at once
    const remainingParts = pathParts.slice(1);
    const folderNames = remainingParts
      .map((name) => `name+=+'${name}'`)
      .join("+or+");

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=(${folderNames})+and+mimeType+=+'application/vnd.google-apps.folder'+and+trashed+=+false&fields=files(id,name,parents)`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        // Rate limit error
        console.warn("Rate limit hit, retrying after delay...");
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
        return getFolderId(folderName); // Retry the entire operation
      }
      throw new Error("Failed to search for subfolders");
    }

    const data = await response.json();
    if (!data.files?.length) {
      return null;
    }

    // Build a map of folder names to their IDs and parents
    const folderMap = new Map<string, DriveFolder>(
      data.files.map((file: DriveFolder) => [file.name, file])
    );

    // Traverse the path using the map
    for (let i = 1; i < pathParts.length; i++) {
      const folderPart = pathParts[i];
      currentPath += "/" + folderPart;

      const folderInfo = folderMap.get(folderPart);
      if (!folderInfo || !folderInfo.parents.includes(currentFolderId)) {
        return null;
      }

      currentFolderId = folderInfo.id;
      folderIdCache[currentPath] = currentFolderId;
    }

    return currentFolderId;
  } catch (error) {
    console.error("Error searching for folders:", error);
    throw error;
  }
}

const CLIENT_FOLDER_PARENT_ID = "18FtD4JQnjWshaRXUpfSwiCf428fTzUgT";

// Create a new folder in Google Drive
export async function createDriveFolder(
  folderName: string,
  parentId: string = CLIENT_FOLDER_PARENT_ID
): Promise<string> {
  const token = await generateServiceAccountToken();
  const body: any = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
  };
  if (parentId) {
    body.parents = [parentId];
  }
  const response = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create folder: ${errorText}`);
  }
  const data = await response.json();
  return data.id;
}
