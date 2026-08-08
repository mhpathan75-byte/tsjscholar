import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { listAlbums, createAlbum, addGalleryImage, deleteAlbum, getAlbum, publishAlbumNotification } from "@/lib/gallery.functions";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/dashboard/gallery")({
  component: Page,
  head: () => ({ meta: [{ title: "Gallery — TSJ Scholar Palanpur" }] }),
});

type Album = { id: string; title: string; description: string | null; event_date: string | null; cover_url: string | null; image_count: number };
type Img = { id: string; url: string; caption: string | null };

function Page() {
  const { profile } = useAuth();
  const isStaff = profile?.role === "teacher" || profile?.role === "principal";
  const listA = useServerFn(listAlbums);
  const createA = useServerFn(createAlbum);
  const addImg = useServerFn(addGalleryImage);
  const delA = useServerFn(deleteAlbum);
  const getA = useServerFn(getAlbum);
  const notify = useServerFn(publishAlbumNotification);

  const [albums, setAlbums] = useState<Album[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [openImages, setOpenImages] = useState<Img[]>([]);
  const [openAlbum, setOpenAlbum] = useState<Album | null>(null);
  const [newForm, setNewForm] = useState({ title: "", description: "", event_date: "" });
  const [showNew, setShowNew] = useState(false);
  const [uploading, setUploading] = useState(false);

  const refresh = () => listA({}).then((r) => setAlbums(r as Album[])).catch(() => {});
  useEffect(() => { refresh(); }, []); // eslint-disable-line

  const openView = async (id: string) => {
    setOpenId(id);
    const r: any = await getA({ data: { id } });
    setOpenAlbum(r.album); setOpenImages(r.images);
  };

  const createNew = async () => {
    if (!newForm.title.trim()) return;
    await createA({ data: newForm });
    setNewForm({ title: "", description: "", event_date: "" }); setShowNew(false); refresh();
  };

  const uploadFiles = async (files: FileList | null) => {
    if (!files || !openId) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const path = `${openId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("gallery").upload(path, file);
      if (!error) await addImg({ data: { album_id: openId, storage_path: path, caption: "" } });
    }
    setUploading(false);
    if (openAlbum) await notify({ data: { album_id: openId, title: openAlbum.title } });
    openView(openId);
    refresh();
  };

  if (openId) {
    return (
      <div className="space-y-4">
        <button onClick={() => { setOpenId(null); setOpenAlbum(null); setOpenImages([]); }}
          className="text-xs uppercase tracking-widest text-primary hover:underline">← Back to albums</button>
        {openAlbum && (
          <div>
            <h1 className="font-display text-4xl text-foreground">{openAlbum.title}</h1>
            {openAlbum.description && <p className="mt-1 text-muted-foreground">{openAlbum.description}</p>}
          </div>
        )}
        {isStaff && (
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-90">
            {uploading ? "Uploading…" : "+ Add photos"}
            <input type="file" multiple accept="image/*" hidden onChange={(e) => uploadFiles(e.target.files)} />
          </label>
        )}
        {openImages.length === 0 ? (
          <EmptyState icon="📸" title="No photos yet" message={isStaff ? "Upload the first ones." : "Photos will appear here soon."} />
        ) : (
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
            {openImages.map((img) => (
              <div key={img.id} className="mb-4 break-inside-avoid overflow-hidden rounded-xl border border-border bg-card shadow-soft">
                <img src={img.url} alt={img.caption ?? ""} className="w-full" loading="lazy" />
                {img.caption && <div className="p-2 text-xs text-muted-foreground">{img.caption}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-gold">Memories</div>
          <h1 className="mt-2 font-display text-4xl text-foreground">Gallery</h1>
          <p className="mt-1 text-sm text-muted-foreground">Events, labs, activities and milestones.</p>
        </div>
        {isStaff && (
          <button onClick={() => setShowNew(true)} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-90">
            + New album
          </button>
        )}
      </div>

      {showNew && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <input placeholder="Album title" value={newForm.title} onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
            className="mb-2 w-full rounded-lg border border-border px-3 py-2 text-sm" />
          <input placeholder="Description" value={newForm.description} onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
            className="mb-2 w-full rounded-lg border border-border px-3 py-2 text-sm" />
          <input type="date" value={newForm.event_date} onChange={(e) => setNewForm({ ...newForm, event_date: e.target.value })}
            className="mb-3 w-full rounded-lg border border-border px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <button onClick={createNew} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">Create</button>
            <button onClick={() => setShowNew(false)} className="rounded-lg border border-border px-4 py-2 text-sm">Cancel</button>
          </div>
        </div>
      )}

      {albums.length === 0 ? (
        <EmptyState icon="🖼️" title="No albums yet" message={isStaff ? "Create the first album." : "Ask a teacher to share event photos."} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {albums.map((a) => (
            <div key={a.id} className="group overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition hover:-translate-y-1 hover:shadow-elegant">
              <button onClick={() => openView(a.id)} className="block w-full text-left">
                <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                  {a.cover_url ? (
                    <img src={a.cover_url} alt={a.title} className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-4xl">🖼️</div>
                  )}
                </div>
                <div className="p-4">
                  <div className="font-display text-lg text-foreground">{a.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {a.image_count} photo{a.image_count === 1 ? "" : "s"}{a.event_date ? ` · ${new Date(a.event_date).toLocaleDateString()}` : ""}
                  </div>
                </div>
              </button>
              {isStaff && (
                <div className="border-t border-border p-2 text-right">
                  <button onClick={async () => { if (confirm("Delete this album and all photos?")) { await delA({ data: { id: a.id } }); refresh(); } }}
                    className="text-[10px] uppercase tracking-widest text-destructive hover:underline">Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}