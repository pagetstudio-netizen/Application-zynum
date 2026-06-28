const isProduction = process.env.NODE_ENV === "production";

function formatMsg(level: string, msg: string, data?: unknown): string {
  const ts = new Date().toISOString();
  const extra = data !== undefined ? ` ${JSON.stringify(data)}` : "";
  return `[${ts}] ${level.toUpperCase()} ${msg}${extra}`;
}

export const logger = {
  info:  (msg: string, data?: unknown) => console.log(formatMsg("info", msg, data)),
  warn:  (msg: string, data?: unknown) => console.warn(formatMsg("warn", msg, data)),
  error: (msg: string, data?: unknown) => console.error(formatMsg("error", msg, data)),
  debug: (msg: string, data?: unknown) => { if (!isProduction) console.debug(formatMsg("debug", msg, data)); },
};
