import { firebase, convex } from "./config.js";
import { toEpochMs, createEmptyResult } from "./utils.js";
import type { MigrationResult, MigrationContext } from "./types.js";

export async function migrateReimbursements(ctx: MigrationContext): Promise<MigrationResult> {
  const result = createEmptyResult("reimbursements");

  const snapshot = await firebase.db.collection("reimbursements").get();
  console.log(`  Found ${snapshot.size} reimbursements in Firebase`);

  for (const doc of snapshot.docs) {
    try {
      const data = doc.data();

      const firebaseUserId = data.submittedBy || "";
      const userMapping = ctx.userMap.get(firebaseUserId);
      const submittedBy = userMapping?.logtoId || userMapping?.firebaseUid || firebaseUserId;

      const validStatuses = ["submitted", "declined", "approved", "paid"];
      const status = validStatuses.includes(data.status) ? data.status : "submitted";

      const validDepts = ["internal", "external", "projects", "events", "other"];
      const department = validDepts.includes(data.department) ? data.department : "other";

      const convexData: Record<string, unknown> = {
        title: data.title || "Untitled Reimbursement",
        totalAmount: data.totalAmount || 0,
        paymentMethod: data.paymentMethod || "other",
        status,
        submittedBy,
        additionalInfo: data.additionalInfo || "",
        department,
        dateOfPurchase: data.dateOfPurchase ? toEpochMs(data.dateOfPurchase) : undefined,
        requiresExecutiveOverride: data.requiresExecutiveOverride || undefined,
      };

      if (Array.isArray(data.auditNotes)) {
        convexData.auditNotes = data.auditNotes.map((n: any) => ({
          note: n.note || "",
          createdBy: n.createdBy || "",
          timestamp: n.timestamp ? toEpochMs(n.timestamp) : Date.now(),
        }));
      }

      if (Array.isArray(data.auditLogs)) {
        convexData.auditLogs = data.auditLogs.map((l: any) => ({
          action: l.action || "",
          createdBy: l.createdBy || "",
          timestamp: l.timestamp ? toEpochMs(l.timestamp) : Date.now(),
        }));
      }

      if (Array.isArray(data.auditRequests)) {
        convexData.auditRequests = data.auditRequests.map((r: any) => ({
          auditorId: r.auditorId || "",
          requestedBy: r.requestedBy || "",
          requestedAt: r.requestedAt ? toEpochMs(r.requestedAt) : Date.now(),
          status: ["pending", "completed", "declined"].includes(r.status) ? r.status : "pending",
          auditResult: r.auditResult || undefined,
          auditNotes: r.auditNotes || undefined,
          completedAt: r.completedAt ? toEpochMs(r.completedAt) : undefined,
        }));
      }

      if (data.paymentDetails) {
        convexData.paymentDetails = {
          confirmationNumber: data.paymentDetails.confirmationNumber || "",
          paymentDate: data.paymentDetails.paymentDate ? toEpochMs(data.paymentDetails.paymentDate) : Date.now(),
          amountPaid: data.paymentDetails.amountPaid || 0,
          proofFileUrl: data.paymentDetails.proofFileUrl || undefined,
          memo: data.paymentDetails.memo || undefined,
        };
      }

      if (Array.isArray(data.receipts)) {
        convexData.receipts = data.receipts.map((r: any) => ({
          id: r.id || crypto.randomUUID(),
          vendorName: r.vendorName || "",
          location: r.location || "",
          dateOfPurchase: r.dateOfPurchase ? toEpochMs(r.dateOfPurchase) : Date.now(),
          lineItems: Array.isArray(r.lineItems)
            ? r.lineItems.map((li: any) => ({
                id: li.id || crypto.randomUUID(),
                description: li.description || "",
                category: li.category || "",
                amount: li.amount || 0,
              }))
            : [],
          receiptFile: typeof r.receiptFile === "string"
            ? r.receiptFile
            : r.receiptFile?.url || undefined,
          notes: r.notes || undefined,
          subtotal: r.subtotal || 0,
          tax: r.tax || undefined,
          tip: r.tip || undefined,
          shipping: r.shipping || undefined,
          total: r.total || 0,
        }));
      }

      // Remove undefined values
      for (const key of Object.keys(convexData)) {
        if (convexData[key] === undefined) delete convexData[key];
      }

      if (ctx.dryRun) {
        console.log(`    [DRY RUN] Would upsert reimbursement: ${data.title}`);
        result.skipped++;
      } else {
        const upsertResult = await (convex as any).mutation(
          "migrations:upsertReimbursement" as any,
          { dedupKey: `${data.title}:${submittedBy}:${data.totalAmount}`, data: convexData },
        );
        if (upsertResult.action === "inserted") result.inserted++;
        else result.updated++;
      }
    } catch (error) {
      result.failed++;
      result.errors.push({
        id: doc.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return result;
}
