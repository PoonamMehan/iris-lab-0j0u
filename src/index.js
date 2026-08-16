const http = require("http");
const fs = require("fs");
const path = require("path");
const { listScores, addScore } = require("./scores");

const port = Number(process.env.PORT || 3000);
const publicDir = path.join(__dirname, "..", "public");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function sendJson(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 8192) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function serveStatic(reqPath, res) {
  let rel = reqPath === "/" ? "/index.html" : reqPath;
  rel = path.normalize(rel).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(publicDir, rel);
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  const method = req.method || "GET";

  if (url.pathname === "/health") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (url.pathname === "/api/scores" && method === "GET") {
    sendJson(res, 200, { scores: listScores() });
    return;
  }

  if (url.pathname === "/api/scores" && method === "POST") {
    try {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      const scores = addScore(body.name, body.score);
      sendJson(res, 201, { scores });
    } catch {
      sendJson(res, 400, { error: "invalid score payload" });
    }
    return;
  }

  if (method === "GET" || method === "HEAD") {
    serveStatic(url.pathname, res);
    return;
  }

  res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Method not allowed");
});

server.listen(port, "0.0.0.0", () => {
  console.log("listening on :" + port);
});
