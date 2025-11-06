import nodemailer from "nodemailer";
import { env } from "~/env";

/**
 * Email service for sending transactional emails
 */

// Parse MAIL_SERVER URL to extract connection details
const parseMailServer = (url: string) => {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || "587"),
    secure: parsed.protocol === "smtps:",
    auth:
      parsed.username || parsed.password
        ? {
            user: parsed.username,
            pass: parsed.password,
          }
        : undefined,
  };
};

// Create reusable transporter
const transporter = nodemailer.createTransport(parseMailServer(env.MAIL_SERVER));

/**
 * Send an invitation email to a user
 */
export async function sendInvitationEmail({
  to,
  organizationName,
  invitedByName,
  invitationId,
}: {
  to: string;
  organizationName: string;
  invitedByName: string;
  invitationId: string;
}) {
  const baseUrl = env.NODE_ENV === "production" 
    ? "https://expensify.com" // TODO: Replace with actual production URL
    : "http://localhost:3000";
  
  const acceptUrl = `${baseUrl}/invitations/${invitationId}`;

  const mailOptions = {
    from: env.MAIL_FROM,
    to,
    subject: `You've been invited to join ${organizationName}`,
    text: `
Hello!

${invitedByName} has invited you to join ${organizationName} on Expensify.

To accept this invitation, please click the link below:
${acceptUrl}

This invitation will expire in 7 days.

If you didn't expect this invitation, you can safely ignore this email.

Best regards,
The Expensify Team
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to bottom, #2e026d, #15162c); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Expensify</h1>
  </div>
  
  <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="color: #2e026d; margin-top: 0;">You've been invited!</h2>
    
    <p><strong>${invitedByName}</strong> has invited you to join <strong>${organizationName}</strong> on Expensify.</p>
    
    <p>Click the button below to accept this invitation:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${acceptUrl}" 
         style="background: #2e026d; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
        Accept Invitation
      </a>
    </div>
    
    <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
    <p style="color: #666; font-size: 14px; word-break: break-all;">${acceptUrl}</p>
    
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
    
    <p style="color: #999; font-size: 12px;">
      This invitation will expire in 7 days.<br>
      If you didn't expect this invitation, you can safely ignore this email.
    </p>
  </div>
</body>
</html>
    `.trim(),
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] Invitation sent to ${to} for organization ${organizationName}`);
  } catch (error) {
    console.error(`[EMAIL] Failed to send invitation to ${to}:`, error);
    throw new Error("Failed to send invitation email");
  }
}

