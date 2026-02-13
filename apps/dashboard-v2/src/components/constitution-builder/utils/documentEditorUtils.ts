import { ConstitutionSection } from "../types";
import { getSectionDisplayTitle } from "./constitutionUtils";

/**
 * Builds a sorted, hierarchical list of sections for document rendering.
 * Top-level sections (preamble, article, amendment) come first sorted by order,
 * with children nested immediately after their parent.
 */
export function buildOrderedSections(
  sections: ConstitutionSection[],
): ConstitutionSection[] {
  const sorted = [...sections].sort((a, b) => a.order - b.order);

  const topLevel = sorted.filter(
    (s) => !s.parentId || !sections.find((p) => p.id === s.parentId),
  );

  const result: ConstitutionSection[] = [];

  const addWithChildren = (section: ConstitutionSection) => {
    result.push(section);
    const children = sorted.filter((s) => s.parentId === section.id);
    for (const child of children) {
      addWithChildren(child);
    }
  };

  for (const section of topLevel) {
    addWithChildren(section);
  }

  return result;
}

/**
 * Converts sections array into an HTML string for the Tiptap editor.
 * Each section heading gets a data-section-id attribute so we can map edits back.
 * Tiptap strips HTML comments, so we use real DOM attributes instead.
 */
export function sectionsToHtml(
  sections: ConstitutionSection[],
  allSections: ConstitutionSection[],
): string {
  const ordered = buildOrderedSections(sections);
  let html = "";

  for (const section of ordered) {
    const displayTitle = getSectionDisplayTitle(section, allSections);
    const headingLevel = getHeadingLevel(section, allSections);

    // Title heading with section ID stored as data attribute
    html += `<h${headingLevel} data-section-id="${section.id}">${escapeHtml(displayTitle)}</h${headingLevel}>`;

    // Content (articles typically have no content)
    if (section.content && section.type !== "article") {
      // If content already contains HTML tags, use it directly; otherwise convert plain text
      const contentHtml = isHtmlContent(section.content)
        ? section.content
        : plainTextToHtml(section.content);
      html += contentHtml;
    }
  }

  return html;
}

/**
 * Parses the editor HTML back into section content updates.
 * Uses heading-order matching: walks headings in the output in the same order
 * as the ordered sections list, extracting content between consecutive headings.
 *
 * Content is saved as HTML to preserve rich text formatting (bold, italic, etc.).
 */
export function htmlToSectionUpdates(
  html: string,
  originalSections: ConstitutionSection[],
): Array<{ sectionId: string; updates: Partial<ConstitutionSection> }> {
  const ordered = buildOrderedSections(originalSections);
  const updates: Array<{
    sectionId: string;
    updates: Partial<ConstitutionSection>;
  }> = [];

  // Split the HTML at heading boundaries to extract content between headings.
  // Each heading corresponds to a section in the ordered list by position.
  // Only content is saved — headings are auto-generated and read-only.
  const headingRegex = /<h[2-6][^>]*>[\s\S]*?<\/h[2-6]>/gi;

  // Find all heading positions
  const headingBounds: Array<{ start: number; end: number }> = [];
  let headingMatch: RegExpExecArray | null;
  while ((headingMatch = headingRegex.exec(html)) !== null) {
    headingBounds.push({
      start: headingMatch.index,
      end: headingMatch.index + headingMatch[0].length,
    });
  }

  // Extract content between consecutive headings
  for (let i = 0; i < Math.min(headingBounds.length, ordered.length); i++) {
    const section = ordered[i];
    const contentStart = headingBounds[i].end;
    const contentEnd = headingBounds[i + 1]?.start ?? html.length;
    const newContentHtml = html.slice(contentStart, contentEnd).trim();

    // Compare content (skip for articles which have no content)
    let contentChanged = false;
    if (section.type !== "article") {
      // Normalize both for comparison
      const originalHtml = isHtmlContent(section.content)
        ? section.content
        : plainTextToHtml(section.content);
      const normalizedNew = normalizeHtml(newContentHtml);
      const normalizedOrig = normalizeHtml(originalHtml);
      contentChanged = normalizedNew !== normalizedOrig;
    }

    if (contentChanged) {
      updates.push({ sectionId: section.id, updates: { content: newContentHtml } });
    }
  }

  return updates;
}

/**
 * Determines the heading level for a section based on its type and nesting.
 */
function getHeadingLevel(
  section: ConstitutionSection,
  allSections: ConstitutionSection[],
): number {
  switch (section.type) {
    case "preamble":
      return 2;
    case "article":
      return 2;
    case "section":
      return 3;
    case "amendment":
      return 2;
    case "subsection": {
      let depth = 4;
      let currentParentId = section.parentId;
      while (currentParentId) {
        const parent = allSections.find((s) => s.id === currentParentId);
        if (parent && parent.type === "subsection") {
          depth = Math.min(depth + 1, 6);
          currentParentId = parent.parentId;
        } else {
          break;
        }
      }
      return depth;
    }
    default:
      return 3;
  }
}

/**
 * Checks if a string contains HTML tags (vs plain text).
 */
export function isHtmlContent(text: string): boolean {
  if (!text) return false;
  return /<[a-z][\s\S]*>/i.test(text);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function plainTextToHtml(text: string): string {
  if (!text) return "";

  // Split by double newlines into paragraphs
  const paragraphs = text.split(/\n\n+/);
  return paragraphs
    .map((p) => {
      const trimmed = p.trim();
      if (!trimmed) return "";
      // Preserve single newlines within paragraphs as <br>
      const withBreaks = escapeHtml(trimmed).replace(/\n/g, "<br>");
      return `<p>${withBreaks}</p>`;
    })
    .filter(Boolean)
    .join("");
}

/**
 * Normalize HTML for comparison: collapse whitespace, trim, lowercase tags.
 */
function normalizeHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/\s+/g, " ")
    .replace(/>\s+</g, "><")
    .trim();
}


