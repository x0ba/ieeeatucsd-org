import type { APIRoute } from "astro";
import { Resend } from "resend";
import { getFirestore } from "firebase-admin/firestore";
import { app } from "../../../firebase/server";
import { sendDirectOnboardingEmail } from "../../../scripts/email/OnboardingEmailFunctions";

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();

    const {
      name,
      email,
      role,
      position,
      leaderName,
      customMessage,
      emailTemplate,
      onboardedBy,
    } = data;

    if (!name || !email || !role || !position || !emailTemplate) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const db = getFirestore(app);

    // Initialize Resend
    const resend = new Resend(import.meta.env.RESEND_API_KEY);

    if (!import.meta.env.RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const fromEmail =
      import.meta.env.FROM_EMAIL || "IEEE UCSD <noreply@ieeeatucsd.org>";
    const replyToEmail = import.meta.env.REPLY_TO_EMAIL || "ieee@ucsd.edu";

    // Fetch Google Sheets URL from organization settings
    let googleSheetsUrl = "";
    try {
      const settingsDoc = await db
        .collection("organizationSettings")
        .doc("onboarding")
        .get();
      if (settingsDoc.exists) {
        const settingsData = settingsDoc.data();
        googleSheetsUrl = settingsData?.googleSheetsContactListUrl || "";
      }
    } catch (error) {
      console.error("Error fetching organization settings:", error);
    }

    // Replace Google Sheets URL in email template
    let processedEmailTemplate = emailTemplate;
    if (googleSheetsUrl) {
      // Replace the hardcoded URL with the configured one
      processedEmailTemplate = emailTemplate.replace(
        /https:\/\/docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9-_]+[^\s)"]*/g,
        googleSheetsUrl,
      );
    }

    // Send onboarding email
    const emailSuccess = await sendDirectOnboardingEmail(
      resend,
      fromEmail,
      replyToEmail,
      {
        name,
        email,
        role,
        position,
        leaderName,
        customMessage,
        emailTemplate: processedEmailTemplate,
      },
    );

    if (!emailSuccess) {
      return new Response(
        JSON.stringify({ error: "Failed to send onboarding email" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    // Determine Google Group based on role
    let googleGroup = null;
    if (role === "Executive Officer" || role === "Administrator") {
      googleGroup = "executive-officers@ieeeatucsd.org";
    } else if (role === "General Officer") {
      googleGroup = "general-officers@ieeeatucsd.org";
    } else if (role === "Past Officer") {
      googleGroup = "past-officers@ieeeatucsd.org";
    }

    // Add to Google Group if applicable
    let googleGroupSuccess = false;
    if (googleGroup) {
      try {
        const googleResponse = await fetch(
          `${new URL(request.url).origin}/api/google-groups/add-member`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email,
              googleGroup,
              role,
            }),
          },
        );

        const googleResult = await googleResponse.json();
        googleGroupSuccess = googleResult.success;

        if (!googleGroupSuccess) {
          console.warn(
            `Failed to add ${email} to Google Group: ${googleResult.error}`,
          );
        }
      } catch (googleError) {
        console.error("Error adding to Google Group:", googleError);
      }
    }

    // Create onboarding record in Firestore
    await db.collection("directOnboardings").add({
      name,
      email,
      role,
      position,
      onboardedBy,
      onboardedAt: new Date(),
      emailSent: emailSuccess,
      googleGroupAssigned: googleGroupSuccess,
      googleGroup: googleGroup || null,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Officer onboarded successfully",
        emailSent: emailSuccess,
        googleGroupAssigned: googleGroupSuccess,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in send-direct-onboarding API:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
