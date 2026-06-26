// ZyNum – Plesk startup file
// Before starting, build the project:
//   pnpm install
//   pnpm --filter @workspace/api-server run build
//   pnpm --filter @workspace/zynum run build

if (!process.env.PORT) {
  process.env.PORT = "3000";
}

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "production";
}

import("./api-server/dist/index.mjs").catch((err) => {
  console.error("Failed to start ZyNum server:", err);
  process.exit(1);
});
