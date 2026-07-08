# Wire Protocol Specification

mini-redis uses a simple newline-delimited text protocol over raw TCP,
inspired by (but simpler than) Redis's RESP protocol.

## Design decisions

- **Newline-delimited**, not length-prefixed. Simpler to implement, debug,
  and test (you can `telnet` directly into the server). Tradeoff: values
  containing `\n` are not supported in this version. A length-prefixed
  binary-safe protocol is a natural v2 extension.
- **Space-separated commands**, no quoting support yet. Keys and values
  cannot contain spaces in v1.

## Commands (client → server)

| Command            | Description                     |
|---------------------|----------------------------------|
| `SET <key> <value>` | Store a value under a key       |
| `GET <key>`         | Retrieve the value for a key    |
| `DEL <key>`         | Delete a key                    |

Each command is terminated by `\n`.

## Responses (server → client)

| Prefix | Meaning                                  | Example        |
|--------|-------------------------------------------|-----------------|
| `+`    | Simple success status                     | `+OK`          |
| `$`    | Bulk value (successful GET)               | `$bar`         |
| `$-1`  | Nil — key not found                       | `$-1`          |
| `-`    | Error                                      | `-ERR unknown command` |

Each response is terminated by `\n`.

## Example session

```
> SET foo bar
< +OK
> GET foo
< $bar
> GET missing
< $-1
> DEL foo
< +OK
> DEL foo
< +OK
```

Note: DEL is idempotent — deleting a non-existent key still returns `+OK`
(this matches Redis's actual behavior).

## Framing / partial reads

Because TCP is a byte stream, a single `write()` from the client may
arrive across multiple `data` events on the server, and multiple
commands may arrive in a single `data` event. The server must buffer
incoming bytes and only process complete lines (up to and including `\n`).

This is handled in `src/server/` via a per-connection buffer that:
1. Appends incoming data to the buffer
2. Splits on `\n`
3. Processes all complete lines
4. Retains any trailing partial line for the next `data` event
