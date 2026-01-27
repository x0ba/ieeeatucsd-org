import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

// Upload a file to Convex storage (action, not mutation - for file uploads)
export const uploadFile = action({
  args: {
    file: v.bytes(), // File content as bytes
    fileName: v.string(),
    fileType: v.string(),
  },
  handler: async (ctx, { file, fileName, fileType }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.subject) {
      throw new Error("Not authenticated");
    }

    // Convert ArrayBuffer to Blob for Convex storage
    const blob = new Blob([file], { type: fileType || "application/octet-stream" });
    const storageId = await ctx.storage.store(blob);

    // Return the storage ID that can be used to reference the file
    return { storageId };
  },
});

// Get a file URL from storage ID
export const getFileUrl = query({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { storageId }) => {
    return await ctx.storage.getUrl(storageId);
  },
});

// Upload multiple files (for bulk operations)
export const uploadMultipleFiles = action({
  args: {
    files: v.array(
      v.object({
        file: v.bytes(),
        fileName: v.string(),
        fileType: v.string(),
      }),
    ),
  },
  handler: async (ctx, { files }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.subject) {
      throw new Error("Not authenticated");
    }

    // Upload all files and return their storage IDs
    const uploadPromises = files.map(async ({ file, fileType }) => {
      const blob = new Blob([file], { type: fileType || "application/octet-stream" });
      const storageId = await ctx.storage.store(blob);
      return storageId;
    });

    const storageIds = await Promise.all(uploadPromises);
    return { storageIds };
  },
});

// Upload a single file with path (alias for uploadFile with path parameter)
// Used by FundRequestFormModal for uploading files with custom paths
export const uploadFiles = action({
  args: {
    file: v.bytes(),
    path: v.string(),
  },
  handler: async (ctx, { file, path }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.subject) {
      throw new Error("Not authenticated");
    }

    // Convert ArrayBuffer to Blob for Convex storage
    const blob = new Blob([file], { type: "application/octet-stream" });
    const storageId = await ctx.storage.store(blob);

    // Return the storage ID and URL
    const url = await ctx.storage.getUrl(storageId);
    return { storageId, url };
  },
});

// Delete a file from storage (server-side only, requires admin)
export const deleteFile = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { storageId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.subject) {
      throw new Error("Not authenticated");
    }

    // Check if user has admin privileges
    const user = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", identity.subject))
      .first();

    if (!user || (user.role !== "Administrator" && user.role !== "Executive Officer")) {
      throw new Error("Insufficient permissions");
    }

    // Delete the file from storage
    await ctx.storage.delete(storageId);
    return { success: true };
  },
});
