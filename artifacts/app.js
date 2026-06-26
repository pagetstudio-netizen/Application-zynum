// ZyNum – Plesk startup file (CommonJS)
// No build needed on server — dist files are committed to git.

if (!process.env.PORT) {
  process.env.PORT = "3000";
}

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "production";
}

try {
  require("./api-server/dist/index.cjs");
} catch (err) {
  console.error("Failed to start ZyNum server:", err);
  process.exit(1);
}
