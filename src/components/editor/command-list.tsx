"use client";

import { forwardRef, useImperativeHandle, useState } from "react";

import type { SlashCommandItem } from "@/lib/editor/types";

export interface CommandListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

interface CommandListProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
}

export const CommandList = forwardRef<CommandListRef, CommandListProps>(function CommandList(
  { items, command },
  ref,
) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const currentIndex = selectedIndex >= items.length ? 0 : selectedIndex;

  function selectItem(index: number) {
    const item = items[index];

    if (item) {
      command(item);
    }
  }

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex((index) => (index + items.length - 1) % items.length);
        return true;
      }

      if (event.key === "ArrowDown") {
        setSelectedIndex((index) => (index + 1) % items.length);
        return true;
      }

      if (event.key === "Enter") {
        selectItem(currentIndex);
        return true;
      }

      return false;
    },
  }));

  if (!items.length) {
    return (
      <div className="command-menu">
        <p className="text-sm font-medium text-[var(--color-ink)]">No matching blocks</p>
        <p className="mt-1 text-xs text-[color:rgba(36,31,26,0.56)]">
          Try “heading”, “table”, “checklist”, or “quote”.
        </p>
      </div>
    );
  }

  return (
    <div className="command-menu">
      {items.map((item, index) => {
        const Icon = item.icon;

        return (
          <button
            key={item.title}
            type="button"
            onClick={() => selectItem(index)}
            className={`flex w-full items-start gap-3 rounded-2xl px-3 py-2 text-left transition ${
              selectedIndex === index
                ? "bg-[color:rgba(189,104,46,0.16)] text-[var(--color-ink)]"
                : "text-[color:rgba(36,31,26,0.78)] hover:bg-[color:rgba(36,31,26,0.05)]"
            }`}
          >
            <span className="mt-0.5 rounded-xl border border-[color:rgba(36,31,26,0.08)] bg-white p-2 text-[var(--color-accent)] shadow-[0_8px_16px_rgba(36,31,26,0.06)]">
              <Icon className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-sm font-semibold">{item.title}</span>
              <span className="mt-0.5 block text-xs leading-5 text-[color:rgba(36,31,26,0.58)]">
                {item.description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
});
