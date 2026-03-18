import fs from "node:fs/promises";
import path from "node:path";

export class FileWebhookRegistrationStore {
  constructor({ filePath }) {
    this.filePath = filePath;
  }

  async save(registration) {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(registration, null, 2));
    return registration;
  }

  async get() {
    try {
      const content = await fs.readFile(this.filePath, "utf8");
      return JSON.parse(content);
    } catch (error) {
      if (error.code === "ENOENT") {
        return null;
      }

      throw error;
    }
  }
}
