type BrainEvent =
  | "note-created"
  | "note-updated"
  | "note-deleted"
  | "open-palette"
  | "open-capture";

/** Lightweight event bus to decouple note mutations from list refetches */
export const brainEvents = {
  emit(event: BrainEvent) {
    window.dispatchEvent(new CustomEvent(`brain:${event}`));
  },
  on(event: BrainEvent, handler: () => void) {
    const key = `brain:${event}`;
    window.addEventListener(key, handler);
    return () => window.removeEventListener(key, handler);
  },
};
