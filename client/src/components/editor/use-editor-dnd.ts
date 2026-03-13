import { useCallback, useState } from "react";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { findBlockById } from "./editor-block-definitions";
import type { Editor } from "@tiptap/react";

// Custom MIME type so we don't interfere with normal drag operations
const BLOCK_MIME = "application/x-editor-block";

/**
 * TipTap Extension that handles dropping sidebar blocks into the editor.
 * Uses ProseMirror's posAtCoords for precise drop position detection.
 */
export const BlockDropExtension = Extension.create({
  name: "blockDrop",

  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        key: new PluginKey("blockDrop"),
        props: {
          handleDrop(view, event, _slice, _moved) {
            const blockId = event.dataTransfer?.getData(BLOCK_MIME);
            if (!blockId) return false; // Not our block — let ProseMirror handle

            event.preventDefault();

            const coordinates = view.posAtCoords({
              left: event.clientX,
              top: event.clientY,
            });
            if (!coordinates) return false;

            const block = findBlockById(blockId);
            if (!block) return false;

            // Use setTimeout to avoid conflicts with ProseMirror's event handling
            setTimeout(() => {
              editor
                .chain()
                .focus()
                .setTextSelection(coordinates.pos)
                .insertContent(block.getContent())
                .run();
            }, 0);

            return true;
          },

          handleDOMEvents: {
            dragover(view, event) {
              // Check if this is one of our blocks being dragged
              if (event.dataTransfer?.types.includes(BLOCK_MIME)) {
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
              }
              return false;
            },
          },
        },
      }),
    ];
  },
});

/**
 * Hook for drag-start and click-to-insert handlers.
 */
export function useEditorDnd(editor: Editor | null) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = useCallback(
    (e: React.DragEvent, blockId: string) => {
      e.dataTransfer.setData(BLOCK_MIME, blockId);
      e.dataTransfer.effectAllowed = "copy";
      setIsDragging(true);

      // Create a small drag ghost
      const ghost = document.createElement("div");
      ghost.className = "editor-drag-ghost";
      const block = findBlockById(blockId);
      ghost.textContent = block?.label || blockId;
      ghost.style.cssText =
        "position:fixed;top:-100px;padding:6px 12px;background:#3B5FE5;color:white;border-radius:6px;font-size:12px;font-family:inherit;direction:rtl;pointer-events:none;z-index:9999";
      document.body.appendChild(ghost);
      e.dataTransfer.setDragImage(ghost, 0, 0);
      // Clean up ghost after drag starts
      requestAnimationFrame(() => {
        document.body.removeChild(ghost);
      });
    },
    []
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClickInsert = useCallback(
    (blockId: string) => {
      if (!editor) return;
      const block = findBlockById(blockId);
      if (!block) return;
      editor.chain().focus().insertContent(block.getContent()).run();
    },
    [editor]
  );

  return { handleDragStart, handleDragEnd, handleClickInsert, isDragging };
}
