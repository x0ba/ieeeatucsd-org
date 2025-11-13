/**
 * HEIC to JPG Conversion Utility
 * 
 * Provides functionality to convert HEIC image files to JPG format.
 * Used across file upload components for event requests, reimbursement receipts,
 * and fund deposits to ensure browser compatibility.
 */

import heicConvert from 'heic-convert';

/**
 * Checks if a file is in HEIC format based on extension and MIME type
 * 
 * @param file - The file to check
 * @returns true if the file is HEIC format, false otherwise
 */
export function isHeicFile(file: File): boolean {
  const fileName = file.name.toLowerCase();
  const hasHeicExtension = fileName.endsWith('.heic') || fileName.endsWith('.heif');
  const hasHeicMimeType = file.type === 'image/heic' || file.type === 'image/heif';
  
  return hasHeicExtension || hasHeicMimeType;
}

/**
 * Converts a HEIC file to JPG format
 * 
 * @param file - The HEIC file to convert
 * @returns Promise resolving to a new File object in JPG format
 * @throws Error if the conversion fails or if the input is not a HEIC file
 * 
 * @example
 * ```typescript
 * const jpgFile = await convertHeicToJpg(heicFile);
 * // Use jpgFile for upload or further processing
 * ```
 */
export async function convertHeicToJpg(file: File): Promise<File> {
  // Validate input is HEIC format
  if (!isHeicFile(file)) {
    throw new Error(`File "${file.name}" is not a HEIC/HEIF format file`);
  }

  try {
    // Read the file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Convert HEIC to JPG with high quality
    const jpegBuffer = await heicConvert({
      buffer,
      format: 'JPEG',
      quality: 0.9, // 90% quality for optimal balance
    });

    // Generate new filename with .jpg extension
    const originalName = file.name.replace(/\.(heic|heif)$/i, '');
    const jpgFileName = `${originalName}.jpg`;

    // Create new File object with JPG data
    const jpgFile = new File(
      [jpegBuffer],
      jpgFileName,
      {
        type: 'image/jpeg',
        lastModified: file.lastModified,
      }
    );

    return jpgFile;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to convert HEIC file "${file.name}" to JPG: ${errorMessage}`);
  }
}

/**
 * Converts a HEIC file to JPG if needed, otherwise returns the original file
 * 
 * Useful wrapper for file upload handlers that should automatically convert
 * HEIC files but pass through other formats unchanged.
 * 
 * @param file - The file to potentially convert
 * @returns Promise resolving to either the converted JPG or original file
 * 
 * @example
 * ```typescript
 * const processedFile = await convertHeicIfNeeded(uploadedFile);
 * // processedFile is JPG if input was HEIC, otherwise unchanged
 * ```
 */
export async function convertHeicIfNeeded(file: File): Promise<File> {
  if (isHeicFile(file)) {
    return convertHeicToJpg(file);
  }
  return file;
}