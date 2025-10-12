import Link from "next/link";
import { getSupabaseRSC, getSupabaseAdminClient } from "@/lib/supabase/server";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import ReorderSection from "@/components/ReorderSection";

type Artwork = {
  id: string;
  title: string;
  subtitle: string | null;
  html_url: string | null;
  thumb_url: string | null;
  preview_video_url: string | null;
  order_index: number | null;
  is_active: boolean | null;
};

function pathFromPublicUrl(url: string | null) {
  if (!url) return null;
  try {
    const u = new URL(url);
    // public path is everything after /object/public/artworks/
    const marker = "/storage/v1/object/public/";
    const idx = u.pathname.indexOf(marker);
    if (idx === -1) return null;
    const rel = u.pathname.substring(idx + marker.length); // e.g. "artworks/previews/foo.mp4"
    const afterBucket = rel.split("/").slice(1).join("/"); // remove "artworks/"
    return afterBucket || null;
  } catch {
    return null;
  }
}

export default async function ArtworksPage() {
  const supabase = await getSupabaseRSC();
  const { data: session } = await supabase.auth.getUser();
  if (!session.user) {
    // ProtectedLayout should already redirect unauthenticated users
    return null;
  }

  const { data, error } = await supabase
    .from("artworks")
    .select(
      "id, title, subtitle, html_url, thumb_url, preview_video_url, order_index, is_active"
    )
    .order("order_index", { ascending: true });

  const rows: Artwork[] = data || [];

  async function reorderArtworks(formData: FormData) {
    "use server";
    const admin = getSupabaseAdminClient();
    try {
      const raw = String(formData.get("order") || "[]");
      const ids: string[] = JSON.parse(raw);
      if (!Array.isArray(ids)) return;

      await Promise.all(
        ids.map((id, idx) =>
          admin.from("artworks").update({ order_index: idx + 1 }).eq("id", id)
        )
      );
    } catch {
      // ignore invalid payloads
    }
  }

  async function toggleActive(formData: FormData) {
    "use server";
    const id = String(formData.get("id") || "");
    const current = String(formData.get("current") || "false") === "true";
    const admin = getSupabaseAdminClient();
    await admin.from("artworks").update({ is_active: !current }).eq("id", id);
  }

  async function updateOrder(formData: FormData) {
    "use server";
    const id = String(formData.get("id") || "");
    const order = Number(formData.get("order_index") || 0);
    const admin = getSupabaseAdminClient();
    await admin.from("artworks").update({ order_index: order }).eq("id", id);
  }

  async function deleteArtwork(formData: FormData) {
    "use server";
    const id = String(formData.get("id") || "");
    const htmlUrl = String(formData.get("html_url") || "");
    const thumbUrl = String(formData.get("thumb_url") || "");
    const previewUrl = String(formData.get("preview_video_url") || "");
    const admin = getSupabaseAdminClient();

    // Attempt to delete storage objects (best effort)
    const htmlPath = pathFromPublicUrl(htmlUrl);
    const thumbPath = pathFromPublicUrl(thumbUrl);
    const previewPath = pathFromPublicUrl(previewUrl);
    const toRemove = [htmlPath, thumbPath, previewPath].filter(Boolean) as string[];

    if (toRemove.length > 0) {
      await admin.storage.from("artworks").remove(toRemove);
    }

    await admin.from("artworks").delete().eq("id", id);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Artworks</h1>
        <Link
          href="/artworks/new"
          className="text-sm rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-900"
        >
          New Artwork
        </Link>
      </div>

      <ReorderSection
        items={rows.map((r) => ({ id: r.id, title: r.title, order_index: r.order_index }))}
        reorderAction={reorderArtworks}
      />

      {rows.length === 0 ? (
        <p className="text-sm text-neutral-500">No artworks yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b border-neutral-200 dark:border-neutral-800">
                <th className="py-2 pr-3">Title</th>
                <th className="py-2 pr-3">Subtitle</th>
                <th className="py-2 pr-3">Order</th>
                <th className="py-2 pr-3">Active</th>
                <th className="py-2 pr-3">Preview</th>
                <th className="py-2 pr-3">Thumb</th>
                <th className="py-2 pr-3">HTML</th>
                <th className="py-2 pr-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-neutral-100 dark:border-neutral-900">
                  <td className="py-2 pr-3">{r.title}</td>
                  <td className="py-2 pr-3">{r.subtitle}</td>
                  <td className="py-2 pr-3">
                    <form action={updateOrder} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={r.id} />
                      <input
                        name="order_index"
                        defaultValue={r.order_index ?? 0}
                        className="w-16 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1 text-sm"
                        type="number"
                      />
                      <button
                        className="text-xs rounded border border-neutral-300 dark:border-neutral-700 px-2 py-1 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                        type="submit"
                      >
                        Save
                      </button>
                    </form>
                  </td>
                  <td className="py-2 pr-3">
                    <form action={toggleActive}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="current" value={String(r.is_active === true)} />
                      <button
                        className="text-xs rounded border border-neutral-300 dark:border-neutral-700 px-2 py-1 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                        type="submit"
                      >
                        {(r.is_active === true) ? "Deactivate" : "Activate"}
                      </button>
                    </form>
                  </td>
                  <td className="py-2 pr-3">
                    {r.preview_video_url ? (
                      <a href={r.preview_video_url} target="_blank" className="underline hover:opacity-80">
                        MP4
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    {r.thumb_url ? (
                      <a href={r.thumb_url} target="_blank" className="underline hover:opacity-80">
                        JPG
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    {r.html_url ? (
                      <a href={r.html_url} target="_blank" className="underline hover:opacity-80">
                        HTML
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/artworks/${r.id}`}
                        className="text-xs rounded border border-neutral-300 dark:border-neutral-700 px-2 py-1 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                      >
                        Edit
                      </Link>
                      <form action={deleteArtwork}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="html_url" value={r.html_url || ""} />
                        <input type="hidden" name="thumb_url" value={r.thumb_url || ""} />
                        <input type="hidden" name="preview_video_url" value={r.preview_video_url || ""} />
                        <ConfirmSubmit
                          label="Delete"
                          confirm="Delete this artwork and its files?"
                          className="text-xs rounded border border-red-300 dark:border-red-700 text-red-600 px-2 py-1 hover:bg-red-50 dark:hover:bg-red-900/30"
                        />
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
