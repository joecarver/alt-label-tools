import type { APIRoute } from "astro";
import JSZip from "jszip";
import {
  listFilesInFolderRecursive,
  downloadDriveFile,
} from "../../utils/drive";
import { getAuthTokenFromCookies, getUserFromToken } from "../../utils/auth";

export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    // Authenticate user (same pattern as upload.ts)
    const token = getAuthTokenFromCookies(cookies);
    if (!token) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
      });
    }
    const user = await getUserFromToken(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Invalid user" }), {
        status: 401,
      });
    }

    // Get folderId from query params
    const url = new URL(request.url);
    const folderId = url.searchParams.get("folderId");
    if (!folderId) {
      return new Response(JSON.stringify({ error: "No folderId provided" }), {
        status: 400,
      });
    }

    // List all files in the folder (including subfolders)
    const files = await listFilesInFolderRecursive(folderId);
    if (!files.length) {
      return new Response(
        JSON.stringify({ error: "No files found in folder" }),
        {
          status: 404,
        }
      );
    }

    // Download and zip all files
    const zip = new JSZip();
    for (const file of files) {
      // Use the path from the recursive function to maintain folder structure
      const { buffer } = await downloadDriveFile(file.id);
      zip.file(file.path, buffer);
    }
    const zipBuffer = await zip.generateAsync({ type: "uint8array" });

    return new Response(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename=folder-${folderId}.zip`,
      },
    });
  } catch (error) {
    console.error("Error downloading folder as zip:", error);
    return new Response(
      JSON.stringify({ error: "Failed to download folder as zip" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};
