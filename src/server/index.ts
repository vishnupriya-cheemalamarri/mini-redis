import net from "net";
import { LRUCache } from "../store/lru";
import { LFUCache } from "../store/lfu";
import { appendToLog, readLog } from "../wal/wal";

const PORT = 5000;
const CAPACITY = 3;

// Pick eviction policy via command line: npm run dev -- lfu
const policy = process.argv[2] || "lru";

const cache = policy === "lfu"
  ? new LFUCache(CAPACITY)
  : new LRUCache(CAPACITY);

console.log(`Using eviction policy: ${policy.toUpperCase()}`);

function applyCommand(command: string, args: string[]): void {
  switch (command) {
    case "SET": {
      const key = args[0];
      const value = args[1];
      cache.set(key, value);
      break;
    }
    case "DEL": {
      const key = args[0];
      cache.delete(key);
      break;
    }
  }
}

const server = net.createServer((socket) => {
  console.log("Client connected");

  let buffer = "";

  socket.on("data", (data) => {
    buffer += data.toString();

    let newlineIndex;
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);

      const parts = line.trim().split(" ");
      const command = parts[0];
      const args = parts.slice(1);

      switch (command) {
        case "SET": {
          const key = args[0];
          const value = args[1];
          appendToLog(`SET ${key} ${value}`);
          applyCommand(command, args);
          console.log(`SET ${key} = ${value}`);
          socket.write("+OK\n");
          break;
        }
        case "GET": {
          const key = args[0];
          const value = cache.get(key);
          console.log(`GET ${key} -> ${value}`);
          if (value === undefined) {
            socket.write("$-1\n");
          } else {
            socket.write(`$${value}\n`);
          }
          break;
        }
        case "DEL": {
          const key = args[0];
          appendToLog(`DEL ${key}`);
          applyCommand(command, args);
          console.log(`DEL ${key}`);
          socket.write("+OK\n");
          break;
        }
        default: {
          socket.write(`-ERR unknown command '${command}'\n`);
        }
      }
    }
  });

  socket.on("end", () => {
    console.log("Client disconnected");
  });
});

// Replay the WAL to restore state from before any crash/restart
const loggedCommands = readLog();
for (const entry of loggedCommands) {
  const parts = entry.trim().split(" ");
  const command = parts[0];
  const args = parts.slice(1);
  applyCommand(command, args);
}
console.log(`Replayed ${loggedCommands.length} commands from WAL`);

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});