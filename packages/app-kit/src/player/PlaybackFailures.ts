const TTL_MS = 10 * 60_000;
const MAX_ENTRIES = 200;

export class PlaybackFailures {
  private entries = new Map<string, number>();

  private key(videoId: string, context: string | null) {
    return JSON.stringify([context, videoId]);
  }

  has(videoId: string, context: string | null, now = Date.now()) {
    const key = this.key(videoId, context);
    const expires = this.entries.get(key);
    if (expires === undefined) return false;
    if (expires <= now) {
      this.entries.delete(key);
      return false;
    }
    return true;
  }

  add(videoId: string, context: string | null, now = Date.now()) {
    const key = this.key(videoId, context);
    this.entries.delete(key);
    this.entries.set(key, now + TTL_MS);
    while (this.entries.size > MAX_ENTRIES) this.entries.delete(this.entries.keys().next().value!);
  }

  clear() { this.entries.clear(); }
}
