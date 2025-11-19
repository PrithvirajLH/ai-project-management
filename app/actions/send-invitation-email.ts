"use server"

export async function sendInvitationEmail({
  accessToken,
  toEmail,
  workspaceName,
  inviterName,
  inviteLink,
}: {
  accessToken: string
  toEmail: string
  workspaceName: string
  inviterName: string
  inviteLink: string
}) {
  if (!accessToken) {
    throw new Error("Missing access token")
  }

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 30px;">
        <h1 style="color: #000; font-size: 24px; margin: 0 0 20px 0;">You've been invited to join a workspace</h1>
        
        <p style="font-size: 16px; margin: 0 0 16px 0;">
          <strong>${inviterName}</strong> has invited you to collaborate in the <strong>${workspaceName}</strong> workspace.
        </p>
        
        <p style="font-size: 16px; margin: 0 0 24px 0;">
          Click the button below to accept the invitation and start collaborating.
        </p>
        
        <div style="margin: 30px 0;">
          <a href="${inviteLink}" style="display: inline-block; background-color: #0078d4; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: 600; font-size: 16px;">
            Accept Invitation
          </a>
        </div>
        
        <p style="font-size: 14px; color: #666; margin: 24px 0 0 0;">
          Or copy and paste this link into your browser:
        </p>
        <p style="font-size: 12px; color: #999; margin: 8px 0 0 0; word-break: break-all;">
          ${inviteLink}
        </p>
        
        <p style="font-size: 12px; color: #999; margin: 30px 0 0 0; border-top: 1px solid #e0e0e0; padding-top: 20px;">
          This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
        </p>
      </div>
    </body>
    </html>
  `

  const emailText = `
You've been invited to join a workspace

${inviterName} has invited you to collaborate in the ${workspaceName} workspace.

Click the link below to accept the invitation:
${inviteLink}

This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
  `

  try {
    // Send email using Microsoft Graph Mail API
    const response = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject: `You've been invited to join ${workspaceName}`,
          body: {
            contentType: "HTML",
            content: emailHtml,
          },
          toRecipients: [
            {
              emailAddress: {
                address: toEmail,
              },
            },
          ],
        },
      }),
      cache: "no-store",
    })

    if (!response.ok) {
      let body: string | null = null
      try {
        body = await response.text()
      } catch {
        // ignore body read errors
      }

      console.error("Graph sendMail failed", response.status, body ?? "")
      throw new Error("Failed to send invitation email")
    }

    return { success: true }
  } catch (error) {
    console.error("Failed to send invitation email:", error)
    throw error
  }
}


