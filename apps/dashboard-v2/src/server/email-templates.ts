/**
 * Unified Email Template System for Onboarding
 * Ported from old dashboard's EmailTemplate.ts + OnboardingEmailFunctions.ts
 * Uses IEEE blue colors and modern, responsive design
 */

import { sendEmail } from "./email";

// IEEE Brand Colors
export const IEEE_COLORS = {
  primary: "#00629B",
  primaryDark: "#004B7A",
  primaryLight: "#0080C9",
  accent: "#00A9E0",
  success: "#00AB84",
  warning: "#F7A800",
  danger: "#E31C3D",
  gray: {
    50: "#F9FAFB",
    100: "#F3F4F6",
    200: "#E5E7EB",
    300: "#D1D5DB",
    400: "#9CA3AF",
    500: "#6B7280",
    600: "#4B5563",
    700: "#374151",
    800: "#1F2937",
    900: "#111827",
  },
  white: "#FFFFFF",
  black: "#000000",
};

function escapeHtml(unsafe: string): string {
  if (typeof unsafe !== "string") {
    return String(unsafe);
  }
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sanitizeUrl(url: string): string {
  if (typeof url !== "string") {
    return "#";
  }
  const trimmed = url.trim();
  if (/^(javascript|data|vbscript):/i.test(trimmed)) {
    return "#";
  }
  return escapeHtml(trimmed);
}

interface EmailTemplateOptions {
  title: string;
  preheader?: string;
  headerText?: string;
  bodyContent: string;
  footerText?: string;
  ctaButton?: {
    text: string;
    url: string;
  };
  referenceId?: string;
  contactEmail?: string;
}

export function generateEmailTemplate(options: EmailTemplateOptions): string {
  const {
    title,
    preheader = "",
    headerText = "IEEE at UC San Diego",
    bodyContent,
    footerText = "IEEE at UC San Diego Dashboard",
    ctaButton,
    referenceId,
    contactEmail = "ieee@ucsd.edu",
  } = options;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  ${preheader ? `<meta name="description" content="${escapeHtml(preheader)}">` : ""}
  <title>${escapeHtml(title)}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body {
      margin: 0; padding: 0; width: 100% !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: ${IEEE_COLORS.gray[100]};
    }
    .email-container { max-width: 600px; margin: 0 auto; background-color: ${IEEE_COLORS.white}; }
    .email-header { background: #003B5C; padding: 32px 24px; text-align: center; }
    .email-header h1 { margin: 0; color: ${IEEE_COLORS.white}; font-size: 24px; font-weight: 600; letter-spacing: -0.5px; }
    .email-body { padding: 32px 24px; color: ${IEEE_COLORS.gray[800]}; font-size: 16px; line-height: 1.6; }
    .email-body h2 { color: ${IEEE_COLORS.primary}; font-size: 20px; font-weight: 600; margin: 0 0 16px 0; }
    .email-body h3 { color: ${IEEE_COLORS.gray[700]}; font-size: 18px; font-weight: 600; margin: 24px 0 12px 0; }
    .email-body p { margin: 0 0 16px 0; color: ${IEEE_COLORS.gray[700]}; }
    .email-body ul, .email-body ol { margin: 0 0 16px 0; padding-left: 24px; }
    .email-body li { margin-bottom: 8px; color: ${IEEE_COLORS.gray[700]}; }
    .info-box { background-color: ${IEEE_COLORS.gray[50]}; border-left: 4px solid ${IEEE_COLORS.primary}; padding: 16px; margin: 20px 0; border-radius: 4px; }
    .info-box-success { background-color: #ECFDF5; border-left-color: ${IEEE_COLORS.success}; }
    .info-box-warning { background-color: #FFFBEB; border-left-color: ${IEEE_COLORS.warning}; }
    .info-box-danger { background-color: #FEF2F2; border-left-color: ${IEEE_COLORS.danger}; }
    .cta-button {
      display: inline-block; padding: 14px 28px; background: #003B5C;
      color: ${IEEE_COLORS.white} !important; text-decoration: none; border-radius: 8px;
      font-weight: 600; font-size: 16px; margin: 20px 0;
    }
    .email-footer { background-color: ${IEEE_COLORS.gray[50]}; padding: 24px; text-align: center; border-top: 1px solid ${IEEE_COLORS.gray[200]}; }
    .email-footer p { margin: 8px 0; color: ${IEEE_COLORS.gray[600]}; font-size: 14px; }
    .email-footer a { color: ${IEEE_COLORS.primary}; text-decoration: none; font-weight: 500; }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .email-header, .email-body, .email-footer { padding: 24px 16px !important; }
    }
  </style>
</head>
<body>
  ${preheader ? `<div style="display: none; max-height: 0; overflow: hidden;">${escapeHtml(preheader)}</div>` : ""}
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${IEEE_COLORS.gray[100]}; padding: 20px 0;">
    <tr>
      <td align="center">
        <div class="email-container">
          <div class="email-header">
            <h1>${escapeHtml(headerText)}</h1>
          </div>
          <div class="email-body">
            ${bodyContent}
            ${ctaButton ? `<div style="text-align: center; margin: 32px 0;"><a href="${sanitizeUrl(ctaButton.url)}" class="cta-button">${escapeHtml(ctaButton.text)}</a></div>` : ""}
          </div>
          <div class="email-footer">
            ${referenceId ? `<p style="margin-bottom: 16px;">Reference ID: <span style="background-color: ${IEEE_COLORS.gray[100]}; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 14px; color: ${IEEE_COLORS.primary}; font-weight: 600;">${escapeHtml(referenceId)}</span></p>` : ""}
            <p>Questions? Contact us at <a href="mailto:${escapeHtml(contactEmail)}">${escapeHtml(contactEmail)}</a></p>
            <hr style="border: none; border-top: 1px solid ${IEEE_COLORS.gray[300]}; margin: 16px 0;">
            <p style="font-size: 12px; color: ${IEEE_COLORS.gray[500]};">${escapeHtml(footerText)}</p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

export function createInfoBox(
  content: string,
  type: "info" | "success" | "warning" | "danger" = "info",
): string {
  const className = type === "info" ? "info-box" : `info-box info-box-${type}`;
  return `<div class="${className}">${content}</div>`;
}

// ── Invitation Email ──

interface InvitationEmailData {
  inviteId: string;
  name: string;
  email: string;
  role: string;
  position: string;
  acceptanceDeadline?: string;
  message?: string;
  leaderName?: string;
}

export async function sendInvitationEmail(data: InvitationEmailData): Promise<boolean> {
  try {
    const baseUrl = process.env.PUBLIC_SITE_URL || "https://ieeeatucsd.org";
    const acceptLink = `${baseUrl}/accept-invitation/${data.inviteId}`;

    const subject = `You've been elected as ${data.position} for IEEE at UCSD!`;

    const bodyContent = `
      <h2>Congratulations, ${escapeHtml(data.name)}!</h2>
      <p>We are excited to inform you that you have been elected to the IEEE at UCSD general board for the 2025-2026 academic year for the following position:</p>
      
      <div style="background: ${IEEE_COLORS.gray[50]}; border-left: 4px solid ${IEEE_COLORS.primary}; padding: 16px; margin: 20px 0;">
        <div style="font-size: 18px; font-weight: bold; color: ${IEEE_COLORS.primary}; margin-bottom: 4px;">${escapeHtml(data.position)}</div>
        <div style="color: ${IEEE_COLORS.gray[600]};">${escapeHtml(data.role)}</div>
      </div>

      ${data.message ? createInfoBox(`<p style="margin:0">${escapeHtml(data.message)}</p>`, "info") : ""}
      
      <p>Please respond by <strong>${escapeHtml(data.acceptanceDeadline || "the end of the week")}</strong> with your decision on accepting the position.</p>

      ${createInfoBox(
        `<p style="margin:0"><strong>What happens next?</strong><br>If you choose to accept the position, we will begin onboarding as soon as possible to get you up to speed on tasks and give you access to everything you need. There will be a follow-up email detailing your next steps.</p>`,
        "success",
      )}
      
      <p>Please be sure to come to our IEEE Project Space sometime! It's on the 4th floor of Jacobs Hall/EBU1 in EBU1-4710 (Turn left after exiting the elevators and go to the very end; it's the last hallway on your left). We can't wait to see you and support you throughout the year!</p>
      
      ${data.leaderName ? `<p>Your Team Lead will be <strong>${escapeHtml(data.leaderName)}</strong>, who will be working with you throughout the year.</p>` : ""}
      
      <div style="margin-top:20px; text-align:center;">
        <p style="font-size:14px; color:${IEEE_COLORS.gray[500]}">Or copy and paste this link into your browser:<br><a href="${sanitizeUrl(acceptLink)}" style="color:${IEEE_COLORS.primary}; word-break:break-all;">${escapeHtml(acceptLink)}</a></p>
      </div>
    `;

    const html = generateEmailTemplate({
      title: "Invitation to Join IEEE UCSD",
      preheader: `You've been elected as ${data.position}`,
      headerText: "IEEE at UC San Diego",
      bodyContent,
      ctaButton: {
        text: "Accept Position",
        url: acceptLink,
      },
    });

    await sendEmail({
      to: data.email,
      subject,
      html,
    });

    return true;
  } catch (error) {
    console.error("Error sending invitation email:", error);
    return false;
  }
}

// ── Direct Onboarding Email ──

interface DirectOnboardingEmailData {
  name: string;
  email: string;
  role: string;
  position: string;
  leaderName?: string;
  customMessage?: string;
  emailTemplate: string;
}

export async function sendDirectOnboardingEmail(
  data: DirectOnboardingEmailData,
  googleSheetsUrl?: string,
): Promise<boolean> {
  try {
    const subject = `Welcome to IEEE at UCSD - ${data.position} Onboarding`;

    let emailBody = data.emailTemplate;
    emailBody = emailBody.replace(/{NAME}/g, data.name);
    emailBody = emailBody.replace(/{POSITION}/g, data.position);

    const leaderInfo = data.leaderName
      ? `The Vice Chair you'll be working with throughout the year will be ${data.leaderName}.`
      : "";
    emailBody = emailBody.replace(/{LEADER_INFO}/g, leaderInfo);

    const customMsg = data.customMessage ? `\n\n${data.customMessage}\n` : "";
    emailBody = emailBody.replace(/{CUSTOM_MESSAGE}/g, customMsg);

    // Replace Google Sheets URL in template if configured
    if (googleSheetsUrl) {
      emailBody = emailBody.replace(
        /https:\/\/docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9-_]+[^\s)"]*/g,
        googleSheetsUrl,
      );
    }

    const processedBody = emailBody.replace(/\n/g, "<br>");

    const html = generateEmailTemplate({
      title: "Welcome to IEEE at UCSD",
      preheader: `Onboarding instructions for ${data.position}`,
      headerText: "IEEE at UC San Diego",
      bodyContent: `
        <h2>Welcome to IEEE at UCSD!</h2>
        <div style="font-size: 16px; line-height: 1.6;">
          ${processedBody}
        </div>
      `,
    });

    await sendEmail({
      to: data.email,
      subject,
      html,
    });

    return true;
  } catch (error) {
    console.error("Error sending direct onboarding email:", error);
    return false;
  }
}
