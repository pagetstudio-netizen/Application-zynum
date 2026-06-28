// ZyNum – Plesk startup file (CommonJS)
// No build needed on server — dist files are committed to git.
//
// The bundled api-server (dist/index.cjs) already:
//   1. Listens on PORT immediately (before DB init) — no Passenger timeout
//   2. Exposes /api/health with real DB + service status
//   3. Stays alive even if DB init fails, so /health shows the real error

if (!process.env.PORT) {
  process.env.PORT = "3000";
}

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "production";
}

var path = require("path");
var fs   = require("fs");

var distPath = path.join(__dirname, "api-server/dist/index.cjs");

if (!fs.existsSync(distPath)) {
  // Hard crash — Passenger will restart and show its own error page.
  // Check that git pull completed and dist/ files are present.
  throw new Error(
    "[ZyNum] Build not found: " + distPath +
    "\nRun: git pull  (dist/ files must be committed)"
  );
}

// Load the bundled server. It calls app.listen(PORT) synchronously so
// Passenger sees the port bound before this require() returns.
require(distPath);
