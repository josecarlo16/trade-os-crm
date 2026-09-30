// export-attachments-zip — recursively zip everything in the `attachments` bucket
// and return a short-lived signed download URL.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { BlobWriter, BlobReader, ZipWriter } from "https://deno.land/x/zipjs@v2.7.45/index.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_SOURCE_BUCKET = "attachments";
const DEST_BUCKET = "attachment-exports";
const MAX_FILES = 2000;

async function listRecursive(
  supabase: ReturnType<typeof createClient>,
  bucket: string,
  prefix: string,
  out: string[],
  depth = 0,
): Promise<void> {
  if (depth > 8 || out.length >= MAX_FILES) return;

  let offset = 0;
  const limit = 100;
  while (true) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, { limit, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(`list("${prefix}") failed: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const entry of data) {
      if (entry.name === ".emptyFolderPlaceholder") continue;
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      // Folders come back with a null id / no metadata
      if (entry.id === null || !entry.metadata) {
        await listRecursive(supabase, bucket, path, out, depth + 1);
      } else if (out.length < MAX_FILES) {
        out.push(path);
      }
    }

    if (data.length < limit) break;
    offset += limit;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // --- Auth: must be an authenticated admin or manager ---
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    const user = userData?.user;
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [isAdmin, isManager, isSuperAdmin] = await Promise.all([
      admin.rpc("has_role", { _user_id: user.id, _role: "admin" }),
      admin.rpc("has_role", { _user_id: user.id, _role: "manager" }),
      admin.rpc("has_role", { _user_id: user.id, _role: "super_admin" }),
    ]);
    if (!(isAdmin.data === true || isManager.data === true || isSuperAdmin.data === true)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Optional body: { prefix?: string, expiresIn?: number, folders?: string[] }
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const rawBucket = typeof body.bucket === "string" && body.bucket.trim() ? body.bucket.trim() : DEFAULT_SOURCE_BUCKET;
    const sourceBucket = rawBucket.replace(/^\/+|\/+$/g, "").slice(0, 100);
    const rawPrefix = typeof body.prefix === "string" ? body.prefix : "";
    const prefix = rawPrefix.replace(/^\/+|\/+$/g, "").slice(0, 200);
    const expiresIn = typeof body.expiresIn === "number" && body.expiresIn > 0 && body.expiresIn <= 86400
      ? Math.floor(body.expiresIn)
      : 3600;
    const folderFilter = Array.isArray(body.folders)
      ? (body.folders as unknown[]).filter((f): f is string => typeof f === "string")
      : null;

    // --- 1. Enumerate immediate subfolders (each becomes its own zip) ---
    const groups: { name: string; prefix: string }[] = [];
    const rootFiles: string[] = [];
    {
      let offset = 0;
      const limit = 100;
      while (true) {
        const { data, error } = await admin.storage
          .from(sourceBucket)
          .list(prefix, { limit, offset, sortBy: { column: "name", order: "asc" } });
        if (error) throw new Error(`list("${prefix}") failed: ${error.message}`);
        if (!data || data.length === 0) break;
        for (const entry of data) {
          if (entry.name === ".emptyFolderPlaceholder") continue;
          const path = prefix ? `${prefix}/${entry.name}` : entry.name;
          if (entry.id === null || !entry.metadata) {
            groups.push({ name: entry.name, prefix: path });
          } else {
            rootFiles.push(path);
          }
        }
        if (data.length < limit) break;
        offset += limit;
      }
    }

    // Second level: for shallow containers like `customer/` and `estimate/`,
    // zip each child folder separately to keep memory bounded.
    const finalGroups: { name: string; prefix: string }[] = [];
    for (const g of groups) {
      let offset = 0;
      const limit = 100;
      const children: { name: string; prefix: string }[] = [];
      let hasFiles = false;
      while (true) {
        const { data, error } = await admin.storage
          .from(sourceBucket)
          .list(g.prefix, { limit, offset, sortBy: { column: "name", order: "asc" } });
        if (error) throw new Error(`list("${g.prefix}") failed: ${error.message}`);
        if (!data || data.length === 0) break;
        for (const entry of data) {
          if (entry.name === ".emptyFolderPlaceholder") continue;
          if (entry.id === null || !entry.metadata) {
            children.push({ name: `${g.name}-${entry.name}`, prefix: `${g.prefix}/${entry.name}` });
          } else {
            hasFiles = true;
          }
        }
        if (data.length < limit) break;
        offset += limit;
      }
      if (children.length > 0) {
        finalGroups.push(...children);
        if (hasFiles) finalGroups.push({ name: `${g.name}-root`, prefix: g.prefix });
      } else {
        finalGroups.push(g);
      }
    }
    if (rootFiles.length > 0) finalGroups.push({ name: "_root", prefix: prefix || "" });

    const targets = folderFilter
      ? finalGroups.filter((g) => folderFilter.includes(g.name) || folderFilter.includes(g.prefix))
      : finalGroups;

    if (targets.length === 0) {
      return new Response(JSON.stringify({ error: `No folders found in the "${sourceBucket}" bucket`, bucket: sourceBucket, prefix }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- listOnly: enumerate folders + file counts, no downloads/zipping ---
    if (body.listOnly === true) {
      const folders: { folder: string; prefix: string; file_count: number }[] = [];
      for (const group of targets) {
        const paths: string[] = [];
        if (group.name === "_root") {
          paths.push(...rootFiles);
        } else {
          await listRecursive(admin, sourceBucket, group.prefix, paths);
        }
        folders.push({ folder: group.name, prefix: group.prefix, file_count: paths.length });
      }
      return new Response(
        JSON.stringify({
          bucket: sourceBucket,
          folders,
          folder_count: folders.length,
          total_files: folders.reduce((n, f) => n + f.file_count, 0),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- signedUrlsOnly: return a signed URL per file, no downloads/zipping ---
    if (body.signedUrlsOnly === true) {
      const out: { folder: string; path: string; url: string }[] = [];
      for (const group of targets) {
        const paths: string[] = [];
        if (group.name === "_root") {
          paths.push(...rootFiles);
        } else {
          await listRecursive(admin, sourceBucket, group.prefix, paths);
        }
        for (let i = 0; i < paths.length; i += 100) {
          const chunk = paths.slice(i, i + 100);
          const { data, error } = await admin.storage
            .from(sourceBucket)
            .createSignedUrls(chunk, expiresIn);
          if (error) throw new Error(`Signed URLs failed: ${error.message}`);
          for (const row of data ?? []) {
            if (row.signedURL && row.path) out.push({ folder: group.name, path: row.path, url: row.signedURL });
          }
        }
      }
      return new Response(
        JSON.stringify({ bucket: sourceBucket, files: out, file_count: out.length, expires_in: expiresIn }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const archives: {
      folder: string;
      url: string;
      path: string;
      file_count: number;
      size_bytes: number;
    }[] = [];
    const skipped: { path: string; reason: string }[] = [];
    const emptyFolders: string[] = [];

    // --- 2. Zip + upload each folder independently ---
    for (const group of targets) {
      const paths: string[] = [];
      if (group.name === "_root") {
        paths.push(...rootFiles);
      } else {
        await listRecursive(admin, sourceBucket, group.prefix, paths);
      }
      if (paths.length === 0) {
        emptyFolders.push(group.name);
        continue;
      }

      const zipWriter = new ZipWriter(new BlobWriter("application/zip"));
      let added = 0;
      for (const path of paths) {
        const { data: file, error: dlErr } = await admin.storage.from(sourceBucket).download(path);
        if (dlErr || !file) {
          skipped.push({ path, reason: dlErr?.message ?? "download failed" });
          continue;
        }
        await zipWriter.add(path, new BlobReader(file), { level: 0 });
        added++;
      }
      const zipBlob: Blob = await zipWriter.close();

      if (added === 0) {
        skipped.push({ path: group.prefix, reason: "all downloads failed" });
        continue;
      }

      const safeName = group.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
      const zipPath = `${user.id}/${stamp}/${safeName}.zip`;
      const { error: upErr } = await admin.storage
        .from(DEST_BUCKET)
        .upload(zipPath, zipBlob, { contentType: "application/zip", upsert: true });
      if (upErr) throw new Error(`Zip upload failed for ${group.name}: ${upErr.message}`);

      const { data: signed, error: signErr } = await admin.storage
        .from(DEST_BUCKET)
        .createSignedUrl(zipPath, expiresIn, { download: `${safeName}.zip` });
      if (signErr || !signed?.signedUrl) {
        throw new Error(`Signed URL failed for ${group.name}: ${signErr?.message ?? "unknown"}`);
      }

      archives.push({
        folder: group.name,
        url: signed.signedUrl,
        path: zipPath,
        file_count: added,
        size_bytes: zipBlob.size,
      });
    }

    if (archives.length === 0) {
      return new Response(JSON.stringify({ error: "No files found to export", bucket: sourceBucket, prefix, skipped }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        bucket: sourceBucket,
        archives,
        archive_count: archives.length,
        total_files: archives.reduce((n, a) => n + a.file_count, 0),
        total_bytes: archives.reduce((n, a) => n + a.size_bytes, 0),
        expires_in: expiresIn,
        empty_folders: emptyFolders,
        skipped,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("export-attachments-zip error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
