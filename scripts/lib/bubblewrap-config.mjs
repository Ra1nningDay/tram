import { access, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export const bubblewrapHome = path.join(os.homedir(), ".bubblewrap");
export const bubblewrapConfigPath = path.join(bubblewrapHome, "config.json");

export async function readBubblewrapConfig() {
  try {
    const content = await readFile(bubblewrapConfigPath, "utf8");
    return JSON.parse(content);
  } catch {
    return undefined;
  }
}

export async function hasFile(filePath) {
  if (!filePath) {
    return false;
  }

  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function resolveJdkBinary(jdkPath, toolName) {
  if (!jdkPath) {
    return undefined;
  }

  return path.join(jdkPath, "bin", process.platform === "win32" ? `${toolName}.exe` : toolName);
}

export function resolveAndroidBinary(androidSdkPath, relativePath) {
  if (!androidSdkPath) {
    return undefined;
  }

  return path.join(
    androidSdkPath,
    ...relativePath.split("/"),
    process.platform === "win32" ? ".exe" : "",
  ).replace(`${path.sep}.exe`, ".exe");
}
