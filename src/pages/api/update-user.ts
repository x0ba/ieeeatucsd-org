import type { APIRoute } from "astro";
import { getFirestore } from "firebase-admin/firestore";
import { app, adminAuth } from "../../firebase/server";

const db = getFirestore(app);

export const POST: APIRoute = async ({ request }) => {
  try {
    console.log("User update request received");

    const requestBody = await request.json();
    const {
      userId,
      name,
      role,
      position,
      status,
      pid,
      memberId,
      major,
      graduationYear,
      team,
      points,
      adminUserId,
    } = requestBody;

    console.log("Request body:", {
      userId,
      name,
      role,
      position,
      team,
      adminUserId,
    });

    // Validate required parameters
    if (!userId || !adminUserId) {
      console.log("Missing required parameters");
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing required parameters (userId, adminUserId)",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Verify admin user has permission to update users
    const adminUserRef = db.collection("users").doc(adminUserId);
    const adminUserDoc = await adminUserRef.get();

    if (!adminUserDoc.exists) {
      console.log("Admin user not found");
      return new Response(
        JSON.stringify({
          success: false,
          message: "Admin user not found",
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const adminUserData = adminUserDoc.data();
    const adminRole = adminUserData?.role;

    // Check if admin has permission to update users
    const allowedRoles = ["Administrator", "Executive Officer", "General Officer"];
    if (!allowedRoles.includes(adminRole)) {
      console.log("Insufficient permissions");
      return new Response(
        JSON.stringify({
          success: false,
          message: "Insufficient permissions to update users",
        }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Get the user to update
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.log("User not found");
      return new Response(
        JSON.stringify({
          success: false,
          message: "User not found",
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Build update data
    const updateData: any = {
      lastUpdated: new Date(),
      lastUpdatedBy: adminUserId,
    };

    // Add fields if provided
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;
    if (position !== undefined) updateData.position = position || "";
    if (status !== undefined) updateData.status = status;
    if (pid !== undefined) updateData.pid = pid || "";
    if (memberId !== undefined) updateData.memberId = memberId || "";
    if (major !== undefined) updateData.major = major || "";
    if (graduationYear !== undefined) updateData.graduationYear = graduationYear || null;
    if (team !== undefined) updateData.team = team || null;

    // Only administrators can modify points
    if (adminRole === "Administrator" && points !== undefined) {
      updateData.points = points;
    }

    console.log("Updating user with data:", updateData);

    // Update user document
    await userRef.update(updateData);

    // Update custom claims if role changed
    if (role !== undefined && role !== userDoc.data()?.role) {
      try {
        await adminAuth.setCustomUserClaims(userId, {
          role: role,
        });
        console.log(`✅ Updated custom claims for ${userId}: role=${role}`);
      } catch (claimsError) {
        console.error("Error updating custom claims:", claimsError);
        // Continue even if custom claims fail - Firestore role will still work
      }
    }

    console.log(`✅ Successfully updated user ${userId}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "User updated successfully",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in update-user:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : "An error occurred",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};

