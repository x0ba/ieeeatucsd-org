import { firebase, convex } from "./config.js";
import { migrateFileUrl, migrateFileUrls } from "./storage.js";
import { createEmptyResult } from "./utils.js";
import type { MigrationResult, MigrationContext } from "./types.js";

/**
 * Migrate all Firebase Storage files referenced in Convex documents.
 * This runs AFTER all documents have been migrated, updating URLs in-place.
 */
export async function migrateStorageFiles(ctx: MigrationContext): Promise<MigrationResult> {
  const result = createEmptyResult("storage files");

  // 1. Users — resume field
  console.log("  Migrating user resume files...");
  await migrateCollectionField(ctx, "users", "resume", result);

  // 2. Users — avatar field
  console.log("  Migrating user avatar files...");
  await migrateCollectionField(ctx, "users", "avatar", result);

  // 3. Events — files array
  console.log("  Migrating event files...");
  await migrateCollectionArrayField(ctx, "events", "files", result);

  // 4. Event Requests — roomBookingFiles array
  console.log("  Migrating event request room booking files...");
  await migrateCollectionArrayField(ctx, "eventRequests", "roomBookingFiles", result);

  // 5. Reimbursements — receipts[].receiptFile and paymentDetails.proofFileUrl
  console.log("  Migrating reimbursement files...");
  await migrateReimbursementFiles(ctx, result);

  // 6. Fund Deposits — receiptUrl and receiptFiles
  console.log("  Migrating fund deposit files...");
  await migrateCollectionField(ctx, "fundDeposits", "receiptUrl", result);
  await migrateCollectionArrayField(ctx, "fundDeposits", "receiptFiles", result);

  return result;
}

async function migrateCollectionField(
  ctx: MigrationContext,
  table: string,
  field: string,
  result: MigrationResult,
): Promise<void> {
  // We need to query all documents from the Convex table
  // Since we can't directly query all docs via ConvexHttpClient without a query function,
  // we'll use the Firebase data to find which documents have file URLs and update them

  // For users, iterate through the user map
  if (table === "users") {
    for (const [firebaseUid, mapping] of ctx.userMap) {
      try {
        // Read the Firebase doc to get the file URL
        const fbDoc = await firebase.db.collection("users").doc(firebaseUid).get();
        if (!fbDoc.exists) continue;

        const data = fbDoc.data();
        if (!data || !data[field]) continue;

        const url = data[field];
        if (typeof url !== "string" || !url.includes("firebasestorage")) continue;

        const newUrl = await migrateFileUrl(url, ctx.dryRun);
        if (newUrl && newUrl !== url) {
          if (!ctx.dryRun) {
            await (convex as any).mutation("migrations:updateDocumentField" as any, {
              table,
              docId: mapping.convexId,
              field,
              value: newUrl,
            });
          }
          result.inserted++;
        } else {
          result.skipped++;
        }
      } catch (error) {
        result.failed++;
        result.errors.push({
          id: `${table}/${firebaseUid}/${field}`,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return;
  }

  // For events, iterate through the event map
  if (table === "events") {
    for (const [firebaseId, mapping] of ctx.eventMap) {
      try {
        const fbDoc = await firebase.db.collection("events").doc(firebaseId).get();
        if (!fbDoc.exists) continue;

        const data = fbDoc.data();
        if (!data || !data[field]) continue;

        const url = data[field];
        if (typeof url !== "string" || !url.includes("firebasestorage")) continue;

        const newUrl = await migrateFileUrl(url, ctx.dryRun);
        if (newUrl && newUrl !== url) {
          if (!ctx.dryRun) {
            await (convex as any).mutation("migrations:updateDocumentField" as any, {
              table,
              docId: mapping.convexId,
              field,
              value: newUrl,
            });
          }
          result.inserted++;
        } else {
          result.skipped++;
        }
      } catch (error) {
        result.failed++;
        result.errors.push({
          id: `${table}/${firebaseId}/${field}`,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return;
  }

  // For other tables, read from Firebase and use the field-level update
  const fbCollection = table === "eventRequests" ? "event_requests" : table;
  const snapshot = await firebase.db.collection(fbCollection).get();

  for (const doc of snapshot.docs) {
    try {
      const data = doc.data();
      if (!data || !data[field]) continue;

      const url = data[field];
      if (typeof url !== "string" || !url.includes("firebasestorage")) continue;

      // We need to find the corresponding Convex doc — for now, skip if we can't map
      console.log(`    ⚠️  Skipping ${table}/${doc.id}/${field} — no direct mapping available`);
      result.skipped++;
    } catch (error) {
      result.failed++;
      result.errors.push({
        id: `${table}/${doc.id}/${field}`,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

async function migrateCollectionArrayField(
  ctx: MigrationContext,
  table: string,
  field: string,
  result: MigrationResult,
): Promise<void> {
  if (table === "events") {
    for (const [firebaseId, mapping] of ctx.eventMap) {
      try {
        const fbDoc = await firebase.db.collection("events").doc(firebaseId).get();
        if (!fbDoc.exists) continue;

        const data = fbDoc.data();
        if (!data || !Array.isArray(data[field]) || data[field].length === 0) continue;

        const urls = data[field] as string[];
        const hasFirebaseUrls = urls.some((u) => u.includes("firebasestorage"));
        if (!hasFirebaseUrls) {
          result.skipped++;
          continue;
        }

        const newUrls = await migrateFileUrls(urls, ctx.dryRun);
        if (!ctx.dryRun && JSON.stringify(newUrls) !== JSON.stringify(urls)) {
          await (convex as any).mutation("migrations:updateDocumentField" as any, {
            table,
            docId: mapping.convexId,
            field,
            value: newUrls,
          });
          result.inserted++;
        } else {
          result.skipped++;
        }
      } catch (error) {
        result.failed++;
        result.errors.push({
          id: `${table}/${firebaseId}/${field}`,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return;
  }

  // Generic fallback — log skipped
  const fbCollection = table === "eventRequests" ? "event_requests" : table;
  const snapshot = await firebase.db.collection(fbCollection).get();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data && Array.isArray(data[field]) && data[field].length > 0) {
      const hasFirebaseUrls = data[field].some((u: string) => typeof u === "string" && u.includes("firebasestorage"));
      if (hasFirebaseUrls) {
        console.log(`    ⚠️  Skipping ${table}/${doc.id}/${field} array — no direct mapping`);
        result.skipped++;
      }
    }
  }
}

async function migrateReimbursementFiles(
  ctx: MigrationContext,
  result: MigrationResult,
): Promise<void> {
  // Reimbursement files are nested in receipts[].receiptFile and paymentDetails.proofFileUrl
  // Since we don't have a direct Firebase→Convex ID mapping for reimbursements,
  // we log what needs manual attention
  const snapshot = await firebase.db.collection("reimbursements").get();

  let fileCount = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();

    // Check receipts
    if (Array.isArray(data.receipts)) {
      for (const r of data.receipts) {
        if (r.receiptFile && typeof r.receiptFile === "string" && r.receiptFile.includes("firebasestorage")) {
          fileCount++;
        }
      }
    }

    // Check payment proof
    if (data.paymentDetails?.proofFileUrl && data.paymentDetails.proofFileUrl.includes("firebasestorage")) {
      fileCount++;
    }
  }

  if (fileCount > 0) {
    console.log(`    ℹ️  Found ${fileCount} reimbursement files that reference Firebase Storage`);
    console.log(`    ℹ️  These are embedded in receipt/payment objects and will be migrated with the documents`);
    result.skipped += fileCount;
  }
}
