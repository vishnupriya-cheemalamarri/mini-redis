// LRU (Least Recently Used) cache.
// Combines a doubly linked list (tracks usage order, O(1) reordering)
// with a hash map (O(1) lookup of a key's node in the list).

class Node {
  key: string;
  value: string;
  prev: Node | null = null;
  next: Node | null = null;

  constructor(key: string, value: string) {
    this.key = key;
    this.value = value;
  }
}

class LRUCache {
  private capacity: number;
  private map: Map<string, Node>; // key -> node, for O(1) lookup
  private head: Node; // most recently used end (dummy node)
  private tail: Node; // least recently used end (dummy node)

  constructor(capacity: number) {
    this.capacity = capacity;
    this.map = new Map();

    // Dummy head/tail nodes simplify edge cases (empty list, single node)
    // so we never have to special-case "is this the first/last real node".
    this.head = new Node("", "");
    this.tail = new Node("", "");
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  private removeNode(node: Node): void {
    const prevNode = node.prev!;
    const nextNode = node.next!;
    prevNode.next = nextNode;
    nextNode.prev = prevNode;
  }

  private insertAtFront(node: Node): void {
    // Insert node right after the dummy head — the "most recently used" slot
    const firstRealNode = this.head.next!;

    node.prev = this.head;
    node.next = firstRealNode;
    this.head.next = node;
    firstRealNode.prev = node;
  }

  get(key: string): string | undefined {
    const node = this.map.get(key);
    if (!node) {
      return undefined;
    }

    // Accessing a key counts as "using" it — move to front
    this.removeNode(node);
    this.insertAtFront(node);

    return node.value;
  }

  set(key: string, value: string): void {
    const existing = this.map.get(key);

    if (existing) {
      // Key already present — update value, move to front
      existing.value = value;
      this.removeNode(existing);
      this.insertAtFront(existing);
      return;
    }

    // New key — check capacity before inserting
    if (this.map.size >= this.capacity) {
      // Evict the least recently used node — that's right before the dummy tail
      const lruNode = this.tail.prev!;
      this.removeNode(lruNode);
      this.map.delete(lruNode.key);
      console.log(`Evicted (LRU): ${lruNode.key}`);
    }

    const newNode = new Node(key, value);
    this.map.set(key, newNode);
    this.insertAtFront(newNode);
  }

  delete(key: string): void {
    const node = this.map.get(key);
    if (!node) {
      return;
    }
    this.removeNode(node);
    this.map.delete(key);
  }
}

export { LRUCache };