import { mkdir, readdir, rm, rename, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";

import {
  bubblewrapConfigPath,
  bubblewrapHome,
  hasFile,
  resolveAndroidBinary,
  resolveJdkBinary,
} from "./lib/bubblewrap-config.mjs";
import { runCommand } from "./lib/command-utils.mjs";

const args = new Set(process.argv.slice(2));
const skipJdkInstall = args.has("--skip-jdk-install");
const skipSdkPackages = args.has("--skip-sdk-packages");

const sdkZipUrl =
  "https://dl.google.com/android/repository/commandlinetools-win-14742923_latest.zip";
const sdkRoot = path.join(os.homedir(), "android-sdk", "cmdline-tools");
const sdkZipPath = path.join(
  os.homedir(),
  "android-sdk",
  "commandlinetools-win-14742923_latest.zip",
);
const extractedToolsPath = path.join(sdkRoot, "latest");
const tempExtractPath = path.join(sdkRoot, "tmp");

function resolvePowershell() {
  return path.join(process.env.ProgramFiles ?? "C:\\Program Files", "PowerShell", "7", "pwsh.exe");
}

async function findInstalledJdk17() {
  const candidates = [];

  if (process.env.JAVA_HOME) {
    candidates.push(process.env.JAVA_HOME);
  }

  const adoptiumRoot = path.join("C:\\Program Files", "Eclipse Adoptium");
  try {
    const entries = await readdir(adoptiumRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith("jdk-17")) {
        candidates.push(path.join(adoptiumRoot, entry.name));
      }
    }
  } catch {
    // No JDK installed yet.
  }

  for (const candidate of candidates) {
    if (await hasFile(resolveJdkBinary(candidate, "java"))) {
      return candidate;
    }
  }

  return undefined;
}

async function ensureJdk17() {
  let jdkPath = await findInstalledJdk17();
  if (jdkPath) {
    return jdkPath;
  }

  if (skipJdkInstall) {
    throw new Error("JDK 17 is not installed and --skip-jdk-install was used.");
  }

  await runCommand("winget", [
    "install",
    "--id",
    "EclipseAdoptium.Temurin.17.JDK",
    "--exact",
    "--accept-package-agreements",
    "--accept-source-agreements",
    "--disable-interactivity",
  ]);

  jdkPath = await findInstalledJdk17();
  if (!jdkPath) {
    throw new Error("JDK 17 installation completed, but the installed path could not be found.");
  }

  return jdkPath;
}

async function ensureCommandLineTools() {
  const sdkManagerPath = path.join(
    extractedToolsPath,
    "bin",
    process.platform === "win32" ? "sdkmanager.bat" : "sdkmanager",
  );
  if (await hasFile(sdkManagerPath)) {
    return sdkManagerPath;
  }

  await mkdir(sdkRoot, { recursive: true });

  const response = await fetch(sdkZipUrl);
  if (!response.ok) {
    throw new Error(`Failed to download Android command-line tools: ${response.status}`);
  }

  const zipBuffer = Buffer.from(await response.arrayBuffer());
  await writeFile(sdkZipPath, zipBuffer);

  await rm(tempExtractPath, { recursive: true, force: true });
  await rm(extractedToolsPath, { recursive: true, force: true });

  await runCommand(resolvePowershell(), [
    "-Command",
    `Expand-Archive -Path '${sdkZipPath}' -DestinationPath '${tempExtractPath}' -Force`,
  ]);

  await mkdir(extractedToolsPath, { recursive: true });
  const tempCmdlineToolsPath = path.join(tempExtractPath, "cmdline-tools");
  const entries = await readdir(tempCmdlineToolsPath, { withFileTypes: true });
  for (const entry of entries) {
    await rename(
      path.join(tempCmdlineToolsPath, entry.name),
      path.join(extractedToolsPath, entry.name),
    );
  }

  await rm(tempExtractPath, { recursive: true, force: true });

  if (!(await hasFile(sdkManagerPath))) {
    throw new Error("Android sdkmanager was not found after extraction.");
  }

  return sdkManagerPath;
}

async function acceptAndroidLicenses(sdkManagerPath, jdkPath) {
  await new Promise((resolve, reject) => {
    const sdkManagerCommand = `"${sdkManagerPath}" "--sdk_root=${extractedToolsPath}" --licenses`;
    const child = spawn(
      sdkManagerCommand,
      [],
      {
        stdio: ["pipe", "inherit", "inherit"],
        shell: true,
        env: {
          ...process.env,
          JAVA_HOME: jdkPath,
          PATH: `${path.join(jdkPath, "bin")}${path.delimiter}${process.env.PATH ?? ""}`,
        },
      },
    );

    for (let i = 0; i < 20; i += 1) {
      child.stdin.write("y\n");
    }
    child.stdin.end();

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`sdkmanager --licenses exited with code ${code ?? "unknown"}`));
    });
  });
}

async function installAndroidPackages(sdkManagerPath, jdkPath) {
  if (skipSdkPackages) {
    return;
  }

  const sdkManagerCommand =
    `"${sdkManagerPath}" "--sdk_root=${extractedToolsPath}" ` +
    "platform-tools build-tools;34.0.0 platforms;android-36";

  await new Promise((resolve, reject) => {
    const child = spawn(sdkManagerCommand, [], {
      shell: true,
      stdio: "inherit",
      env: {
        ...process.env,
        JAVA_HOME: jdkPath,
        PATH: `${path.join(jdkPath, "bin")}${path.delimiter}${process.env.PATH ?? ""}`,
      },
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`sdkmanager package install exited with code ${code ?? "unknown"}`));
    });
  });
}

async function writeBubblewrapConfig(jdkPath) {
  await mkdir(bubblewrapHome, { recursive: true });
  await writeFile(
    bubblewrapConfigPath,
    `${JSON.stringify(
      {
        jdkPath,
        androidSdkPath: extractedToolsPath,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

async function main() {
  if (process.platform !== "win32") {
    throw new Error("This setup script is intended for Windows hosts.");
  }

  const jdkPath = await ensureJdk17();
  const sdkManagerPath = await ensureCommandLineTools();

  await acceptAndroidLicenses(sdkManagerPath, jdkPath);
  await installAndroidPackages(sdkManagerPath, jdkPath);
  await writeBubblewrapConfig(jdkPath);

  const javaPath = resolveJdkBinary(jdkPath, "java");
  const keytoolPath = resolveJdkBinary(jdkPath, "keytool");
  const adbPath = resolveAndroidBinary(extractedToolsPath, "platform-tools/adb");
  const sdkmanagerPath = resolveAndroidBinary(extractedToolsPath, "bin/sdkmanager");

  console.log(`[toolchain] JDK: ${jdkPath}`);
  console.log(`[toolchain] Android SDK root: ${extractedToolsPath}`);
  console.log(`[toolchain] Bubblewrap config: ${bubblewrapConfigPath}`);
  console.log(`[toolchain] java: ${javaPath}`);
  console.log(`[toolchain] keytool: ${keytoolPath}`);
  console.log(`[toolchain] sdkmanager: ${sdkmanagerPath}`);
  console.log(`[toolchain] adb: ${adbPath}`);
}

await main();
