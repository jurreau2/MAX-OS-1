"""Normalized SIM behavior fields shared by introspection adapters."""
from typing import Any, Dict, Literal, Mapping, Optional, TypedDict

SimMode = Literal["idle", "planning", "running", "paused", "error"]
SimStatus = Literal["connected", "not_connected"]

class SimBehaviorState(TypedDict):
    mode: SimMode
    last_op: Optional[str]
    last_calc: Optional[str]
    last_map: Optional[str]
    last_pipe: Optional[str]
    last_expand: Optional[str]
    last_build: Optional[str]
    global_state: Dict[str, Any]
    status: SimStatus


def _field(value: Mapping[str, Any], snake: str, camel: str) -> Optional[str]:
    result = value.get(snake, value.get(camel))
    return result if result is None or isinstance(result, str) else None


def normalize_sim_behavior(raw: Mapping[str, Any] | None) -> SimBehaviorState:
    value = raw or {}
    mode = value.get("mode", "idle")
    if mode not in {"idle", "planning", "running", "paused", "error"}:
        mode = "idle"
    status = value.get("status", "connected")
    if status not in {"connected", "not_connected"}:
        status = "connected"
    global_state = value.get("global_state", value.get("global", {}))
    return {
        "mode": mode,
        "last_op": _field(value, "last_op", "lastOp"),
        "last_calc": _field(value, "last_calc", "lastCalc"),
        "last_map": _field(value, "last_map", "lastMap"),
        "last_pipe": _field(value, "last_pipe", "lastPipe"),
        "last_expand": _field(value, "last_expand", "lastExpand"),
        "last_build": _field(value, "last_build", "lastBuild"),
        "global_state": dict(global_state) if isinstance(global_state, Mapping) else {},
        "status": status,
    }
