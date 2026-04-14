const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // POST /upload — store encrypted file in R2
    if (request.method === "POST" && path === "/upload") {
      try {
        const formData = await request.formData();
        const file = formData.get("file");
        const clientId = formData.get("clientId");
        const fieldName = formData.get("fieldName");
        const catKey = formData.get("catKey");
        const fileName = formData.get("fileName");

        if (!file || !clientId || !fieldName) {
          return json({ error: "Missing required fields" }, 400);
        }

        const key = `${clientId}/${catKey}/${fieldName}/${Date.now()}_${fileName}`;
        await env.BHV_BUCKET.put(key, file.stream(), {
          httpMetadata: { contentType: file.type },
          customMetadata: { clientId, catKey, fieldName, fileName },
        });

        return json({ success: true, key }, 200);
      } catch (e) {
        return json({ error: e.message }, 500);
      }
    }

    // GET /files?clientId=xxx — list files for a client
    if (request.method === "GET" && path === "/files") {
      try {
        const clientId = url.searchParams.get("clientId");
        if (!clientId) return json({ error: "Missing clientId" }, 400);

        const list = await env.BHV_BUCKET.list({ prefix: `${clientId}/` });
        const files = list.objects.map(obj => ({
          key: obj.key,
          size: obj.size,
          uploaded: obj.uploaded,
          metadata: obj.customMetadata,
        }));

        return json({ files }, 200);
      } catch (e) {
        return json({ error: e.message }, 500);
      }
    }

    // GET /file?key=xxx — get a signed URL to download a file
    if (request.method === "GET" && path === "/file") {
      try {
        const key = url.searchParams.get("key");
        if (!key) return json({ error: "Missing key" }, 400);

        const object = await env.BHV_BUCKET.get(key);
        if (!object) return json({ error: "File not found" }, 404);

        const headers = new Headers(CORS);
        headers.set("Content-Type", object.httpMetadata?.contentType || "application/octet-stream");
        headers.set("Content-Disposition", `inline; filename="${key.split("/").pop()}"`);

        return new Response(object.body, { headers });
      } catch (e) {
        return json({ error: e.message }, 500);
      }
    }

    // DELETE /file?key=xxx — delete a file
    if (request.method === "DELETE" && path === "/file") {
      try {
        const key = url.searchParams.get("key");
        if (!key) return json({ error: "Missing key" }, 400);

        await env.BHV_BUCKET.delete(key);
        return json({ success: true }, 200);
      } catch (e) {
        return json({ error: e.message }, 500);
      }
    }

    return json({ error: "Not found" }, 404);
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
