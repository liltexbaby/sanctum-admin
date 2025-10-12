"use client";

import { useMemo, useRef, useState } from "react";

type Item = {
  id: string;
  title: string;
  order_index: number | null;
};

type Props = {
  items: Item[];
  reorderAction: (formData: FormData) => Promise<void>;
};

export default function ArtworkReorder({ items, reorderAction }: Props) {
  // Ensure stable initial order
  const initial = useMemo(
    () =>
      [...items].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
    [items]
  );

  const [ordered, setOrdered] = useState<Item[]>(initial);
  const [dirty, setDirty] = useState(false);
  const dragIndex = useRef<number | null>(null);

  const onDragStart = (index: number) => (e: React.DragEvent<HTMLDivElement>) => {
    dragIndex.current = index;
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (index: number) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // allow drop
    e.dataTransfer.dropEffect = "move";
  };

  const onDrop = (index: number) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from == null || from === index) return;

    setOrdered((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(index, 0, moved);
      return next;
    });
    setDirty(true);
  };

  const onKeyReorder = (i: number, dir: -1 | 1) => (e: React.KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    setOrdered((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      const tmp = next[i];
      next[i] = next[j];
      next[j] = tmp;
      return next;
    });
    setDirty(true);
  };

  const [submitting, setSubmitting] = useState(false);

  async function handleSave() {
    if (!dirty || submitting) return;
    try {
      setSubmitting(true);
      const form = new FormData();
      form.set(
        "order",
        JSON.stringify(ordered.map((it) => it.id))
      );
      await reorderAction(form);
      setDirty(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-8">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Reorder Artworks</h2>
        <button
          type="button"
          disabled={!dirty || submitting}
          onClick={handleSave}
          className={`text-xs rounded-md border px-3 py-1.5 ${
            !dirty || submitting
              ? "border-neutral-200 dark:border-neutral-800 text-neutral-400 cursor-not-allowed"
              : "border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900"
          }`}
          title="Save the new order"
        >
          {submitting ? "Saving..." : "Save new order"}
        </button>
      </div>
      <div
        className="rounded-md border border-dashed border-neutral-300 dark:border-neutral-700"
        role="list"
        aria-label="Drag to reorder artworks"
      >
        {ordered.map((it, i) => (
          <div
            key={it.id}
            role="listitem"
            draggable
            onDragStart={onDragStart(i)}
            onDragOver={onDragOver(i)}
            onDrop={onDrop(i)}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp") onKeyReorder(i, -1)(e as any);
              if (e.key === "ArrowDown") onKeyReorder(i, +1)(e as any);
            }}
            className="flex items-center justify-between px-3 py-2 border-b last:border-b-0 border-neutral-200 dark:border-neutral-800 cursor-grab select-none bg-transparent"
          >
            <div className="flex items-center gap-3">
              <span
                className="text-xs w-6 text-neutral-500"
                aria-hidden="true"
                title="Current position"
              >
                {i + 1}
              </span>
              <span className="inline-flex items-center text-neutral-500 mr-1" title="Drag handle">
                ☰
              </span>
              <span className="text-sm">{it.title}</span>
            </div>
            <span className="text-xs text-neutral-500">
              was {typeof it.order_index === "number" ? it.order_index : "-"}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-neutral-500">
        Drag rows to reorder. Press Save new order to persist. You can also use Arrow Up/Down + Enter/Space when focused.
      </p>
    </section>
  );
}
