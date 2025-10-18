import { redirect } from "next/navigation";
import Link from "next/link";
import { getSupabaseRSC, getSupabaseAdminClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils/slug";
import FileField from "@/components/FileField";
export const runtime = "nodejs";

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

function getExtFromFile(file: File | null) {
  if (!file) return null;
  const name = file.name || "";
  const dot = name.lastIndexOf(".");
  if (dot !== -1) return name.slice(dot + 1).toLowerCase();
  if (file.type === "text/html") return "html";
  if (file.type === "video/mp4") return "mp4";
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  return "bin";
}

function filenameFromUrl(url: string | null) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const p = u.pathname || "";
    const last = p.substring(p.lastIndexOf("/") + 1);
    return last || null;
  } catch {
    return null;
  }
}

function isValidUpload(file: File | null) {
  try {
    return !!(file && typeof file === "object" && "size" in file && (file as File).size > 0);
  } catch {
    return false;
  }
}

export default async function EditArtworkPage({ params }: { params: { id: string } }) {
  const supabase = await getSupabaseRSC();
  const { data: session } = await supabase.auth.getUser();
  if (!session.user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("artworks")
    .select("id, title, subtitle, html_url, thumb_url, preview_video_url, order_index, is_active")
    .eq("id", params.id)
    .maybeSingle();

  if (!data) {
    redirect("/artworks?error=not_found");
  }

  const row = data as Artwork;

  async function updateArtwork(formData: FormData) {
    "use server";
    const admin = getSupabaseAdminClient();

    const id = String(formData.get("id") || "");
    const title = String(formData.get("title") || "").trim();
    const subtitle = String(formData.get("subtitle") || "").trim() || null;
    const orderIndex = Number(formData.get("order_index") || 0);
    const isActive = String(formData.get("is_active") || "true") === "true";

    const existingHtmlUrl = String(formData.get("existing_html_url") || "") || null;
    const existingThumbUrl = String(formData.get("existing_thumb_url") || "") || null;
    const existingPreviewUrl = String(formData.get("existing_preview_url") || "") || null;

    const htmlFile = (formData.get("html_file") as File) || null;
    const mp4File = (formData.get("mp4_file") as File) || null;
    const thumbFile = (formData.get("thumb_file") as File) || null;

    if (!title) {
      redirect(`/artworks/${id}?error=missing_title`);
    }

    // Prepare new paths if files provided
    const base = `${slugify(title)}-${Date.now().toString().slice(-6)}`;

    let html_url = existingHtmlUrl;
    let preview_video_url = existingPreviewUrl;
    let thumb_url = existingThumbUrl;

    async function uploadFile(path: string, file: File) {
      const arrayBuf = await file.arrayBuffer();
      const { error } = await admin.storage
        .from("artworks")
        .upload(path, arrayBuf, {
          contentType: file.type || "application/octet-stream",
          upsert: true,
        });
      if (error) throw error;
      const { data } = admin.storage.from("artworks").getPublicUrl(path);
      return data.publicUrl;
    }

    // Replace HTML
    if (isValidUpload(htmlFile)) {
      const ext = getExtFromFile(htmlFile) || "html";
      const newPath = `html/${base}.${ext}`;
      const oldPath = pathFromPublicUrl(existingHtmlUrl);
      html_url = await uploadFile(newPath, htmlFile);
      if (oldPath) {
        // best-effort cleanup
        await admin.storage.from("artworks").remove([oldPath]);
      }
    }

    // Replace MP4
    if (isValidUpload(mp4File)) {
      const ext = getExtFromFile(mp4File) || "mp4";
      const newPath = `previews/${base}.${ext}`;
      const oldPath = pathFromPublicUrl(existingPreviewUrl);
      preview_video_url = await uploadFile(newPath, mp4File);
      if (oldPath) {
        await admin.storage.from("artworks").remove([oldPath]);
      }
    }

    // Replace Thumb
    if (isValidUpload(thumbFile)) {
      const ext = getExtFromFile(thumbFile) || "jpg";
      const newPath = `thumbnails/${base}.${ext}`;
      const oldPath = pathFromPublicUrl(existingThumbUrl);
      thumb_url = await uploadFile(newPath, thumbFile);
      if (oldPath) {
        await admin.storage.from("artworks").remove([oldPath]);
      }
    }

    // Build partial updates: only include fields that changed
    const updates: Record<string, any> = {
      title,
      order_index: orderIndex,
      is_active: isActive,
    };

    // Only update subtitle if the field is non-empty; leaving it blank won't wipe existing data
    if (typeof subtitle === "string" && subtitle.trim() !== "") {
      updates.subtitle = subtitle;
    }

    // Only include media URLs if a new file was uploaded
    if (isValidUpload(htmlFile)) updates.html_url = html_url;
    if (isValidUpload(mp4File)) updates.preview_video_url = preview_video_url;
    if (isValidUpload(thumbFile)) updates.thumb_url = thumb_url;

    const { error: updErr } = await admin
      .from("artworks")
      .update(updates)
      .eq("id", id);

    if (updErr) {
      redirect(`/artworks/${id}?error=${encodeURIComponent(updErr.message)}`);
    }

    redirect("/artworks");
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Edit Artwork</h1>
        <Link
          href="/artworks"
          className="text-sm rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-900"
        >
          Back
        </Link>
      </div>

      <form action={updateArtwork} className="space-y-4">
        <input type="hidden" name="id" value={row.id} />
        <input type="hidden" name="existing_html_url" value={row.html_url || ""} />
        <input type="hidden" name="existing_thumb_url" value={row.thumb_url || ""} />
        <input type="hidden" name="existing_preview_url" value={row.preview_video_url || ""} />

        <div className="space-y-1">
          <label className="block text-sm">Title</label>
          <input
            name="title"
            defaultValue={row.title}
            required
            className="w-full rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm"
            placeholder="Title"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm">Subtitle</label>
          <input
            name="subtitle"
            defaultValue={row.subtitle || ""}
            className="w-full rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm"
            placeholder="Subtitle (optional)"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm">Order Index</label>
          <input
            name="order_index"
            defaultValue={row.order_index ?? 0}
            type="number"
            className="w-32 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm">Active</label>
          <select
            name="is_active"
            defaultValue={row.is_active ? "true" : "false"}
            className="w-32 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm"
          >
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-sm">Current HTML</label>
          {row.html_url ? (
            <div className="text-sm">
              <a href={row.html_url} target="_blank" className="underline break-all">
                {row.html_url}
              </a>
              <div className="text-neutral-500 mt-1">
                Filename: {filenameFromUrl(row.html_url) ?? "-"}
              </div>
            </div>
          ) : (
            <p className="text-sm text-neutral-500">None</p>
          )}
          <div className="mt-2">
            <FileField id="html_file" name="html_file" accept=".html,text/html" buttonText="Choose HTML" />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-sm">Current Preview MP4</label>
          {row.preview_video_url ? (
            <div className="text-sm">
              <a href={row.preview_video_url} target="_blank" className="underline break-all">
                {row.preview_video_url}
              </a>
              <div className="text-neutral-500 mt-1">
                Filename: {filenameFromUrl(row.preview_video_url) ?? "-"}
              </div>
            </div>
          ) : (
            <p className="text-sm text-neutral-500">None</p>
          )}
          <div className="mt-2">
            <FileField id="mp4_file" name="mp4_file" accept="video/mp4" buttonText="Choose MP4" />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-sm">Current Thumbnail</label>
          {row.thumb_url ? (
            <div className="text-sm">
              <a href={row.thumb_url} target="_blank" className="underline break-all">
                {row.thumb_url}
              </a>
              <div className="text-neutral-500 mt-1">
                Filename: {filenameFromUrl(row.thumb_url) ?? "-"}
              </div>
            </div>
          ) : (
            <p className="text-sm text-neutral-500">None</p>
          )}
          <div className="mt-2">
            <FileField id="thumb_file" name="thumb_file" accept="image/jpeg,image/png" buttonText="Choose Image" />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="rounded-md border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
