import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { api } from './_generated/api';

// Queries
export const getAllFundDeposits = query({
  args: {},
  handler: async (ctx) => {
    const deposits = await ctx.db
      .query('fundDeposits')
      .order('desc')
      .collect();

    return deposits;
  },
});

export const getUserFundDeposits = query({
  args: { depositedBy: v.string() },
  handler: async (ctx, args) => {
    const deposits = await ctx.db
      .query('fundDeposits')
      .withIndex('by_user', (q) => q.eq('depositedBy', args.depositedBy))
      .order('desc')
      .collect();

    return deposits;
  },
});

export const getFundDepositById = query({
  args: { id: v.id('fundDeposits') },
  handler: async (ctx, args) => {
    const deposit = await ctx.db.get(args.id);
    return deposit;
  },
});

// Mutations
export const createFundDeposit = mutation({
  args: {
    title: v.string(),
    amount: v.number(),
    depositDate: v.string(),
    depositMethod: v.union(v.literal("other"), v.literal("cash"), v.literal("check"), v.literal("bank_transfer")),
    otherDepositMethod: v.optional(v.string()),
    purpose: v.string(),
    description: v.optional(v.string()),
    referenceNumber: v.optional(v.string()),
    depositedBy: v.string(),
    depositedByName: v.string(),
    depositedByEmail: v.string(),
    receiptFiles: v.optional(v.array(v.string())),
    isIeeeDeposit: v.optional(v.boolean()),
    ieeeDepositSource: v.optional(v.union(v.literal("other"), v.literal("upp"), v.literal("section"), v.literal("region"), v.literal("global"), v.literal("society"))),
    needsBankTransfer: v.optional(v.boolean()),
    bankTransferInstructions: v.optional(v.string()),
    bankTransferFiles: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const depositId = await ctx.db.insert('fundDeposits', {
      title: args.title,
      amount: args.amount,
      depositDate: args.depositDate,
      status: 'pending',
      depositedBy: args.depositedBy,
      depositedByName: args.depositedByName,
      depositedByEmail: args.depositedByEmail,
      depositMethod: args.depositMethod,
      otherDepositMethod: args.otherDepositMethod,
      purpose: args.purpose,
      description: args.description,
      receiptFiles: args.receiptFiles || [],
      referenceNumber: args.referenceNumber,
      submittedAt: Date.now(),
      auditLogs: [
        {
          action: 'submitted',
          createdBy: args.depositedBy,
          createdByName: args.depositedByName,
          timestamp: Date.now(),
          note: 'Deposit submitted for review',
        },
      ],
      isIeeeDeposit: args.isIeeeDeposit,
      ieeeDepositSource: args.ieeeDepositSource,
      needsBankTransfer: args.needsBankTransfer,
      bankTransferInstructions: args.bankTransferInstructions,
      bankTransferFiles: args.bankTransferFiles || [],
    });

    return depositId;
  },
});

export const updateFundDepositStatus = mutation({
  args: {
    id: v.id('fundDeposits'),
    status: v.string(),
    verifiedBy: v.string(),
    verifiedByName: v.string(),
    notes: v.optional(v.string()),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const deposit = await ctx.db.get(args.id);
    if (!deposit) {
      throw new Error('Deposit not found');
    }

    const updateData: any = {
      status: args.status,
      verifiedBy: args.verifiedBy,
      verifiedByName: args.verifiedByName,
      verifiedAt: Date.now(),
    };

    if (args.notes) {
      updateData.notes = args.notes;
    }

    if (args.status === 'rejected' && args.rejectionReason) {
      updateData.rejectionReason = args.rejectionReason;
    }

    // Add audit log
    const newAuditLog = {
      action: args.status,
      createdBy: args.verifiedBy,
      createdByName: args.verifiedByName,
      timestamp: Date.now(),
      note: args.rejectionReason || args.notes || `Status changed to ${args.status}`,
      previousData: { status: deposit.status },
      newData: { status: args.status },
    };

    updateData.auditLogs = [...(deposit.auditLogs || []), newAuditLog];

    await ctx.db.patch(args.id, updateData);

    return { success: true };
  },
});

export const updateFundDeposit = mutation({
  args: {
    id: v.id('fundDeposits'),
    title: v.string(),
    amount: v.number(),
    depositDate: v.string(),
    depositMethod: v.union(v.literal("other"), v.literal("cash"), v.literal("check"), v.literal("bank_transfer")),
    purpose: v.string(),
    description: v.optional(v.string()),
    referenceNumber: v.optional(v.string()),
    receiptFiles: v.array(v.string()),
    editedBy: v.string(),
    editedByName: v.string(),
    isIeeeDeposit: v.optional(v.boolean()),
    ieeeDepositSource: v.optional(v.union(v.literal("other"), v.literal("upp"), v.literal("section"), v.literal("region"), v.literal("global"), v.literal("society"))),
  },
  handler: async (ctx, args) => {
    const deposit = await ctx.db.get(args.id);
    if (!deposit) {
      throw new Error('Deposit not found');
    }

    const updateData: any = {
      title: args.title,
      amount: args.amount,
      depositDate: args.depositDate,
      depositMethod: args.depositMethod,
      purpose: args.purpose,
      description: args.description,
      referenceNumber: args.referenceNumber,
      receiptFiles: args.receiptFiles,
      editedBy: args.editedBy,
      editedByName: args.editedByName,
      editedAt: Date.now(),
      isIeeeDeposit: args.isIeeeDeposit,
      ieeeDepositSource: args.ieeeDepositSource,
    };

    await ctx.db.patch(args.id, updateData);

    return { success: true };
  },
});

export const removeReceiptFile = mutation({
  args: {
    id: v.id('fundDeposits'),
    fileUrl: v.string(),
    removedBy: v.string(),
    removedByName: v.string(),
  },
  handler: async (ctx, args) => {
    const deposit = await ctx.db.get(args.id);
    if (!deposit) {
      throw new Error('Deposit not found');
    }

    const updatedReceiptFiles = (deposit.receiptFiles || []).filter(
      (url: string) => url !== args.fileUrl
    );

    const removedAudit = {
      action: 'receipt_removed',
      createdBy: args.removedBy,
      createdByName: args.removedByName,
      timestamp: Date.now(),
      note: 'Receipt file removed',
    };

    await ctx.db.patch(args.id, {
      receiptFiles: updatedReceiptFiles,
      auditLogs: [...(deposit.auditLogs || []), removedAudit],
    });

    return { success: true };
  },
});

export const deleteFundDeposit = mutation({
  args: { id: v.id('fundDeposits') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});
