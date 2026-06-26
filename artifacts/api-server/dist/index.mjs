import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
const require = createRequire(import.meta.url);
require(join(dirname(fileURLToPath(import.meta.url)), "index.cjs"));
