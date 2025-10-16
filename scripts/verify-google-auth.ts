/**
 * Diagnostic script to verify Google Workspace authentication setup
 * 
 * Run this script to check if domain-wide delegation is properly configured:
 * bun run scripts/verify-google-auth.ts
 */

import { google } from "googleapis";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function verifyGoogleAuth() {
  console.log("🔍 Verifying Google Workspace Authentication Setup\n");
  console.log("=" .repeat(60));

  // Step 1: Check environment variables
  console.log("\n📋 Step 1: Checking Environment Variables");
  console.log("-".repeat(60));

  const requiredEnvVars = {
    "FIREBASE_PROJECT_ID": process.env.PUBLIC_FIREBASE_PROJECT_ID,
    "FIREBASE_PRIVATE_KEY_ID": process.env.FIREBASE_PRIVATE_KEY_ID,
    "FIREBASE_PRIVATE_KEY": process.env.FIREBASE_PRIVATE_KEY,
    "FIREBASE_CLIENT_EMAIL": process.env.FIREBASE_CLIENT_EMAIL,
    "FIREBASE_CLIENT_ID": process.env.FIREBASE_CLIENT_ID,
    "GOOGLE_ADMIN_EMAIL": process.env.GOOGLE_ADMIN_EMAIL,
  };

  let allEnvVarsPresent = true;
  for (const [key, value] of Object.entries(requiredEnvVars)) {
    const isPresent = !!value;
    const status = isPresent ? "✅" : "❌";
    console.log(`${status} ${key}: ${isPresent ? "Present" : "MISSING"}`);
    
    if (!isPresent) {
      allEnvVarsPresent = false;
    }
  }

  if (!allEnvVarsPresent) {
    console.log("\n❌ ERROR: Missing required environment variables!");
    console.log("Please check your .env file and ensure all variables are set.");
    process.exit(1);
  }

  // Step 2: Display service account details
  console.log("\n📝 Step 2: Service Account Details");
  console.log("-".repeat(60));
  console.log(`Project ID: ${process.env.PUBLIC_FIREBASE_PROJECT_ID}`);
  console.log(`Client Email: ${process.env.FIREBASE_CLIENT_EMAIL}`);
  console.log(`Client ID: ${process.env.FIREBASE_CLIENT_ID}`);
  console.log(`Admin Email (Subject): ${process.env.GOOGLE_ADMIN_EMAIL}`);
  console.log(`Private Key ID: ${process.env.FIREBASE_PRIVATE_KEY_ID}`);
  
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (privateKey) {
    const hasBeginMarker = privateKey.includes("BEGIN PRIVATE KEY");
    const hasEndMarker = privateKey.includes("END PRIVATE KEY");
    console.log(`Private Key Format: ${hasBeginMarker && hasEndMarker ? "✅ Valid" : "❌ Invalid"}`);
  }

  // Step 3: Test authentication
  console.log("\n🔐 Step 3: Testing Google Admin SDK Authentication");
  console.log("-".repeat(60));

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: "service_account",
        project_id: process.env.PUBLIC_FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
      },
      scopes: [
        "https://www.googleapis.com/auth/admin.directory.group",
        "https://www.googleapis.com/auth/admin.directory.group.member",
      ],
      clientOptions: {
        subject: process.env.GOOGLE_ADMIN_EMAIL,
      },
    });

    console.log("✅ GoogleAuth object created successfully");

    // Try to get an access token
    console.log("\n🎫 Step 4: Requesting Access Token");
    console.log("-".repeat(60));
    
    const client = await auth.getClient();
    console.log("✅ Auth client obtained successfully");

    // Try to list groups (this will fail if domain-wide delegation is not set up)
    console.log("\n📋 Step 5: Testing Google Groups API Access");
    console.log("-".repeat(60));
    
    const admin = google.admin({ version: "directory_v1", auth });
    
    try {
      const response = await admin.groups.list({
        customer: "my_customer",
        maxResults: 1,
      });

      console.log("✅ Successfully accessed Google Groups API!");
      console.log(`Found ${response.data.groups?.length || 0} group(s)`);
      
      if (response.data.groups && response.data.groups.length > 0) {
        console.log("\nSample group:");
        const group = response.data.groups[0];
        console.log(`  - Name: ${group.name}`);
        console.log(`  - Email: ${group.email}`);
      }

      console.log("\n" + "=".repeat(60));
      console.log("🎉 SUCCESS! Google Workspace authentication is working!");
      console.log("=".repeat(60));
      console.log("\nYour service account is properly configured with:");
      console.log("✅ Valid credentials");
      console.log("✅ Domain-wide delegation enabled");
      console.log("✅ Correct OAuth scopes authorized");
      console.log("\nYou can now use the onboarding system to add members to Google Groups.");

    } catch (apiError: any) {
      console.log("❌ Failed to access Google Groups API");
      console.log("\nError Details:");
      console.log(`  Code: ${apiError.code}`);
      console.log(`  Message: ${apiError.message}`);
      
      if (apiError.code === 401 || apiError.message?.includes("unauthorized")) {
        console.log("\n" + "=".repeat(60));
        console.log("⚠️  DOMAIN-WIDE DELEGATION NOT CONFIGURED");
        console.log("=".repeat(60));
        console.log("\nThe service account credentials are valid, but domain-wide");
        console.log("delegation is not enabled in Google Workspace Admin Console.");
        console.log("\n📖 Follow these steps to fix:");
        console.log("\n1. Go to: https://admin.google.com");
        console.log("2. Navigate to: Security → Access and data control → API Controls");
        console.log("3. Click: Domain-wide delegation → MANAGE DOMAIN WIDE DELEGATION");
        console.log("4. Click: Add new");
        console.log(`5. Enter Client ID: ${process.env.FIREBASE_CLIENT_ID}`);
        console.log("6. Enter OAuth Scopes:");
        console.log("   https://www.googleapis.com/auth/admin.directory.group,https://www.googleapis.com/auth/admin.directory.group.member");
        console.log("7. Click: Authorize");
        console.log("\n📄 See GOOGLE_WORKSPACE_SETUP.md for detailed instructions.");
      } else if (apiError.message?.includes("subject")) {
        console.log("\n" + "=".repeat(60));
        console.log("⚠️  INVALID ADMIN EMAIL");
        console.log("=".repeat(60));
        console.log(`\nThe admin email '${process.env.GOOGLE_ADMIN_EMAIL}' is not valid.`);
        console.log("\nMake sure:");
        console.log("1. The email exists in your Google Workspace");
        console.log("2. The user has Super Admin privileges");
        console.log("3. The email is in the ieeeatucsd.org domain");
      } else {
        console.log("\n" + "=".repeat(60));
        console.log("⚠️  UNKNOWN ERROR");
        console.log("=".repeat(60));
        console.log("\nAn unexpected error occurred. Check the error details above.");
        console.log("\nCommon issues:");
        console.log("- Google Group doesn't exist");
        console.log("- Service account doesn't have access to the group");
        console.log("- Network connectivity issues");
      }
      
      process.exit(1);
    }

  } catch (authError: any) {
    console.log("❌ Failed to create auth client");
    console.log("\nError Details:");
    console.log(`  Message: ${authError.message}`);
    
    if (authError.message?.includes("private_key")) {
      console.log("\n⚠️  The private key format is invalid.");
      console.log("Make sure the FIREBASE_PRIVATE_KEY in .env includes:");
      console.log("- The full key with BEGIN and END markers");
      console.log("- Newlines escaped as \\n");
      console.log("- The entire value wrapped in quotes");
    }
    
    process.exit(1);
  }
}

// Run the verification
verifyGoogleAuth().catch((error) => {
  console.error("\n❌ Unexpected error:", error);
  process.exit(1);
});

