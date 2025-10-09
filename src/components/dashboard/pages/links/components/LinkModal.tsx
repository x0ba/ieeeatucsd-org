import React, { useState, useEffect, useMemo } from "react";
import { X, Upload, Trash2, ExternalLink, Plus } from "lucide-react";
import type { Link } from "../../../shared/types/firestore";
import { PRESET_CATEGORIES } from "../utils/linkPermissions";
import { uploadFilesForEvent } from "../../manage-events/utils/fileUploadUtils";
import { Timestamp } from "firebase/firestore";

interface LinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (linkData: {
    url: string;
    title: string;
    category: string;
    description?: string;
    iconUrl?: string;
    shortUrl?: string;
    publishDate?: Timestamp | null;
    expireDate?: Timestamp | null;
  }) => void;
  editingLink: (Link & { id: string }) | null;
  loading?: boolean;
  allLinks?: (Link & { id: string })[]; // All existing links for extracting custom categories
}

export default function LinkModal({
  isOpen,
  onClose,
  onSave,
  editingLink,
  loading = false,
  allLinks = [],
}: LinkModalProps) {
  const [formData, setFormData] = useState({
    url: "",
    title: "",
    category: "General",
    description: "",
    iconUrl: "",
    shortUrl: "",
    publishDate: "",
    expireDate: "",
  });

  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string>("");
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState("");

  // Extract unique custom categories from existing links and merge with presets
  const availableCategories = useMemo(() => {
    // Get all unique categories from existing links
    const existingCategories = new Set(
      allLinks.map((link) => link.category).filter(Boolean)
    );

    // Convert preset categories to a Set for deduplication
    const presetSet = new Set(PRESET_CATEGORIES);

    // Find custom categories (those not in presets)
    const customCategories = Array.from(existingCategories).filter(
      (cat) => !presetSet.has(cat as any)
    );

    // Combine presets with custom categories and sort alphabetically
    const combined = [
      ...PRESET_CATEGORIES,
      ...customCategories.sort((a, b) => a.localeCompare(b)),
    ];

    return combined;
  }, [allLinks]);

  // Helper to convert Timestamp to datetime-local string
  const timestampToDatetimeLocal = (timestamp?: any): string => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Initialize form data when editing
  useEffect(() => {
    if (editingLink) {
      // Check if the category exists in available categories (presets + existing custom)
      const categoryExists = availableCategories.includes(editingLink.category);

      setFormData({
        url: editingLink.url,
        title: editingLink.title,
        category: categoryExists ? editingLink.category : "custom",
        description: editingLink.description || "",
        iconUrl: editingLink.iconUrl || "",
        shortUrl: editingLink.shortUrl || "",
        publishDate: timestampToDatetimeLocal(editingLink.publishDate),
        expireDate: timestampToDatetimeLocal(editingLink.expireDate),
      });
      setIconPreview(editingLink.iconUrl || "");
      setIsCustomCategory(!categoryExists);
      setCustomCategoryInput(categoryExists ? "" : editingLink.category);
    } else {
      setFormData({
        url: "",
        title: "",
        category: "General",
        description: "",
        iconUrl: "",
        shortUrl: "",
        publishDate: "",
        expireDate: "",
      });
      setIconPreview("");
      setIsCustomCategory(false);
      setCustomCategoryInput("");
    }
    setIconFile(null);
    setErrors({});
  }, [editingLink, isOpen, availableCategories]);

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setErrors({ ...errors, icon: "Please select an image file" });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setErrors({ ...errors, icon: "Image must be less than 2MB" });
      return;
    }

    setIconFile(file);
    setErrors({ ...errors, icon: "" });

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setIconPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveIcon = () => {
    setIconFile(null);
    setIconPreview("");
    setFormData({ ...formData, iconUrl: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const newErrors: Record<string, string> = {};

    if (!formData.url.trim()) {
      newErrors.url = "URL is required";
    } else if (!validateUrl(formData.url)) {
      newErrors.url = "Please enter a valid URL";
    }

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }

    // Validate short URL
    if (formData.shortUrl.trim()) {
      const slug = formData.shortUrl.trim().toLowerCase();
      if (!/^[a-z0-9-]+$/.test(slug)) {
        newErrors.shortUrl = "Short URL must contain only lowercase letters, numbers, and hyphens";
      } else if (slug.length < 2) {
        newErrors.shortUrl = "Short URL must be at least 2 characters";
      } else if (slug.length > 50) {
        newErrors.shortUrl = "Short URL must be less than 50 characters";
      } else {
        // Check for uniqueness (only if not editing or if slug changed)
        const existingLinkWithSlug = allLinks.find(link =>
          link.shortUrl === slug && (!editingLink || link.id !== editingLink.id)
        );
        if (existingLinkWithSlug) {
          newErrors.shortUrl = "This short URL is already taken";
        }
      }
    }

    // Validate category
    const finalCategory = isCustomCategory
      ? customCategoryInput.trim()
      : formData.category;

    if (!finalCategory) {
      newErrors.category = isCustomCategory
        ? "Please enter a custom category name"
        : "Category is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      let iconUrl = formData.iconUrl;

      // Upload icon if a new file was selected
      if (iconFile) {
        setUploadingIcon(true);
        const uploadedUrls = await uploadFilesForEvent(
          [iconFile],
          "link-icons",
          "icons"
        );
        iconUrl = uploadedUrls[0];
        setUploadingIcon(false);
      }

      const finalCategory = isCustomCategory
        ? customCategoryInput.trim()
        : formData.category;

      // Build save data, omitting empty optional fields
      const saveData: any = {
        url: formData.url.trim(),
        title: formData.title.trim(),
        category: finalCategory,
      };

      // Only include optional fields if they have values
      const description = formData.description.trim();
      if (description) {
        saveData.description = description;
      }

      const shortUrl = formData.shortUrl.trim();
      if (shortUrl) {
        saveData.shortUrl = shortUrl;
      }

      if (iconUrl) {
        saveData.iconUrl = iconUrl;
      }

      // Convert datetime-local strings to Timestamps or null if cleared
      if (formData.publishDate) {
        saveData.publishDate = Timestamp.fromDate(
          new Date(formData.publishDate)
        );
      } else if (editingLink && editingLink.publishDate) {
        // If editing and the field was cleared, explicitly set to null
        saveData.publishDate = null;
      }

      if (formData.expireDate) {
        saveData.expireDate = Timestamp.fromDate(new Date(formData.expireDate));
      } else if (editingLink && editingLink.expireDate) {
        // If editing and the field was cleared, explicitly set to null
        saveData.expireDate = null;
      }

      onSave(saveData);

      // Reset form
      setFormData({
        url: "",
        title: "",
        category: "General",
        description: "",
        iconUrl: "",
        shortUrl: "",
        publishDate: "",
        expireDate: "",
      });
      setIconFile(null);
      setIconPreview("");
      setIsCustomCategory(false);
      setCustomCategoryInput("");
      setErrors({});
    } catch (error) {
      console.error("Error saving link:", error);
      setErrors({ submit: "Failed to save link. Please try again." });
      setUploadingIcon(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header - Fixed */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">
            {editingLink ? "Edit Link" : "Add New Link"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading || uploadingIcon}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {/* URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.url}
                  onChange={(e) =>
                    setFormData({ ...formData, url: e.target.value })
                  }
                  placeholder="https://example.com"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.url ? "border-red-500" : "border-gray-300"
                    }`}
                  disabled={loading || uploadingIcon}
                />
                {formData.url && validateUrl(formData.url) && (
                  <a
                    href={formData.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-600 hover:text-blue-800"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
              {errors.url && (
                <p className="text-sm text-red-600 mt-1">{errors.url}</p>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Enter link title"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.title ? "border-red-500" : "border-gray-300"
                  }`}
                disabled={loading || uploadingIcon}
              />
              {errors.title && (
                <p className="text-sm text-red-600 mt-1">{errors.title}</p>
              )}
            </div>

            {/* Short URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Short URL (Optional)
              </label>
              <div className="relative">
                <div className="flex">
                  <span className="inline-flex items-center px-3 py-2 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm rounded-l-lg">
                    ieeeatucsd.org/
                  </span>
                  <input
                    type="text"
                    value={formData.shortUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, shortUrl: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })
                    }
                    placeholder="meeting, zoom-link, etc."
                    className={`flex-1 px-3 py-2 border rounded-r-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.shortUrl ? "border-red-500" : "border-gray-300"
                      }`}
                    disabled={loading || uploadingIcon}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Create a custom shortened URL. Only lowercase letters, numbers, and hyphens allowed.
              </p>
              {errors.shortUrl && (
                <p className="text-sm text-red-600 mt-1">{errors.shortUrl}</p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                <select
                  value={isCustomCategory ? "custom" : formData.category}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "custom") {
                      setIsCustomCategory(true);
                      setFormData({ ...formData, category: "" });
                    } else {
                      setIsCustomCategory(false);
                      setCustomCategoryInput("");
                      setFormData({ ...formData, category: value });
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.category ? "border-red-500" : "border-gray-300"
                    }`}
                  disabled={loading || uploadingIcon}
                >
                  {/* Preset Categories */}
                  {PRESET_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}

                  {/* Custom Categories from existing links */}
                  {availableCategories
                    .filter((cat) => !PRESET_CATEGORIES.includes(cat as any))
                    .map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}

                  {/* Option to create new custom category */}
                  <option value="custom">+ Create Custom Category</option>
                </select>

                {isCustomCategory && (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customCategoryInput}
                      onChange={(e) => setCustomCategoryInput(e.target.value)}
                      placeholder="Enter custom category name"
                      className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.category ? "border-red-500" : "border-gray-300"
                        }`}
                      disabled={loading || uploadingIcon}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomCategory(false);
                        setCustomCategoryInput("");
                        setFormData({ ...formData, category: "General" });
                      }}
                      className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      disabled={loading || uploadingIcon}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              {errors.category && (
                <p className="text-sm text-red-600 mt-1">{errors.category}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Brief description of the link"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                disabled={loading || uploadingIcon}
              />
            </div>

            {/* Publish and Expire Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Publish Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Publish Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.publishDate}
                  onChange={(e) =>
                    setFormData({ ...formData, publishDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading || uploadingIcon}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Link will be visible after this date
                </p>
              </div>

              {/* Expire Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expire Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.expireDate}
                  onChange={(e) =>
                    setFormData({ ...formData, expireDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading || uploadingIcon}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Link will be hidden after this date
                </p>
              </div>
            </div>

            {/* Icon/Photo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Icon/Photo (Optional)
              </label>

              {iconPreview ? (
                <div className="flex items-center gap-4">
                  <img
                    src={iconPreview}
                    alt="Icon preview"
                    className="w-20 h-20 rounded-lg object-cover border border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveIcon}
                    className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                    disabled={loading || uploadingIcon}
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleIconChange}
                    className="hidden"
                    id="icon-upload"
                    disabled={loading || uploadingIcon}
                  />
                  <label
                    htmlFor="icon-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">
                      Click to upload an icon
                    </span>
                    <span className="text-xs text-gray-500 mt-1">
                      PNG, JPG up to 2MB
                    </span>
                  </label>
                </div>
              )}
              {errors.icon && (
                <p className="text-sm text-red-600 mt-1">{errors.icon}</p>
              )}
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={loading || uploadingIcon}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || uploadingIcon}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploadingIcon
              ? "Uploading..."
              : loading
                ? "Saving..."
                : editingLink
                  ? "Update Link"
                  : "Add Link"}
          </button>
        </div>
      </div>
    </div>
  );
}

