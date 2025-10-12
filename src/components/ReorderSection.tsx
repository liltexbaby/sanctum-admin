"use client";

import { useState } from "react";
import ArtworkReorder from "@/components/ArtworkReorder";

type Item = {
  id: string;
  title: string;
  order_index: number | null;
};

type Props = {
  items: Item[];
  reorderAction: (formData: FormData) => Promise<void>;
};

export default function ReorderSection({ items, reorderAction }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <section className="relative">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold">Reorder Artworks</h2>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-xs rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-900"
          aria-expanded={open}
          aria-controls="reorder-panel"
        >
          {open ? "Close Reorder" : "Open Reorder"}
        </button>
      </div>

      {open ? (
        <div id="reorder-panel" className="mt-2">
          <ArtworkReorder items={items} reorderAction={reorderAction} />
        </div>
      ) : (
        <p className="text-xs text-neutral-500" id="reorder-panel">
          Click “Open Reorder” to drag items and save a new display order.
        </p>
      )}
    </section>
  );
}
