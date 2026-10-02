from typing import Any, Mapping

from cognitive.sim_introspection import normalize_sim_behavior


def handle_sim_introspection_behavior(message: Mapping[str, Any], send_to_worker) -> dict[str, Any]:
    """Forward a SIM behavior request and return its normalized result."""
    worker_response = send_to_worker(message)
    result = worker_response.get("result", {})
    return normalize_sim_behavior(result if isinstance(result, Mapping) else {})


def wrap_sim_behavior_response(worker_response: Mapping[str, Any]) -> dict[str, Any]:
    """Wrap normalized behavior in the standard kernel response envelope."""
    return {
        "ok": True,
        "messageId": worker_response.get("messageId"),
        "type": "introspection",
        "identity": worker_response.get("identity", {}),
        "route": ["introspection", "sim", "behavior"],
        "result": normalize_sim_behavior(worker_response.get("result", {})),
    }
