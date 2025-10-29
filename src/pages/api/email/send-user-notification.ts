import type { APIRoute } from "astro";
import { Resend } from "resend";
import {
  sendUserProfileUpdateEmail,
  sendUserRoleChangeEmail,
} from "../../../scripts/email/UserEmailFunctions";

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const { type } = data;

    const resendApiKey = import.meta.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "Resend API key not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const resend = new Resend(resendApiKey);
    const fromEmail =
      "IEEE at UC San Diego <noreply@transactional.ieeeatucsd.org>";
    const replyToEmail = "ieee@ucsd.edu";

    let success = false;

    switch (type) {
      case "profile_update":
        const { userId, changes, changedByUserId } = data;
        if (!userId || !changes || !changedByUserId) {
          return new Response(
            JSON.stringify({
              error: "Missing required data for profile update notification",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }
        success = await sendUserProfileUpdateEmail(
          resend,
          fromEmail,
          replyToEmail,
          {
            userId,
            changes,
            changedByUserId,
          },
        );
        break;

      case "role_change":
        const {
          userId: roleUserId,
          oldRole,
          newRole,
          changedByUserId: roleChangedBy,
        } = data;
        if (!roleUserId || !oldRole || !newRole || !roleChangedBy) {
          return new Response(
            JSON.stringify({
              error: "Missing required data for role change notification",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }
        success = await sendUserRoleChangeEmail(
          resend,
          fromEmail,
          replyToEmail,
          {
            userId: roleUserId,
            oldRole,
            newRole,
            changedByUserId: roleChangedBy,
          },
        );
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Unknown notification type: ${type}` }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
    }

    return new Response(
      JSON.stringify({
        success,
        message: success
          ? "User email notification sent successfully"
          : "Failed to send user email notification",
      }),
      {
        status: success ? 200 : 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
