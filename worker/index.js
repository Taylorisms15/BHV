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

    // GET /meta?key=xxx
    if (request.method === "GET" && path === "/meta") {
      try {
        const key = url.searchParams.get("key");
        if (!key) return json({ error: "Missing key" }, 400);
        const object = await env.BHV_BUCKET.get(`_meta/${key}.json`);
        if (!object) return json({ data: null }, 200);
        const text = await object.text();
        return json({ data: JSON.parse(text) }, 200);
      } catch (e) { return json({ error: e.message }, 500); }
    }

    // POST /meta?key=xxx
    if (request.method === "POST" && path === "/meta") {
      try {
        const key = url.searchParams.get("key");
        if (!key) return json({ error: "Missing key" }, 400);
        const body = await request.text();
        await env.BHV_BUCKET.put(`_meta/${key}.json`, body, {
          httpMetadata: { contentType: "application/json" },
        });
        return json({ success: true }, 200);
      } catch (e) { return json({ error: e.message }, 500); }
    }

    // POST /upload
    if (request.method === "POST" && path === "/upload") {
      try {
        const formData = await request.formData();
        const file = formData.get("file");
        const clientId = formData.get("clientId");
        const fieldName = formData.get("fieldName");
        const catKey = formData.get("catKey");
        const fileName = formData.get("fileName");
        if (!file || !clientId || !fieldName) return json({ error: "Missing required fields" }, 400);
        const key = `${clientId}/${catKey}/${fieldName}/${Date.now()}_${fileName}`;
        await env.BHV_BUCKET.put(key, file.stream(), {
          httpMetadata: { contentType: file.type },
          customMetadata: { clientId, catKey, fieldName, fileName },
        });
        return json({ success: true, key }, 200);
      } catch (e) { return json({ error: e.message }, 500); }
    }

    // POST /extract
    if (request.method === "POST" && path === "/extract") {
      try {
        const formData = await request.formData();
        const file = formData.get("file");
        const fileName = formData.get("fileName") || "";
        if (!file) return json({ error: "Missing file" }, 400);
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        const base64 = btoa(binary);
        const mimeType = file.type || "image/jpeg";
        const isPDF = mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
        const prompt = `Examine this document and extract:
1. Document type (e.g. Passport, Global Entry Card, Driver License, Trust Agreement, Property Deed, Medical Directive, Power of Attorney, etc.)
2. Expiration or review date if present (format: YYYY-MM-DD)
3. Full name on the document if present
Respond ONLY with valid JSON: {"documentType":"...","expiryDate":"YYYY-MM-DD or null","name":"... or null"}`;
        const content = isPDF
          ? [{ type:"document", source:{ type:"base64", media_type:"application/pdf", data:base64 } }, { type:"text", text:prompt }]
          : [{ type:"image",    source:{ type:"base64", media_type:mimeType,            data:base64 } }, { type:"text", text:prompt }];
        const claudeResp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type":"application/json", "x-api-key":env.ANTHROPIC_API_KEY, "anthropic-version":"2023-06-01" },
          body: JSON.stringify({ model:"claude-opus-4-5", max_tokens:256, messages:[{ role:"user", content }] }),
        });
        const claudeData = await claudeResp.json();
        const text = claudeData.content?.[0]?.text || "{}";
        let extracted = {};
        try { extracted = JSON.parse(text.replace(/```json|```/g,"").trim()); }
        catch { extracted = { documentType:null, expiryDate:null, name:null }; }
        return json({ success:true, ...extracted }, 200);
      } catch (e) { return json({ error: e.message }, 500); }
    }

    // GET /files?clientId=xxx
    if (request.method === "GET" && path === "/files") {
      try {
        const clientId = url.searchParams.get("clientId");
        if (!clientId) return json({ error: "Missing clientId" }, 400);
        const list = await env.BHV_BUCKET.list({ prefix: `${clientId}/` });
        const files = list.objects.map(obj => ({ key:obj.key, size:obj.size, uploaded:obj.uploaded, metadata:obj.customMetadata }));
        return json({ files }, 200);
      } catch (e) { return json({ error: e.message }, 500); }
    }

    // GET /file?key=xxx
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
      } catch (e) { return json({ error: e.message }, 500); }
    }

    // DELETE /file?key=xxx
    if (request.method === "DELETE" && path === "/file") {
      try {
        const key = url.searchParams.get("key");
        if (!key) return json({ error: "Missing key" }, 400);
        await env.BHV_BUCKET.delete(key);
        return json({ success: true }, 200);
      } catch (e) { return json({ error: e.message }, 500); }
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
