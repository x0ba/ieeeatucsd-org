import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

// Queries
export const getAllFundRequests = query({
  args: {},
  handler: async (ctx) => {
    const requests = await ctx.db
      .query('fundRequests')
      .order('desc')
      .collect();

    return requests;
  },
});

export const getUserFundRequests = query({
  args: { submittedBy: v.string() },
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query('fundRequests')
      .withIndex('by_submittedBy', (q) => q.eq('submittedBy', args.submittedBy))
      .order('desc')
      .collect();

    return requests;
  },
});

export const list = query({
  args: { 
    department: v.optional(
      v.union(v.literal('events'), v.literal('projects'), v.literal('internal'), v.literal('other'))
    ),
  },
  handler: async (ctx, args) => {
    const requests = await (args.department
      ? ctx.db.query('fundRequests').withIndex('by_department', (q) => q.eq('department', args.department))
      : ctx.db.query('fundRequests')
    ).order('desc').collect();
    
    return requests;
  },
});

export const getFundRequestById = query({
  args: { id: v.id('fundRequests') },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.id);
    return request;
  },
});

export const getSubmittedRequests = query({
  args: {
    department: v.optional(
      v.union(v.literal('events'), v.literal('projects'), v.literal('internal'), v.literal('other'))
    ),
  },
  handler: async (ctx, args) => {
    // Query for non-draft requests (submitted, needs_info, approved, denied, completed)
    const requests = await (args.department
      ? ctx.db.query('fundRequests').withIndex('by_department', (q) =>
          q.eq('department', args.department)
        )
      : ctx.db.query('fundRequests')
    ).filter((q) => q.neq(q.field('status'), 'draft'))
    .order('desc').collect();
    
    return requests;
  },
});

export const getBudgetConfig = query({
  args: { department: v.union(v.literal('events'), v.literal('projects'), v.literal('internal'), v.literal('other')) },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query('budgetConfig')
      .withIndex('by_department', (q) => q.eq('department', args.department))
      .first();

    return config;
  },
});

export const getBudgetAdjustments = query({
  args: { department: v.union(v.literal('events'), v.literal('projects'), v.literal('internal'), v.literal('other')) },
  handler: async (ctx, args) => {
    const adjustments = await ctx.db
      .query('budgetAdjustments')
      .withIndex('by_department', (q) => q.eq('department', args.department))
      .order('desc')
      .collect();

    return adjustments;
  },
});

export const getBudgetConfigs = query({
  args: {},
  handler: async (ctx) => {
    const configs = await ctx.db.query('budgetConfig').collect();
    
    const result: Record<string, any> = {};
    for (const config of configs) {
      result[config.department] = config;
    }
    return result;
  },
});

// Mutations
export const createFundRequest = mutation({
  args: {
    title: v.string(),
    purpose: v.string(),
    category: v.union(
      v.literal('event'),
      v.literal('travel'),
      v.literal('equipment'),
      v.literal('software'),
      v.literal('other'),
    ),
    department: v.optional(
      v.union(
        v.literal('events'),
        v.literal('projects'),
        v.literal('internal'),
        v.literal('other'),
      ),
    ),
    amount: v.number(),
    vendorLinks: v.array(
      v.object({
        id: v.string(),
        url: v.string(),
        itemName: v.optional(v.string()),
        quantity: v.optional(v.number()),
        label: v.optional(v.string()),
      }),
    ),
    attachments: v.array(
      v.object({
        id: v.string(),
        url: v.string(),
        name: v.string(),
        size: v.number(),
        type: v.string(),
        uploadedAt: v.number(),
      }),
    ),
    fundingSourcePreference: v.optional(v.union(v.literal('department'), v.literal('ieee'))),
    submittedBy: v.string(),
    submittedByName: v.string(),
    submittedByEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const requestId = await ctx.db.insert('fundRequests', {
      title: args.title,
      purpose: args.purpose,
      category: args.category,
      department: args.department,
      amount: args.amount,
      vendorLinks: args.vendorLinks,
      attachments: args.attachments,
      status: 'draft',
      fundingSourcePreference: args.fundingSourcePreference,
      submittedBy: args.submittedBy,
      submittedByName: args.submittedByName,
      submittedByEmail: args.submittedByEmail,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      auditLogs: [
        {
          id: crypto.randomUUID(),
          action: 'created',
          performedBy: args.submittedBy,
          performedByName: args.submittedByName,
          timestamp: Date.now(),
        },
      ],
    });

    return requestId;
  },
});

export const updateFundRequest = mutation({
  args: {
    id: v.id('fundRequests'),
    title: v.string(),
    purpose: v.string(),
    category: v.union(
      v.literal('event'),
      v.literal('travel'),
      v.literal('equipment'),
      v.literal('software'),
      v.literal('other'),
    ),
    department: v.optional(
      v.union(
        v.literal('events'),
        v.literal('projects'),
        v.literal('internal'),
        v.literal('other'),
      ),
    ),
    amount: v.number(),
    vendorLinks: v.array(
      v.object({
        id: v.string(),
        url: v.string(),
        itemName: v.optional(v.string()),
        quantity: v.optional(v.number()),
        label: v.optional(v.string()),
      }),
    ),
    attachments: v.array(
      v.object({
        id: v.string(),
        url: v.string(),
        name: v.string(),
        size: v.number(),
        type: v.string(),
        uploadedAt: v.number(),
      }),
    ),
    fundingSourcePreference: v.optional(v.union(v.literal('department'), v.literal('ieee'))),
    infoResponseNotes: v.optional(v.string()),
    updatedBy: v.string(),
    updatedByName: v.string(),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.id);
    if (!request) {
      throw new Error('Fund request not found');
    }

    const updateData: any = {
      title: args.title,
      purpose: args.purpose,
      category: args.category,
      department: args.department,
      amount: args.amount,
      vendorLinks: args.vendorLinks,
      attachments: args.attachments,
      fundingSourcePreference: args.fundingSourcePreference,
      updatedAt: Date.now(),
      auditLogs: [
        ...request.auditLogs,
        {
          id: crypto.randomUUID(),
          action: 'updated',
          performedBy: args.updatedBy,
          performedByName: args.updatedByName,
          timestamp: Date.now(),
        },
      ],
    };

    if (args.infoResponseNotes) {
      updateData.infoResponseNotes = args.infoResponseNotes;
    }

    await ctx.db.patch(args.id, updateData);

    return { success: true };
  },
});

export const submitFundRequest = mutation({
  args: {
    id: v.id('fundRequests'),
    submittedBy: v.string(),
    submittedByName: v.string(),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.id);
    if (!request) {
      throw new Error('Fund request not found');
    }

    await ctx.db.patch(args.id, {
      status: 'submitted',
      submittedAt: Date.now(),
      updatedAt: Date.now(),
      auditLogs: [
        ...request.auditLogs,
        {
          id: crypto.randomUUID(),
          action: 'submitted',
          performedBy: args.submittedBy,
          performedByName: args.submittedByName,
          timestamp: Date.now(),
          previousStatus: request.status,
          newStatus: 'submitted',
        },
      ],
    });

    return { success: true };
  },
});

export const updateFundRequestStatus = mutation({
  args: {
    id: v.id('fundRequests'),
    status: v.union(
      v.literal('submitted'),
      v.literal('needs_info'),
      v.literal('approved'),
      v.literal('denied'),
      v.literal('completed'),
    ),
    reviewedBy: v.string(),
    reviewedByName: v.string(),
    reviewNotes: v.optional(v.string()),
    infoRequestNotes: v.optional(v.string()),
    selectedFundingSource: v.optional(v.union(v.literal('department'), v.literal('ieee'))),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.id);
    if (!request) {
      throw new Error('Fund request not found');
    }

    const updateData: any = {
      status: args.status,
      reviewedBy: args.reviewedBy,
      reviewedByName: args.reviewedByName,
      reviewedAt: Date.now(),
      updatedAt: Date.now(),
      auditLogs: [
        ...request.auditLogs,
        {
          id: crypto.randomUUID(),
          action: args.status === 'needs_info'
            ? 'info_requested'
            : args.status === 'approved'
              ? 'approved'
              : args.status === 'denied'
                ? 'denied'
                : 'completed',
          performedBy: args.reviewedBy,
          performedByName: args.reviewedByName,
          timestamp: Date.now(),
          previousStatus: request.status,
          newStatus: args.status,
          notes: args.reviewNotes || args.infoRequestNotes,
        },
      ],
    };

    if (args.reviewNotes) {
      updateData.reviewNotes = args.reviewNotes;
    }

    if (args.infoRequestNotes) {
      updateData.infoRequestNotes = args.infoRequestNotes;
    }

    if (args.selectedFundingSource) {
      updateData.selectedFundingSource = args.selectedFundingSource;
    }

    if (args.status === 'completed') {
      updateData.completedAt = Date.now();
      updateData.completedBy = args.reviewedBy;
    }

    await ctx.db.patch(args.id, updateData);

    return { success: true };
  },
});

export const deleteFundRequest = mutation({
  args: { id: v.id('fundRequests') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

export const upsertBudgetConfig = mutation({
  args: {
    department: v.union(v.literal('events'), v.literal('projects'), v.literal('internal'), v.literal('other')),
    totalBudget: v.number(),
    startDate: v.number(),
    updatedBy: v.string(),
    updatedByName: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('budgetConfig')
      .withIndex('by_department', (q) => q.eq('department', args.department))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        totalBudget: args.totalBudget,
        startDate: args.startDate,
        updatedAt: Date.now(),
        updatedBy: args.updatedBy,
        updatedByName: args.updatedByName,
      });
    } else {
      await ctx.db.insert('budgetConfig', {
        department: args.department,
        totalBudget: args.totalBudget,
        startDate: args.startDate,
        updatedAt: Date.now(),
        updatedBy: args.updatedBy,
        updatedByName: args.updatedByName,
      });
    }

    return { success: true };
  },
});

export const createBudgetAdjustment = mutation({
  args: {
    department: v.union(v.literal('events'), v.literal('projects'), v.literal('internal'), v.literal('other')),
    amount: v.number(),
    description: v.string(),
    createdBy: v.string(),
    createdByName: v.string(),
  },
  handler: async (ctx, args) => {
    const adjustmentId = await ctx.db.insert('budgetAdjustments', {
      department: args.department,
      amount: args.amount,
      description: args.description,
      createdAt: Date.now(),
      createdBy: args.createdBy,
      createdByName: args.createdByName,
    });

    return adjustmentId;
  },
});

export const deleteBudgetAdjustment = mutation({
  args: { id: v.id('budgetAdjustments') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});
