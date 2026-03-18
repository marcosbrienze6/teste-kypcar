export class GetEventStatusUseCase {
  constructor({ eventStore }) {
    this.eventStore = eventStore;
  }

  async execute({ eventId }) {
    return this.eventStore.findById(eventId);
  }
}
