export interface EmailRequest {
  to: string;
  from: string;
  reply_to: string;
  subject: string;
  body: string;
}

/**
 * Sends an email using the email HTTP server
 * @param request The email request containing all required fields
 * @returns Promise that resolves when the email is sent successfully
 * @throws Error if the email sending fails
 */
export async function sendEmail(request: EmailRequest): Promise<void> {
  const response = await fetch(
    "https://email-http-server.onrender.com/send-email",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }
}
