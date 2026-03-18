import fs from "node:fs/promises";
import path from "node:path";

export class FileEventStore {
  constructor({ filePath }) {
    this.filePath = filePath;
    this.events = new Map();
    this.loaded = false;
  }

  async save(event) {
    await this.#ensureLoaded();
    this.events.set(event.id, event);
    await this.#flush();
    return event;
  }

  async update(eventId, patch) {
    await this.#ensureLoaded();
    const current = this.events.get(eventId);

    if (!current) {
      return null;
    }

    const updated = {
      ...current,
      ...patch,
    };

    this.events.set(eventId, updated);
    await this.#flush();
    return updated;
  }

  async findById(eventId) {
    await this.#ensureLoaded();
    return this.events.get(eventId) || null;
  }

  async #ensureLoaded() {
    if (this.loaded) {
      return;
    }

    try {
      const content = await fs.readFile(this.filePath, "utf8");
      const items = JSON.parse(content);
      this.events = new Map(items.map((event) => [event.id, event]));
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }

    this.loaded = true;
  }

  async #flush() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });

    // Persisting accepted/completed events gives us a minimal audit trail and
    // avoids losing the status lookup surface after a process restart.
    await fs.writeFile(
      this.filePath,
      JSON.stringify(Array.from(this.events.values()), null, 2),
    );
  }
}
