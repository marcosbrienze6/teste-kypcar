export class InMemoryEventStore {
  constructor() {
    this.events = new Map();
  }

  async save(event) {
    this.events.set(event.id, event);
    return event;
  }

  async update(eventId, patch) {
    const current = this.events.get(eventId);

    if (!current) {
      return null;
    }

    const updated = {
      ...current,
      ...patch,
    };

    this.events.set(eventId, updated);
    return updated;
  }

  async findById(eventId) {
    return this.events.get(eventId) || null;
  }
}
