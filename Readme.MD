# mini-redis

A distributed in-memory key-value store built from scratch in Node.js and TypeScript — inspired by Redis, implemented without using Redis, `Map`-as-a-black-box, or any caching library.

Built to understand *how* systems like Redis actually work internally: raw TCP networking, custom protocol design, hand-rolled data structures, O(1) cache eviction algorithms, and crash-recovery via a write-ahead log.

## Why this project exists

Most projects *use* Redis. This one *is* one — every core piece (the hash table, both eviction policies, the durability layer) is implemented from first principles rather than delegated to a library, in order to genuinely understand the mechanisms rather than just the API.

## Features

- **Raw TCP server** (Node's `net` module) — no HTTP, no REST, no framework
- **Custom newline-delimited wire protocol**, inspired by Redis's RESP, with correct handling of fragmented and coalesced TCP packets (see [Protocol](#protocol))
- **Hand-built hash table** with separate chaining for collision resolution — no built-in `Map`/object used internally
- **Two O(1) eviction policies**, selectable at runtime:
  - **LRU** (Least Recently Used) — doubly linked list + hash map
  - **LFU** (Least Frequently Used) — frequency buckets + hash maps
- **Write-Ahead Log (WAL)** for crash recovery — every mutation is durably logged before being applied to memory, and replayed on startup to reconstruct state after a crash or restart

## Architecture

```
Client (telnet / custom client)
        │  TCP, newline-delimited commands
        ▼
┌───────────────────┐
│   TCP Server       │  src/server/index.ts
│   (net.createServer)│
└─────────┬──────────┘
          │ parsed command + args
          ▼
┌───────────────────┐        ┌──────────────────┐
│  Cache (LRU / LFU)  │───────▶│ Hand-built        │
│  src/store/lru.ts   │        │ Hash Table         │
│  src/store/lfu.ts   │        │ src/store/         │
└─────────┬──────────┘        │ hashtable.ts       │
          │                    └──────────────────┘
          ▼
┌───────────────────┐
│ Write-Ahead Log     │  src/wal/wal.ts
│ (data.wal)          │  appended before every
└───────────────────┘  mutation is applied
```

## Protocol

See [docs/PROTOCOL.md](docs/PROTOCOL.md) for the full specification. Summary:

**Commands** (newline-terminated): `SET <key> <value>`, `GET <key>`, `DEL <key>`

**Responses:** `+OK` (success), `$<value>` (GET hit), `$-1` (GET miss / nil), `-ERR <message>` (error)

The server buffers incoming bytes per-connection and only processes a command once a complete line (`\n`-terminated) has arrived — necessary because TCP delivers a byte stream with no guaranteed message boundaries, so a single command can arrive split across multiple reads, or multiple commands can arrive coalesced into one.

## Eviction policies

Both policies support O(1) `get`, `set`, and eviction — no scanning required on any operation.

- **LRU** (`src/store/lru.ts`): a doubly linked list tracks usage order (most-recently-used at the head, least at the tail), while a hash map gives instant lookup of any key's node in that list, enabling O(1) reordering on every access.
- **LFU** (`src/store/lfu.ts`): every key has a frequency counter, incremented on each access. Keys are grouped into frequency buckets (`frequency → set of keys`), with the current minimum frequency tracked separately, so the least-frequently-used key can be found and evicted in O(1) without scanning all keys.

## Durability (Write-Ahead Log)

Every `SET`/`DEL` is appended to `data.wal` on disk *before* being applied to the in-memory cache. On startup, the server replays every logged command in order, reconstructing the exact in-memory state from before the last shutdown or crash.

Verified manually: populate the cache, force-kill the process (`Ctrl+C`), restart, and confirm all data is correctly restored via `GET`.

## Getting started

```bash
npm install
npm run dev -- lru   # or: npm run dev -- lfu
```

Connect with telnet (enable via `dism /online /Enable-Feature /FeatureName:TelnetClient` on Windows):

```bash
telnet localhost 5000
```

```
> SET name Vishnupriya
< +OK
> GET name
< $Vishnupriya
> DEL name
< +OK
> GET name
< $-1
```

## Design decisions & tradeoffs

- **Newline-delimited protocol over length-prefixed:** simpler to implement and debug (telnet-testable), at the cost of not being binary-safe (values can't contain `\n`). A length-prefixed protocol is a natural next step for binary safety.
- **`fs.appendFileSync` for WAL writes:** deliberately synchronous/blocking, so a client never receives `+OK` before its write has actually landed on disk — avoiding a window where an acknowledged write could be lost on crash.
- **Small default cache capacity (3) for testing:** makes eviction behavior observable in a handful of commands rather than requiring hundreds of keys.

## Roadmap

- [ ] Snapshotting (periodic full-state dump + WAL truncation, so replay time doesn't grow unbounded)
- [ ] Consistent hashing for sharding across multiple server instances
- [ ] Replication across shards for fault tolerance
- [ ] Length-prefixed binary-safe protocol
- [ ] Load-testing / benchmarking suite (throughput, p99 latency, LRU vs LFU hit-rate comparison)

## Tech stack

Node.js, TypeScript, raw TCP (`net` module) — no external caching, database, or framework dependencies for the core engine.