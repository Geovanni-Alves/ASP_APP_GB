// scripts/start-osrm.js
// Starts (or resumes) an OSRM container for local routing.
//
// - Checks if Docker is available
// - If the container doesn't exist, runs it with the right volume/ports
// - If it exists but is stopped, starts it
// - If it's already running, does nothing

const { execSync } = require("child_process");
const path = require("path");

// Adjust these via environment variables if needed
const DATA_DIR =
  process.env.OSRM_DATA_DIR ||
  "D:\\Codes\\ASP_APP_GB\\dashboard\\osrm\\osrm-data"; // absolute Windows path
const CONTAINER = process.env.OSRM_CONTAINER || "osrm-bc";
const IMAGE = "osrm/osrm-backend";
const PORT = process.env.OSRM_PORT || "5000"; // host port -> container 5000

function sh(cmd) {
  return execSync(cmd, { stdio: "pipe" }).toString().trim();
}

function existsContainer(name) {
  try {
    const out = sh(
      `docker ps -a --filter "name=${name}" --format "{{.Names}}"`
    );
    return out.split("\n").includes(name);
  } catch {
    return false;
  }
}

function isRunning(name) {
  try {
    const out = sh(`docker ps --filter "name=${name}" --format "{{.Names}}"`);
    return out.split("\n").includes(name);
  } catch {
    return false;
  }
}

function startOsrm() {
  console.log(`→ Checking OSRM container "${CONTAINER}"...`);

  // If the container does not exist, create and start it
  if (!existsContainer(CONTAINER)) {
    console.log("→ Container not found. Creating and starting...");
    // NOTE (Windows): use quotes and an absolute path for the bind mount.
    const cmd = [
      "docker run -d",
      `--name ${CONTAINER}`,
      "--restart unless-stopped",
      `-p ${PORT}:5000`,
      `-v "${DATA_DIR}:/data"`,
      IMAGE,
      "osrm-routed --algorithm mld /data/bc.osrm",
    ].join(" ");
    sh(cmd);
    console.log(`✓ OSRM is now running at http://localhost:${PORT}`);
    return;
  }

  // If the container exists but is stopped, start it
  if (!isRunning(CONTAINER)) {
    console.log("→ Container exists but is stopped. Starting...");
    sh(`docker start ${CONTAINER}`);
    console.log(`✓ OSRM is now running at http://localhost:${PORT}`);
  } else {
    console.log(`✓ OSRM is already running at http://localhost:${PORT}`);
  }
}

try {
  // Quick check: is Docker available?
  sh("docker --version");
} catch {
  console.error(
    "❌ Docker not found on PATH. Please install Docker Desktop and try again."
  );
  process.exit(1);
}

startOsrm();
