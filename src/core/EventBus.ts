// Minimal typed pub/sub bus. Channels are defined in CFG.events.channels (LIT-EVT-001).

export type EventMap = {
  'hud:time': { seconds: number };
  'hud:pos': { current: number; total: number };
  'hud:boost': { charge: number };
  'hud:airtime': { seconds: number; visible: boolean };
  'hud:minimap': { playerT: number; rivalsT: number[] };
  'fx:glitch': { durationMs: number };
  'fx:shake': { amp: number; durationMs: number };
  'fx:boostPulse': { active: boolean };
  'race:finish': { position: number; seconds: number };
};

type Handler<K extends keyof EventMap> = (payload: EventMap[K]) => void;

export class EventBus {
  private readonly listeners = new Map<keyof EventMap, Set<Handler<any>>>();

  on<K extends keyof EventMap>(channel: K, handler: Handler<K>): () => void {
    let set = this.listeners.get(channel);
    if (!set) {
      set = new Set();
      this.listeners.set(channel, set);
    }
    set.add(handler);
    return () => set!.delete(handler);
  }

  off<K extends keyof EventMap>(channel: K, handler: Handler<K>): void {
    this.listeners.get(channel)?.delete(handler);
  }

  emit<K extends keyof EventMap>(channel: K, payload: EventMap[K]): void {
    const set = this.listeners.get(channel);
    if (!set) return;
    for (const handler of set) {
      (handler as Handler<K>)(payload);
    }
  }
}
