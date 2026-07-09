import net from "net";
import { set, get, del } from "../store/hashtable";

const PORT = 5000;

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
          set(key, value);
          console.log(`SET ${key} = ${value}`);
          socket.write("+OK\n");
          break;
        }
        case "GET": {
          const key = args[0];
          const value = get(key);
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
          del(key);
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

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});