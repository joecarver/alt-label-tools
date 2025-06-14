import { getSecret } from "astro:env/server";

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
