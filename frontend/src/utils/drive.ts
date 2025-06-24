import { getSecret } from "astro:env/server";
import type { ReleaseTask } from "@/types/ReleaseTask";
import type { Database } from "@/types/supabase";

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

const CLIENT_FOLDER_PARENT_ID = "18FtD4JQnjWshaRXUpfSwiCf428fTzUgT";

// Check if a folder with the given name exists in the specified parent folder
async function checkFolderExists(
  folderName: string,
  parentId: string,
  token: string
): Promise<string | null> {
  const query = [
    `'${parentId}'+in+parents`,
    `name='${folderName.replace(/'/g, "\\'")}'`,
    "mimeType='application/vnd.google-apps.folder'",
    "trashed=false",
  ].join(" and ");
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`;
  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!searchRes.ok) {
    const errorText = await searchRes.text();
    throw new Error(`Failed to search for existing folder: ${errorText}`);
  }
  const { files: existingFolders } = await searchRes.json();
  if (existingFolders && existingFolders.length > 0) {
    return existingFolders[0].id;
  }
  return null;
}

// Create a new folder in Google Drive
export async function createDriveFolder(
  folderName: string,
  parentId: string = CLIENT_FOLDER_PARENT_ID
): Promise<string> {
  const token = await generateServiceAccountToken();

  // Use the new checkFolderExists function
  const existingFolderId = await checkFolderExists(folderName, parentId, token);
  if (existingFolderId) {
    return existingFolderId;
  }

  // Folder does not exist, create it
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

// Upload a file to Google Drive
export async function uploadFile(
  file: File,
  parentId?: string
): Promise<string> {
  const token = await generateServiceAccountToken();

  // Create file metadata
  const metadata = {
    name: file.name,
    mimeType: file.type,
    parents: parentId ? [parentId] : undefined,
  };

  // Create form data for upload
  const formData = new FormData();
  formData.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" })
  );
  formData.append("file", file);

  // Upload to Google Drive
  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to upload file: ${errorText}`);
  }

  const result = await response.json();
  return result.id;
}

// Constant source folder ID containing the 4 template Google Docs
const SOURCE_DOCS_FOLDER_ID = "1yyU1g4hk10iuWXg7qz0EMSLsWiGcAe4v";

// Type for text replacements
interface TextReplacement {
  search: string;
  replace: string;
}

/**
 * Copies 4 specific Google Docs from the source folder to the destination folder, then performs text replacements in each.
 * @param destFolderId The destination Google Drive folder ID
 * @param catalogNumber The catalog number to use in the new file names (replaces 'ALT000')
 * @param replacements Array of {search, replace} objects for text replacement in each doc
 * @returns Array of new files
 */
export async function copyAndReplaceDocsInFolder(
  destFolderId: string,
  catalogNumber: string,
  replacements: TextReplacement[],
  taskId: string
): Promise<Database["public"]["Tables"]["task_files"]["Row"][]> {
  const token = await generateServiceAccountToken();

  // The 4 specific file names to fetch
  const docNames = [
    "ALT000 - Blank Factsheet - Template",
    "ALT000 - Publishing - Exist. Comp. 30 Day",
    "ALT000 - Music Publishing - Sync Licensing Authority - Template",
    "ALT000 - Music Publishing - Master Sync Licensing Authority - Template",
  ];

  // 1. List the files in the source folder and filter for the 4 specific names
  const listRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q='${SOURCE_DOCS_FOLDER_ID}'+in+parents+and+mimeType='application/vnd.google-apps.document'+and+trashed=false&fields=files(id,name)`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!listRes.ok) {
    const errorText = await listRes.text();
    throw new Error(`Failed to list source docs: ${errorText}`);
  }
  const { files } = await listRes.json();
  // Only keep the files that match the 4 required names
  const docsToCopy = docNames.map((name) => {
    const found = files.find((f: { name: string }) => f.name === name);
    if (!found) throw new Error(`Source doc not found: ${name}`);
    return found;
  });

  const newFiles: Partial<Database["public"]["Tables"]["task_files"]["Row"]>[] =
    [];

  // 2. Copy each doc to the destination folder with the new name
  for (const doc of docsToCopy) {
    // Build the new file name
    let newName = doc.name.replace(/^ALT000/, catalogNumber);
    newName = newName.replace(/ - Template$/, "");
    newName = newName.replace(/Blank Factsheet/, "Factsheet");

    // Copy the file
    const copyRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${doc.id}/copy`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newName,
          parents: [destFolderId],
        }),
      }
    );
    if (!copyRes.ok) {
      const errorText = await copyRes.text();
      throw new Error(`Failed to copy doc ${doc.id}: ${errorText}`);
    }
    const newDoc = await copyRes.json();

    newFiles.push({
      name: newName,
      file_id: newDoc.id,
      file_created_at: new Date().toISOString(),
      file_updated_at: new Date().toISOString(),
      drive_link: `https://drive.google.com/file/d/${newDoc.id}/view`,
      mime_type: newDoc.mimeType,
      task_id: taskId,
    });

    // 3. Perform text replacements using the Docs API batchUpdate
    const batchUpdateRes = await fetch(
      `https://docs.googleapis.com/v1/documents/${newDoc.id}:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: replacements.map(({ search, replace }) => ({
            replaceAllText: {
              containsText: { text: search, matchCase: true },
              replaceText: replace,
            },
          })),
        }),
      }
    );
    if (!batchUpdateRes.ok) {
      const errorText = await batchUpdateRes.text();
      throw new Error(`Failed to update doc ${newDoc.id}: ${errorText}`);
    }
  }

  return newFiles;
}

// List all files in a Google Drive folder
export async function listFilesInFolder(folderId: string): Promise<any[]> {
  const token = await generateServiceAccountToken();
  let files: any[] = [];
  let pageToken: string | undefined = undefined;
  do {
    const url: string =
      `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType),nextPageToken` +
      (pageToken ? `&pageToken=${pageToken}` : "");
    const res: Response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to list files: ${errorText}`);
    }
    const data: { files: any[]; nextPageToken?: string } = await res.json();
    files = files.concat(data.files);
    pageToken = data.nextPageToken;
  } while (pageToken);
  return files;
}

// Download a file from Google Drive as a buffer
export async function downloadDriveFile(
  fileId: string
): Promise<{ buffer: ArrayBuffer; fileName: string; mimeType: string }> {
  const token = await generateServiceAccountToken();
  // Get file metadata for name and mimeType
  const metaRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,mimeType`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!metaRes.ok) {
    const errorText = await metaRes.text();
    throw new Error(`Failed to get file metadata: ${errorText}`);
  }
  const { name, mimeType } = await metaRes.json();
  // Download file content
  const fileRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!fileRes.ok) {
    const errorText = await fileRes.text();
    throw new Error(`Failed to download file: ${errorText}`);
  }
  const buffer = await fileRes.arrayBuffer();
  return { buffer, fileName: name, mimeType };
}
