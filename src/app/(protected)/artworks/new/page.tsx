import { redirect } from "next/navigation";
import { getSupabaseRSC, getSupabaseAdminClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils/slug";

function getExt(file: File | null) {
  if (!file) return null;
  const name = file.name || "";
  const dot = name.lastIndexOf(".");
  if (dot !== -1) return name.slice(dot + 1).toLowerCase();
  // fallback from mime
  if (file.type === "text/html") return "html";
  if (file.type === "video/mp4") return "mp4";
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  return "bin";
}

export default async function NewArtworkPage() {
  const supabase = await getSupabaseRSC();
  const { data: session } = await supabase.auth.getUser();
  if (!session.user) {
    redirect("/login");
  }

  async function createArtwork(formData: FormData) {
    "use server";
    const admin = getSupabaseAdminClient();

    const title = String(formData.get("title") || "").trim();
    const subtitle = String(formData.get("subtitle") || "").trim() || null;
    const orderIndex = Number(formData.get("order_index") || 0);

    if (!title) {
      // back to form (SSR action minimal handling)
      redirect("/artworks/new?error=missing_title");
    }

    // Uploaded files (any of them may be missing)
    const htmlFile = (formData.get("html_file") as File) || null;
    const mp4File = (formData.get("mp4_file") as File) || null;
    const thumbFile = (formData.get("thumb_file") as File) || null;

    const base = `${slugify(title)}-${Date.now().toString().slice(-6)}`;

    let html_url: string | null = null;
    let preview_video_url: string | null = null;
    let thumb_url: string | null = null;

    // Upload helpers
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

    // Upload provided files
    if (htmlFile) {
      const ext = getExt(htmlFile) || "html";
      html_url = await uploadFile(`html/${base}.${ext}`, htmlFile);
    }
    if (mp4File) {
      const ext = getExt(mp4File) || "mp4";
      preview_video_url = await uploadFile(`previews/${base}.${ext}`, mp4File);
    }
    if (thumbFile) {
      const ext = getExt(thumbFile) || "jpg";
      thumb_url = await uploadFile(`thumbnails/${base}.${ext}`, thumbFile);
    }

    // Insert row
    const { error: insertErr } = await admin.from("artworks").insert({
      title,
      subtitle,
      slug: base,
      order_index: orderIndex,
      is_active: true,
      html_url,
      thumb_url,
      preview_video_url,
    });
    if (insertErr) {
      // basic failure path
      redirect(`/artworks/new?error=${encodeURIComponent(insertErr.message)}`);
    }

    redirect("/artworks");
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold mb-4">New Artwork</h1>
      <form action={createArtwork} className="space-y-4">
        <div className="space-y-1">
          <label className="block text-sm">Title</label>
          <input
            name="title"
            required
            className="w-full rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm"
            placeholder="Title"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm">Subtitle</label>
          <input
            name="subtitle"
            className="w-full rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm"
            placeholder="Subtitle (optional)"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm">Order Index</label>
          <input
            name="order_index"
            defaultValue={0}
            type="number"
            className="w-32 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm mb-1">HTML File</label>
          <input
            id="html_file"
            name="html_file"
            type="file"
            accept=".html,text/html"
            className="hidden"
          />
          <label
            htmlFor="html_file"
            className="inline-flex items-center rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer"
          >
            Select HTML
          </label>
        </div>

        <div className="space-y-1">
          <label className="block text-sm mb-1">Preview MP4</label>
          <input
            id="mp4_file"
            name="mp4_file"
            type="file"
            accept="video/mp4"
            className="hidden"
          />
          <label
            htmlFor="mp4_file"
            className="inline-flex items-center rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer"
          >
            Select MP4
          </label>
        </div>

        <div className="space-y-1">
          <label className="block text-sm mb-1">Thumbnail (JPG/PNG)</label>
          <input
            id="thumb_file"
            name="thumb_file"
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
          />
          <label
            htmlFor="thumb_file"
            className="inline-flex items-center rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer"
          >
            Select Image
          </label>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="rounded-md border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900"
          >
            Create
          </button>
        </div>
      </form>
    </div>
  );
}
