import { useMutation } from "convex/react";
import { api } from '../../../../../../convex/_generated/api';
import { useCurrentUser } from "../../../../hooks/useConvexAuth";

// New event-based file upload function using Convex storage
export const uploadFilesForEvent = async (
  files: File[],
  eventId: string,
  category: string = "general",
): Promise<string[]> => {
  const uploadPromises = files.map(async (file) => {
    try {
      // Convert file to ArrayBuffer, then to Uint8Array for Convex
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Generate a unique filename
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const finalFileName = `${timestamp}_${sanitizedFileName}`;

      // Note: In a real implementation, you would call a Convex mutation here
      // that stores the file and returns a storage ID. For now, we'll return
      // a placeholder URL structure for compatibility.
      // The actual implementation would use:
      // const result = await storageUpload({ file: uint8Array, fileName: finalFileName, fileType: file.type });
      
      return `convex-storage:${eventId}/${category}/${finalFileName}`;
    } catch (error: any) {
      throw new Error(`Upload failed for ${file.name}: ${error.message}`);
    }
  });

  return await Promise.all(uploadPromises);
};

// Helper function to generate event-based storage path
export const generateEventFilePath = (
  eventId: string,
  category: string,
  filename: string,
): string => {
  const timestamp = Date.now();
  const sanitizedFileName = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `${eventId}/${category}/${timestamp}_${sanitizedFileName}`;
};

// Helper function to extract event ID from file path
export const extractEventIdFromPath = (filePath: string): string | null => {
  const match = filePath.match(/^([^\/]+)\//);
  return match ? match[1] : null;
};

// Helper function to extract category from file path
export const extractCategoryFromPath = (filePath: string): string | null => {
  const match = filePath.match(/^[^\/]+\/([^\/]+)\//);
  return match ? match[1] : null;
};

// Function to move files from temporary event ID to actual event ID
export const moveFilesToActualEventId = async (
  tempEventId: string,
  actualEventId: string,
  fileUrls: string[],
): Promise<string[]> => {
  const newUrls: string[] = [];

  for (const url of fileUrls) {
    try {
      // Check if this is a temp file that needs moving
      if (url.includes(tempEventId)) {
        // Create new path with actual event ID
        const newPath = url.replace(
          tempEventId,
          actualEventId,
        );
        newUrls.push(newPath);
      } else {
        // File doesn't need moving
        newUrls.push(url);
      }
    } catch (error) {
      // Keep original URL if moving fails
      newUrls.push(url);
    }
  }

  return newUrls;
};

export const validateFileSize = (
  file: File,
  maxSizeMB: number = 1,
): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};

export const validateFileType = (
  file: File,
  allowedTypes: string[],
): boolean => {
  return allowedTypes.some(
    (type) =>
      file.type.includes(type) || file.name.toLowerCase().endsWith(type),
  );
};

export const getFileExtension = (filename: string): string => {
  return filename.toLowerCase().split(".").pop() || "";
};

/**
 * Extract storage path from Convex storage URL
 * Converts: convex-storage:eventId/category/filename
 * To: eventId/category/filename
 */
export const extractStoragePathFromUrl = (
  downloadUrl: string,
): string | null => {
  try {
    if (downloadUrl.startsWith("convex-storage:")) {
      return downloadUrl.replace("convex-storage:", "");
    }
    return null;
  } catch (error) {
    return null;
  }
};

export const isImageFile = (filename: string): boolean => {
  const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp", "svg"];
  const ext = getFileExtension(filename);
  return imageExtensions.includes(ext);
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// Helper function to determine if a file URL is using the new event-based structure
export const isEventBasedFileUrl = (url: string): boolean => {
  return url.includes("/") && !url.includes("/temp_");
};

// Helper function to determine if a file URL is using the legacy user-based structure
export const isLegacyFileUrl = (url: string): boolean => {
  const legacyPatterns = [
    "/invoices/",
    "/room_bookings/",
    "/logos/",
    "/reimbursements/",
    "/fund_deposits/",
    "/graphics/",
    "/event_files/",
    "/private_files/",
  ];

  return legacyPatterns.some((pattern) => url.includes(pattern));
};

// Helper function to extract file metadata from URL
export const extractFileMetadata = (url: string) => {
  const metadata = {
    isEventBased: isEventBasedFileUrl(url),
    isLegacy: isLegacyFileUrl(url),
    eventId: null as string | null,
    category: null as string | null,
    filename: null as string | null,
    userId: null as string | null,
  };

  try {
    // Extract storage path from URL
    const path = extractStoragePathFromUrl(url);
    if (!path) return metadata;

    const pathParts = path.split("/");

    if (metadata.isEventBased) {
      // events/{eventId}/{category}/{filename}
      if (pathParts.length >= 3) {
        metadata.eventId = pathParts[0];
        metadata.category = pathParts[1];
        metadata.filename = pathParts.slice(2).join("/");
      }
    } else if (metadata.isLegacy) {
      // {category}/{userId}/{filename}
      if (pathParts.length >= 3) {
        metadata.category = pathParts[0];
        metadata.userId = pathParts[1];
        metadata.filename = pathParts.slice(2).join("/");
      }
    }
  } catch (error) {
    // Error extracting file metadata
  }

  return metadata;
};
