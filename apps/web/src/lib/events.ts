type BrainEvent =
  | "note-created"
  | "note-updated"
  | "note-deleted"
  | "open-palette"
  | "open-capture";

export const brainEvents = {
  emit(event: BrainEvent, detail?: unknown) {
    window.dispatchEvent(new CustomEvent(`brain:${event}`, { detail }));
  },
  on(event: BrainEvent, handler: (detail?: unknown) => void) {
    const key = `brain:${event}`;
    const listener = (e: Event) => handler((e as CustomEvent).detail);
    window.addEventListener(key, listener);
    return () => window.removeEventListener(key, listener);
  },
};
