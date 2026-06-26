// ZyNum – Plesk startup file (CommonJS)
// No build needed on server — dist files are committed to git.

if (!process.env.PORT) {
  process.env.PORT = "3000";
}

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "production";
}

var http = require("http");
var path = require("path");
var fs = require("fs");

var port = Number(process.env.PORT);
var startedAt = new Date().toISOString();
var crashError = null;

// Start a minimal HTTP server FIRST so Passenger sees the port immediately.
// If the main app loads fine, it takes over. If it crashes, this server
// stays alive and reports the real error on /health.
var fallbackServer = http.createServer(function (req, res) {
  var body = JSON.stringify({
    status: "error",
    message: "Main application failed to load",
    error: crashError ? crashError.message : "Unknown error",
    stack: crashError ? crashError.stack : null,
    startedAt: startedAt,
    node: process.version,
    env: process.env.NODE_ENV,
    port: process.env.PORT,
    db: process.env.SUPABASE_DATABASE_URL
      ? "SUPABASE_DATABASE_URL set"
      : process.env.DATABASE_URL
      ? "DATABASE_URL set"
      : "NO DATABASE URL FOUND",
    cwd: process.cwd(),
    distExists: fs.existsSync(path.join(__dirname, "api-server/dist/index.cjs")),
  }, null, 2);

  res.writeHead(500, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  res.end(body);
});

fallbackServer.listen(port, function () {
  console.log("[ZyNum] Fallback diagnostic server listening on port " + port);

  // Now try to load the real app
  try {
    var distPath = path.join(__dirname, "api-server/dist/index.cjs");

    if (!fs.existsSync(distPath)) {
      throw new Error("Build file not found: " + distPath + " — did git pull include dist/?");
    }

    // Close fallback and hand off to the real app
    fallbackServer.close(function () {
      require(distPath);
    });
  } catch (err) {
    crashError = err;
    console.error("[ZyNum] STARTUP CRASH:", err.message);
    console.error(err.stack);
    // Fallback server stays alive — visit /health or any URL to see the error
  }
});
