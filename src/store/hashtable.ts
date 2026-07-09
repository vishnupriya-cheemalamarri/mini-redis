// A hash table implemented from scratch, using separate chaining to
// handle collisions. Each bucket is an array of [key, value] pairs.

function hashString(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const charCode = key.charCodeAt(i);
    hash = (hash * 31 + charCode) % 1000000007;
  }
  return hash;
}

function getBucketIndex(key: string, numBuckets: number): number {
  const hash = hashString(key);
  return hash % numBuckets;
}

const NUM_BUCKETS = 16;
const buckets: [string, string][][] = [];

for (let i = 0; i < NUM_BUCKETS; i++) {
  buckets.push([]);
}

function set(key: string, value: string): void {
  const index = getBucketIndex(key, NUM_BUCKETS);
  const bucket = buckets[index];

  for (let i = 0; i < bucket.length; i++) {
    if (bucket[i][0] === key) {
      bucket[i][1] = value; // key already exists, update in place
      return;
    }
  }

  bucket.push([key, value]); // new key, add fresh pair
}

function get(key: string): string | undefined {
  const index = getBucketIndex(key, NUM_BUCKETS);
  const bucket = buckets[index];

  for (let i = 0; i < bucket.length; i++) {
    if (bucket[i][0] === key) {
      return bucket[i][1];
    }
  }

  return undefined; // not found in this bucket
}

function del(key: string): void {
  const index = getBucketIndex(key, NUM_BUCKETS);
  const bucket = buckets[index];

  for (let i = 0; i < bucket.length; i++) {
    if (bucket[i][0] === key) {
      bucket.splice(i, 1); // remove this one pair from the bucket array
      return;
    }
  }
  // if not found, do nothing — matches DEL behavior in our protocol spec
}

export { set, get, del };