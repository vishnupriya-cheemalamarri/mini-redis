// LFU (Least Frequently Used) cache.
// Uses frequency buckets: keys are grouped by how many times they've
// been used, so we can find "the least frequently used key" in O(1)
// without scanning every key's frequency.

class LFUCache {
  private capacity: number;
  private values: Map<string, string>;       // key -> value
  private freqs: Map<string, number>;         // key -> current frequency
  private buckets: Map<number, Set<string>>;  // frequency -> set of keys at that frequency
  private minFreq: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.values = new Map();
    this.freqs = new Map();
    this.buckets = new Map();
    this.minFreq = 0;
  }

  // Moves a key from its current frequency bucket to the next one up.
  // Called every time a key is touched (GET or SET on an existing key).
  private bumpFrequency(key: string): void {
    const oldFreq = this.freqs.get(key)!;
    const newFreq = oldFreq + 1;

    // Remove key from its old bucket
    const oldBucket = this.buckets.get(oldFreq)!;
    oldBucket.delete(key);

    // If that bucket is now empty, and it was the minimum, bump minFreq up
    if (oldBucket.size === 0) {
      if (this.minFreq === oldFreq) {
        this.minFreq = newFreq;
      }
      this.buckets.delete(oldFreq);
    }

    // Add key to its new bucket (create the bucket if needed)
    if (!this.buckets.has(newFreq)) {
      this.buckets.set(newFreq, new Set());
    }
    this.buckets.get(newFreq)!.add(key);

    this.freqs.set(key, newFreq);
  }

  get(key: string): string | undefined {
    if (!this.values.has(key)) {
      return undefined;
    }

    this.bumpFrequency(key);
    return this.values.get(key);
  }

  set(key: string, value: string): void {
    if (this.capacity <= 0) return;

    if (this.values.has(key)) {
      // Key already exists — just update value and bump frequency
      this.values.set(key, value);
      this.bumpFrequency(key);
      return;
    }

    // New key — check capacity first
    if (this.values.size >= this.capacity) {
      // Evict one key from the minFreq bucket (any key in it — here we
      // just take "the first one" via the Set's iteration order)
      const minBucket = this.buckets.get(this.minFreq)!;
      const evictKey = minBucket.values().next().value as string;

      minBucket.delete(evictKey);
      if (minBucket.size === 0) {
        this.buckets.delete(this.minFreq);
      }

      this.values.delete(evictKey);
      this.freqs.delete(evictKey);

      console.log(`Evicted (LFU): ${evictKey}`);
    }

    // Insert new key at frequency 1
    this.values.set(key, value);
    this.freqs.set(key, 1);

    if (!this.buckets.has(1)) {
      this.buckets.set(1, new Set());
    }
    this.buckets.get(1)!.add(key);

    this.minFreq = 1; // a brand new key always resets the minimum to 1
  }

  delete(key: string): void {
    if (!this.values.has(key)) return;

    const freq = this.freqs.get(key)!;
    const bucket = this.buckets.get(freq)!;
    bucket.delete(key);
    if (bucket.size === 0) {
      this.buckets.delete(freq);
    }

    this.values.delete(key);
    this.freqs.delete(key);
  }
}

export { LFUCache };