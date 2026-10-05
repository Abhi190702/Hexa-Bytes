"""WebSocket endpoint.

Phase 0: a heartbeat/echo so the realtime transport is wired and testable end to end.
No data streaming yet — the stress feed attaches here in Phase 2 via the
ConnectionManager + Redis pub/sub.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.realtime.connection_manager import ConnectionManager

router = APIRouter()
manager = ConnectionManager()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await manager.connect(websocket)
    try:
        while True:
            message = await websocket.receive_text()
            await websocket.send_text(f"ack:{message}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
