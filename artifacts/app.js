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

// Global uncaught exception handler — keeps the process alive
// so the diagnostic server can still respond
process.on("uncaughtException", function (err) {
  console.error("[ZyNum] Uncaught exception:", err.message);
  console.error(err.stack);
  if (!crashError) crashError = err;
});

process.on("unhandledRejection", function (reason) {
  var err = reason instanceof Error ? reason : new Error(String(reason));
  console.error("[ZyNum] Unhandled rejection:", err.message);
  if (!crashError) crashError = err;
});

function makeDiagnosticResponse() {
  return JSON.stringify({
    status: "error",
    message: "Main application failed to load",
    error: crashError ? crashError.message : "Loading...",
    stack: crashError ? crashError.stack : null,
    startedAt: startedAt,
    node: process.version,
    env: process.env.NODE_ENV,
    port: process.env.PORT,
    db: process.env.SUPABASE_DATABASE_URL
      ? "SUPABASE_DATABASE_URL set"
      : process.env.DATABASE_URL
        ? "DATABASE_URL set"
        : "NO DATABASE URL FOUND — set SUPABASE_DATABASE_URL in Plesk",
    cwd: process.cwd(),
    distExists: fs.existsSync(path.join(__dirname, "api-server/dist/index.cjs")),
    distPath: path.join(__dirname, "api-server/dist/index.cjs"),
  }, null, 2);
}

// Phase 1: Start a minimal HTTP server immediately so Passenger
// sees the port as bound (prevents the "something went wrong" timeout).
var server = http.createServer(function (req, res) {
  var body = makeDiagnosticResponse();
  res.writeHead(500, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  res.end(body);
});

server.listen(port, function () {
  console.log("[ZyNum] Diagnostic server listening on port " + port);

  var distPath = path.join(__dirname, "api-server/dist/index.cjs");

  if (!fs.existsSync(distPath)) {
    crashError = new Error(
      "Build file not found: " + distPath +
      "\nDid 'git pull' include dist/ ? Check .gitignore"
    );
    console.error("[ZyNum] STARTUP ERROR:", crashError.message);
    return; // Stay alive as diagnostic server
  }

  // Phase 2: Close diagnostic server and hand off to the real app.
  // uncaughtException handler above will catch any crash in the real app.
  server.close(function () {
    console.log("[ZyNum] Handing off to main application...");
    try {
      require(distPath);
    } catch (err) {
      crashError = err;
      console.error("[ZyNum] STARTUP CRASH in main app:", err.message);
      console.error(err.stack);

      // Re-open diagnostic server so the error is visible in the browser
      server = http.createServer(function (req, res) {
        var body = makeDiagnosticResponse();
        res.writeHead(500, { "Content-Type": "application/json", "Cache-Control": "no-store" });
        res.end(body);
      });
      server.listen(port, function () {
        console.log("[ZyNum] Diagnostic server back on port " + port + " — visit /health to see error");
      });
    }
  });
});
