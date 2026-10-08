import { lstat, mkdir } from "node:fs/promises";
import { relative, resolve } from "node:path";

export async function s18ScreenshotPath(name: string): Promise<string> {
  const configured = process.env.S18_SCREENSHOT_DIR;
  if (!configured) throw new Error("S18_SCREENSHOT_DIR must point to this run's isolated screenshot directory");
  const directory = resolve(configured);
  const toolsRoot = resolve(".env.s18-tools");
  const pathFromRoot = relative(toolsRoot, directory).split(/[\\/]/);
  if (pathFromRoot.length !== 3 || pathFromRoot[0] !== "runs" || !/^[a-zA-Z0-9_-]{1,80}$/.test(pathFromRoot[1] ?? "") || pathFromRoot[2] !== "screenshots") {
    throw new Error("S18_SCREENSHOT_DIR must be .env.s18-tools/runs/<unique-run-id>/screenshots");
  }
  if (relative(toolsRoot, directory).startsWith("..")) throw new Error("S18 screenshot directory must remain under .env.s18-tools");
  if (!/^[a-zA-Z0-9_-]+\.(png|jpg)$/.test(name)) throw new Error("S18 screenshot filename is invalid");
  await mkdir(directory, { recursive: true });
  const output = resolve(directory, name);
  try {
    await lstat(output);
    throw new Error(`Refusing to overwrite existing S18 screenshot: ${name}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  return output;
}
