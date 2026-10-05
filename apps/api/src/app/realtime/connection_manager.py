"""WebSocket connection registry + broadcast.

This is the seam where the realtime pipeline plugs in. Phase 0 is a single-process,
in-memory registry used only for a heartbeat endpoint. Phase 2 keeps this interface but
backs broadcast with Redis pub/sub so multiple API replicas fan out consistently.
"""

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: set[WebSocket] = set()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections.add(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        self._connections.discard(websocket)

    async def broadcast(self, message: str) -> None:
        for connection in list(self._connections):
            await connection.send_text(message)

    @property
    def count(self) -> int:
        return len(self._connections)
