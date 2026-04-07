import { Extension } from "@tiptap/core";
import Suggestion, { type SuggestionKeyDownProps } from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance } from "tippy.js";

import { CommandList, type CommandListRef } from "@/components/editor/command-list";
import type { SlashCommandItem } from "@/lib/editor/types";

interface SlashCommandOptions {
  items: (query: string) => SlashCommandItem[];
}

export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: "slashCommand",

  addOptions() {
    return {
      items: () => [],
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashCommandItem>({
        editor: this.editor,
        char: "/",
        allowSpaces: true,
        startOfLine: false,
        items: ({ query }) => this.options.items(query),
        command: ({ editor, range, props }) => {
          props.command({ editor, range });
          editor.chain().focus().run();
        },
        render: () => {
          let popup: Instance | undefined;
          let component: ReactRenderer<CommandListRef> | undefined;

          return {
            onStart: (props) => {
              component = new ReactRenderer(CommandList, {
                editor: props.editor,
                props: {
                  items: props.items,
                  command: (item: SlashCommandItem) => item.command({ editor: props.editor, range: props.range }),
                },
              });

              if (!props.clientRect) {
                return;
              }

              popup = tippy(document.body, {
                appendTo: () => document.body,
                content: component.element,
                getReferenceClientRect: () => props.clientRect?.() ?? new DOMRect(),
                interactive: true,
                showOnCreate: true,
                trigger: "manual",
                placement: "bottom-start",
                maxWidth: 360,
              });
            },

            onUpdate(props) {
              component?.updateProps({
                items: props.items,
                command: (item: SlashCommandItem) => item.command({ editor: props.editor, range: props.range }),
              });

              if (!props.clientRect) {
                return;
              }

              popup?.setProps({
                getReferenceClientRect: () => props.clientRect?.() ?? new DOMRect(),
              });
            },

            onKeyDown(props: SuggestionKeyDownProps) {
              if (props.event.key === "Escape") {
                popup?.hide();
                return true;
              }

              return component?.ref?.onKeyDown(props) ?? false;
            },

            onExit() {
              popup?.destroy();
              component?.destroy();
            },
          };
        },
      }),
    ];
  },
});
