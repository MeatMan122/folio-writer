import { Extension } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey, type EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";

export const paginationPluginKey = new PluginKey<number[]>("folio-pagination");

function getPositionForTopLevelIndex(doc: ProseMirrorNode, index: number) {
  let position = 1;
  const safeIndex = Math.min(Math.max(index, 0), doc.childCount);

  for (let currentIndex = 0; currentIndex < safeIndex; currentIndex += 1) {
    position += doc.child(currentIndex).nodeSize;
  }

  return position;
}

export function getPaginationBreaks(state: EditorState) {
  return paginationPluginKey.getState(state) ?? [];
}

export function setPaginationBreaks(view: EditorView, breaks: number[]) {
  view.dispatch(view.state.tr.setMeta(paginationPluginKey, breaks));
}

export const Pagination = Extension.create({
  name: "pagination",

  addProseMirrorPlugins() {
    return [
      new Plugin<number[]>({
        key: paginationPluginKey,
        state: {
          init: () => [],
          apply(transaction, value) {
            const nextBreaks = transaction.getMeta(paginationPluginKey);
            return Array.isArray(nextBreaks) ? nextBreaks : value;
          },
        },
        props: {
          decorations(state) {
            const breaks = paginationPluginKey.getState(state);

            if (!breaks?.length) {
              return null;
            }

            const decorations = breaks
              .filter((breakIndex) => breakIndex > 0 && breakIndex < state.doc.childCount)
              .map((breakIndex) =>
              Decoration.widget(
                getPositionForTopLevelIndex(state.doc, breakIndex),
                () => {
                  const widget = document.createElement("div");
                  widget.className = "pagination-gap";
                  widget.dataset.paginationGap = "true";
                  widget.contentEditable = "false";
                  return widget;
                },
                { side: -1 },
              ),
            );

            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});
