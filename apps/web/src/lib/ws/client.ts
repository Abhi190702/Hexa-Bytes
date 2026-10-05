import { env } from '@/lib/env';

// Thin WebSocket client foundation. Phase 2 wires this to the realtime stress feed
// (MQTT -> Redis -> WS broadcast). For now it only knows how to connect to the
// heartbeat endpoint; no message handling/business logic yet.
export function createSocket(path = '/ws'): WebSocket {
  const url = new URL(path, env.NEXT_PUBLIC_WS_URL);
  return new WebSocket(url.toString());
}
