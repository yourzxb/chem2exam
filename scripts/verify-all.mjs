import { spawn } from "node:child_process";

const baseUrl = normalizeBaseUrl(process.env.VERIFY_BASE_URL ?? "http://127.0.0.1:4174");
const serverUrl = new URL(baseUrl);
const serverPort = serverUrl.port || (serverUrl.protocol === "https:" ? "443" : "80");

const setupCommands = [
  ["npm", ["run", "db:generate"]],
  ["npm", ["run", "db:push"]],
  ["npm", ["run", "db:seed"]],
  ["npm", ["run", "typecheck"]],
  ["npm", ["test"]],
  ["npm", ["run", "build"]]
];

const verificationCommands = [
  ["npm", ["run", "verify:smoke"]],
  ["npm", ["run", "verify:demo-login"]],
  ["npm", ["run", "verify:db-flow"]],
  ["npm", ["run", "verify:review-flow"]],
  ["npm", ["run", "verify:teacher-flow"]],
  ["npm", ["run", "verify:admin-flow"]]
];

let serverProcess;

try {
  for (const [command, args] of setupCommands) {
    await runCommand(command, args);
  }

  const usingExistingServer = await isChem2ExamReady();
  if (usingExistingServer) {
    console.log(`Using existing Chem2Exam server at ${baseUrl}`);
  } else {
    console.log(`Starting Chem2Exam server at ${baseUrl}`);
    serverProcess = spawn("npm", ["run", "start", "--", "-p", serverPort], {
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"]
    });
    serverProcess.stdout.on("data", (chunk) => process.stdout.write(chunk));
    serverProcess.stderr.on("data", (chunk) => process.stderr.write(chunk));
    await waitForServer();
  }

  for (const [command, args] of verificationCommands) {
    await runCommand(command, args, { VERIFY_BASE_URL: baseUrl });
  }

  console.log("Full local verification completed successfully.");
} finally {
  if (serverProcess) {
    serverProcess.kill("SIGINT");
  }
}

function runCommand(command, args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: { ...process.env, ...extraEnv },
      stdio: "inherit"
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code}`));
      }
    });
  });
}

async function waitForServer() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 30_000) {
    if (serverProcess?.exitCode !== null) {
      throw new Error(`Server exited before it became ready. Exit code: ${serverProcess.exitCode}`);
    }
    if (await isChem2ExamReady()) return;
    await sleep(500);
  }
  throw new Error(`Server did not become ready at ${baseUrl}`);
}

async function isChem2ExamReady() {
  try {
    const response = await fetch(baseUrl);
    if (!response.ok) return false;
    const text = await response.text();
    return text.includes("Chem2Exam") && text.includes("演示账号") && text.includes("/review");
  } catch {
    return false;
  }
}

function normalizeBaseUrl(value) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
