// Write-Ahead Log (WAL).
// Every SET/DEL is appended to a log file *before* being applied to
// memory, so state can be reconstructed after a crash by replaying
// the log from the start.

import fs from "fs";

const WAL_PATH = "./data.wal";

// Appends one command to the log file. Called before applying the
// change to the in-memory cache.
function appendToLog(command: string): void {
  // "a" = append mode: adds to the end of the file, creates it if
  // it doesn't exist yet, never overwrites existing content.
  fs.appendFileSync(WAL_PATH, command + "\n");
}

// Reads the entire log file line by line, returning each command in
// the exact order it was originally written. Called once at startup.
function readLog(): string[] {
  if (!fs.existsSync(WAL_PATH)) {
    return []; // no log yet — fresh start, nothing to replay
  }

  const content = fs.readFileSync(WAL_PATH, "utf-8");

  return content
    .split("\n")
    .filter((line) => line.trim().length > 0); // drop empty trailing lines
}

export { appendToLog, readLog };