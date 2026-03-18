export class InMemoryJobQueue {
  constructor({ logger, concurrency = 4 }) {
    this.logger = logger;
    this.concurrency = concurrency;
    this.pending = [];
    this.activeCount = 0;
  }

  async enqueue(job) {
    this.pending.push(job);
    this.#drain();
    return undefined;
  }

  #drain() {
    while (this.activeCount < this.concurrency && this.pending.length > 0) {
      const job = this.pending.shift();
      this.activeCount += 1;

      // Fire-and-forget execution keeps the webhook HTTP response detached from
      // upstream latency while still applying a bounded concurrency level.
      Promise.resolve()
        .then(() => job())
        .catch((error) => {
          this.logger.error("Background job execution failed", { error });
        })
        .finally(() => {
          this.activeCount -= 1;
          this.#drain();
        });
    }
  }
}
