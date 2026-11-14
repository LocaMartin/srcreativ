import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  Trash2,
  Upload,
  LogOut,
  Eye,
  Users,
  Mail,
  Image as ImageIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Panel | SR Studio" },
      {
        name: "description",
        content: "SR Studio analytics and gallery management.",
      },
      { property: "og:title", content: "Admin Panel | SR Studio" },
      {
        property: "og:description",
        content: "SR Studio analytics and gallery management.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

const CATS = [
  "Candid Moments",
  "Cinematic Films",
  "Drone & Aerials",
  "Pre-Wedding",
];

function Admin() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: isAdmin, isLoading } = useQuery({
    queryKey: ["is-admin", user.id],
    queryFn: async () =>
      (await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }))
        .data === true,
  });

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="font-semibold tracking-[0.25em]">
            SR STUDIO <span className="text-primary">ADMIN</span>
          </Link>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="hidden sm:inline">{user.email}</span>
            <button
              onClick={signOut}
              className="flex items-center gap-2 rounded-full border border-primary/70 px-4 py-2 text-xs uppercase tracking-[0.14em] transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-12 px-6 py-10">
        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : !isAdmin ? (
          <p className="text-muted-foreground">
            Your account doesn't have admin access.
          </p>
        ) : (
          <>
            <Analytics />
            <GalleryManager />
            <Inquiries />
          </>
        )}
      </main>
    </div>
  );
}

function Stat({
  icon: I,
  label,
  value,
}: {
  icon: typeof Eye;
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-lg shadow-black/10">
      <I className="h-5 w-5 text-primary" />
      <p className="mt-4 text-3xl font-light">{value}</p>
      <p className="eyebrow mt-1">{label}</p>
    </div>
  );
}

function Analytics() {
  const { data } = useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 864e5).toISOString();
      const { data } = await supabase
        .from("page_views")
        .select("created_at, language, referrer")
        .gte("created_at", since)
        .limit(10000);
      const { count: inq } = await supabase
        .from("inquiries")
        .select("*", { count: "exact", head: true });
      const { count: imgs } = await supabase
        .from("gallery_images")
        .select("*", { count: "exact", head: true });
      return { views: data ?? [], inq: inq ?? 0, imgs: imgs ?? 0 };
    },
  });
  const views = data?.views ?? [];
  const today = new Date().toDateString();
  const days = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date(Date.now() - (13 - i) * 864e5);
    return {
      label: `${d.getDate()}/${d.getMonth() + 1}`,
      n: views.filter(
        (v) => new Date(v.created_at).toDateString() === d.toDateString(),
      ).length,
    };
  });
  const max = Math.max(1, ...days.map((d) => d.n));
  const langs = Object.entries(
    views.reduce<Record<string, number>>((a, v) => {
      const k = v.language || "unknown";
      a[k] = (a[k] || 0) + 1;
      return a;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <section>
      <h2 className="mb-6 text-2xl font-light">
        Analytics{" "}
        <span className="text-sm text-muted-foreground">(last 30 days)</span>
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Eye} label="Page views" value={views.length} />
        <Stat
          icon={Users}
          label="Views today"
          value={
            views.filter((v) => new Date(v.created_at).toDateString() === today)
              .length
          }
        />
        <Stat icon={Mail} label="Inquiries" value={data?.inq ?? 0} />
        <Stat
          icon={ImageIcon}
          label="Uploaded photos"
          value={data?.imgs ?? 0}
        />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-lg shadow-black/10 lg:col-span-2">
          <p className="eyebrow mb-4">Daily views (14 days)</p>
          <div className="flex h-40 items-end gap-2">
            {days.map((d) => (
              <div
                key={d.label}
                className="flex flex-1 flex-col items-center gap-1"
              >
                <span className="text-[10px] text-muted-foreground">
                  {d.n || ""}
                </span>
                <div
                  className="w-full rounded-t-full bg-gold"
                  style={{ height: `${(d.n / max) * 100}%`, minHeight: 2 }}
                />
                <span className="text-[10px] text-muted-foreground">
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-lg shadow-black/10">
          <p className="eyebrow mb-4">Visitor languages</p>
          <ul className="space-y-2 text-sm">
            {langs.length === 0 && (
              <li className="text-muted-foreground">No data yet</li>
            )}
            {langs.map(([l, n]) => (
              <li key={l} className="flex justify-between">
                <span>{l}</span>
                <span className="text-primary">{n}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function GalleryManager() {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [cat, setCat] = useState<string>(CATS[0]!);
  const [tall, setTall] = useState(false);
  const [busy, setBusy] = useState(false);
  const { data: images } = useQuery({
    queryKey: ["gallery-images"],
    queryFn: async () =>
      (
        await supabase
          .from("gallery_images")
          .select("*")
          .order("created_at", { ascending: false })
      ).data ?? [],
  });

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) {
      toast.error("Choose a photo and enter a title");
      return;
    }
    setBusy(true);
    try {
      const path = `${crypto.randomUUID()}.${file.name.split(".").pop() || "jpg"}`;
      const up = await supabase.storage
        .from("gallery")
        .upload(path, file, { contentType: file.type });
      if (up.error) throw up.error;
      const signed = await supabase.storage
        .from("gallery")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signed.error) throw signed.error;
      const ins = await supabase
        .from("gallery_images")
        .insert({
          title: title.trim().slice(0, 100),
          category: cat,
          image_url: signed.data.signedUrl,
          storage_path: path,
          tall,
        });
      if (ins.error) throw ins.error;
      toast.success("Photo added to gallery");
      setFile(null);
      setTitle("");
      (e.target as HTMLFormElement).reset();
      qc.invalidateQueries({ queryKey: ["gallery-images"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string, path: string | null) => {
    if (path) await supabase.storage.from("gallery").remove([path]);
    await supabase.from("gallery_images").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["gallery-images"] });
  };

  const input = "w-full rounded-full border border-input bg-background px-5 py-3 text-sm transition-colors focus:border-primary focus:outline-none";
  return (
    <section>
      <h2 className="mb-6 text-2xl font-light">Gallery</h2>
      <form
        onSubmit={upload}
        className="grid gap-4 rounded-3xl border border-border bg-card p-6 shadow-lg shadow-black/10 md:grid-cols-5"
      >
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className={`${input} md:col-span-2`}
        />
        <input
          placeholder="Title"
          value={title}
          maxLength={100}
          onChange={(e) => setTitle(e.target.value)}
          className={input}
        />
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className={input}
        >
          {CATS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <button
          disabled={busy}
          className="flex items-center justify-center gap-2 rounded-full bg-gold px-5 py-3 text-xs font-semibold uppercase tracking-widest text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          <Upload className="h-4 w-4" /> {busy ? "Uploading…" : "Upload"}
        </button>
        <label className="flex items-center gap-2 text-sm text-muted-foreground md:col-span-5">
          <input
            type="checkbox"
            checked={tall}
            onChange={(e) => setTall(e.target.checked)}
          />{" "}
          Portrait (tall) layout
        </label>
      </form>
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {images?.map((img) => (
          <div key={img.id} className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-lg shadow-black/10">
            <img
              src={img.image_url}
              alt={img.title}
              className="aspect-square w-full object-cover"
            />
            <div className="p-3">
              <p className="text-sm">{img.title}</p>
              <p className="text-xs text-muted-foreground">{img.category}</p>
            </div>
            <button
              onClick={() => remove(img.id, img.storage_path)}
              aria-label="Delete photo"
              className="absolute right-2 top-2 rounded-full bg-background/90 p-2 text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {images?.length === 0 && (
          <p className="col-span-full text-sm text-muted-foreground">
            No uploaded photos yet. The site shows the default gallery.
          </p>
        )}
      </div>
    </section>
  );
}

function Inquiries() {
  const { data } = useQuery({
    queryKey: ["inquiries"],
    queryFn: async () =>
      (
        await supabase
          .from("inquiries")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50)
      ).data ?? [],
  });
  return (
    <section>
      <h2 className="mb-6 text-2xl font-light">Recent inquiries</h2>
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-lg shadow-black/10">
        {data?.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground">No inquiries yet.</p>
        )}
        {data?.map((q) => (
          <div key={q.id} className="p-5 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <span className="font-medium">
                {q.name} ·{" "}
                <a className="text-primary" href={`mailto:${q.email}`}>
                  {q.email}
                </a>
                {q.phone && (
                  <>
                    {" · "}
                    <a className="text-primary" href={`tel:${q.phone}`}>
                      {q.phone}
                    </a>
                  </>
                )}
              </span>
              <span className="text-muted-foreground">
                {q.wedding_date} · {q.location} · {q.services.join(", ")}
              </span>
            </div>
            {q.message && (
              <p className="mt-2 text-muted-foreground">{q.message}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
