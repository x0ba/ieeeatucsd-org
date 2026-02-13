import React, { useState, useEffect, useCallback, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo2,
  Redo2,
  Save,
  RotateCcw,
  Type,
  Minus,
} from "lucide-react";
import { ConstitutionSection } from "./types";
import { Button } from "@/components/ui/button";
import {
  sectionsToHtml,
  htmlToSectionUpdates,
} from "./utils/documentEditorUtils";

interface ConstitutionDocumentEditorProps {
  sections: ConstitutionSection[];
  onUpdateSection: (
    id: string,
    updates: Partial<ConstitutionSection>,
  ) => void;
}

const ConstitutionDocumentEditor: React.FC<ConstitutionDocumentEditorProps> = ({
  sections,
  onUpdateSection,
}) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  // Counter that increments on every editor transaction to force toolbar re-renders
  const [, setEditorRevision] = useState(0);
  const initialHtmlRef = useRef<string>("");
  const sectionsRef = useRef(sections);

  // Keep sections ref up to date
  useEffect(() => {
    sectionsRef.current = sections;
  }, [sections]);

  // Generate initial HTML from sections
  const initialHtml = sectionsToHtml(sections, sections);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3, 4, 5, 6],
        },
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Placeholder.configure({
        placeholder: "Start editing the constitution...",
      }),
    ],
    content: initialHtml,
    immediatelyRender: false,
    onUpdate: () => {
      setHasUnsavedChanges(true);
      setSaveMessage("");
      setEditorRevision((r) => r + 1);
    },
    onSelectionUpdate: () => {
      // Force re-render so toolbar active states update
      setEditorRevision((r) => r + 1);
    },
  });

  // Store initial HTML for reset
  useEffect(() => {
    initialHtmlRef.current = initialHtml;
  }, [initialHtml]);

  // Update editor content when sections change externally (only if no unsaved changes)
  useEffect(() => {
    if (editor && !hasUnsavedChanges) {
      const newHtml = sectionsToHtml(sections, sections);
      if (newHtml !== initialHtmlRef.current) {
        editor.commands.setContent(newHtml);
        initialHtmlRef.current = newHtml;
      }
    }
  }, [sections, editor, hasUnsavedChanges]);

  const handleSave = useCallback(async () => {
    if (!editor) return;

    setIsSaving(true);
    setSaveMessage("");

    try {
      const currentHtml = editor.getHTML();
      const updates = htmlToSectionUpdates(currentHtml, sectionsRef.current);

      if (updates.length === 0) {
        setSaveMessage("No changes detected");
        setHasUnsavedChanges(false);
        setIsSaving(false);
        return;
      }

      // Apply all updates
      for (const { sectionId, updates: sectionUpdates } of updates) {
        await onUpdateSection(sectionId, sectionUpdates);
      }

      setSaveMessage(`Saved ${updates.length} section${updates.length > 1 ? "s" : ""}`);
      setHasUnsavedChanges(false);

      // Update the initial HTML ref to current state
      initialHtmlRef.current = currentHtml;
    } catch (error) {
      console.error("Failed to save:", error);
      setSaveMessage("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  }, [editor, onUpdateSection]);

  // Ctrl/Cmd+S keyboard shortcut to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (hasUnsavedChanges && !isSaving) {
          handleSave();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleSave, hasUnsavedChanges, isSaving]);

  const handleReset = useCallback(() => {
    if (!editor) return;
    const freshHtml = sectionsToHtml(sectionsRef.current, sectionsRef.current);
    editor.commands.setContent(freshHtml);
    initialHtmlRef.current = freshHtml;
    setHasUnsavedChanges(false);
    setSaveMessage("");
  }, [editor]);

  if (!editor) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded" />
          <div className="h-64 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Toolbar */}
      <div className="border-b border-gray-200 bg-gray-50 px-3 py-2">
        <div className="flex flex-wrap items-center gap-1">
          {/* Text formatting */}
          <ToolbarGroup>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive("bold")}
              title="Bold"
            >
              <Bold className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive("italic")}
              title="Italic"
            >
              <Italic className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              isActive={editor.isActive("underline")}
              title="Underline"
            >
              <UnderlineIcon className="h-4 w-4" />
            </ToolbarButton>
          </ToolbarGroup>

          <ToolbarDivider />

          {/* Headings */}
          <ToolbarGroup>
            <ToolbarButton
              onClick={() => editor.chain().focus().setParagraph().run()}
              isActive={editor.isActive("paragraph") && !editor.isActive("heading")}
              title="Paragraph"
            >
              <Type className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
              isActive={editor.isActive("heading", { level: 2 })}
              title="Heading 2"
            >
              <Heading2 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run()
              }
              isActive={editor.isActive("heading", { level: 3 })}
              title="Heading 3"
            >
              <Heading3 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 4 }).run()
              }
              isActive={editor.isActive("heading", { level: 4 })}
              title="Heading 4"
            >
              <Heading4 className="h-4 w-4" />
            </ToolbarButton>
          </ToolbarGroup>

          <ToolbarDivider />

          {/* Lists */}
          <ToolbarGroup>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive("bulletList")}
              title="Bullet List"
            >
              <List className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive("orderedList")}
              title="Numbered List"
            >
              <ListOrdered className="h-4 w-4" />
            </ToolbarButton>
          </ToolbarGroup>

          <ToolbarDivider />

          {/* Alignment */}
          <ToolbarGroup>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().setTextAlign("left").run()
              }
              isActive={editor.isActive({ textAlign: "left" })}
              title="Align Left"
            >
              <AlignLeft className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().setTextAlign("center").run()
              }
              isActive={editor.isActive({ textAlign: "center" })}
              title="Align Center"
            >
              <AlignCenter className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().setTextAlign("right").run()
              }
              isActive={editor.isActive({ textAlign: "right" })}
              title="Align Right"
            >
              <AlignRight className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().setTextAlign("justify").run()
              }
              isActive={editor.isActive({ textAlign: "justify" })}
              title="Justify"
            >
              <AlignJustify className="h-4 w-4" />
            </ToolbarButton>
          </ToolbarGroup>

          <ToolbarDivider />

          {/* Insert */}
          <ToolbarGroup>
            <ToolbarButton
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              title="Horizontal Rule"
            >
              <Minus className="h-4 w-4" />
            </ToolbarButton>
          </ToolbarGroup>

          <ToolbarDivider />

          {/* Undo/Redo */}
          <ToolbarGroup>
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Undo"
            >
              <Undo2 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Redo"
            >
              <Redo2 className="h-4 w-4" />
            </ToolbarButton>
          </ToolbarGroup>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Save controls */}
          <div className="flex items-center gap-2">
            {saveMessage && (
              <span
                className={`text-xs font-medium px-2 py-1 rounded ${
                  saveMessage.includes("Failed")
                    ? "text-red-600 bg-red-50"
                    : "text-green-600 bg-green-50"
                }`}
              >
                {saveMessage}
              </span>
            )}
            {hasUnsavedChanges && (
              <span className="text-xs text-orange-600 font-medium bg-orange-50 px-2 py-1 rounded border border-orange-200">
                Unsaved changes
              </span>
            )}
            <Button
              onClick={handleReset}
              variant="outline"
              size="sm"
              disabled={!hasUnsavedChanges}
              className="h-8 text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Reset
            </Button>
            <Button
              onClick={handleSave}
              size="sm"
              disabled={!hasUnsavedChanges || isSaving}
              className={`h-8 text-xs ${
                hasUnsavedChanges
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : ""
              }`}
            >
              <Save className="h-3.5 w-3.5 mr-1" />
              {isSaving ? "Saving..." : "Save All"}
            </Button>
          </div>
        </div>
      </div>

      {/* Editor Content */}
      <div className="constitution-document-editor p-6 lg:p-8 min-h-125 max-h-[calc(100vh-300px)] overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

// Toolbar sub-components
const ToolbarGroup: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <div className="flex items-center gap-0.5">{children}</div>;

const ToolbarDivider: React.FC = () => (
  <div className="w-px h-6 bg-gray-300 mx-1.5" />
);

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  onClick,
  isActive = false,
  disabled = false,
  title,
  children,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`
      inline-flex items-center justify-center w-8 h-8 rounded-md text-sm
      transition-colors duration-150
      ${
        isActive
          ? "bg-blue-100 text-blue-700 border border-blue-200"
          : "text-gray-600 hover:bg-gray-200 hover:text-gray-900"
      }
      ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
    `}
  >
    {children}
  </button>
);

export default ConstitutionDocumentEditor;
