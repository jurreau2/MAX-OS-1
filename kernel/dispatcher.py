"""Dispatch kernel-level introspection routes into normalized responses."""

from typing import Any, Callable, Dict, Mapping

from cognitive.sim_introspection import normalize_sim_behavior
from routing.table import INTROSPECTION_ROUTES

WorkerSender = Callable[[Mapping[str, Any]], Mapping[str, Any]]


def handle_sim_introspection_behavior(
    message: Mapping[str, Any],
    send_to_worker: WorkerSender,
) -> Dict[str, Any]:
    """Forward a SIM behavior request and normalize the worker result."""
    worker_response = send_to_worker(message)
    result = worker_response.get("result", {})
    return normalize_sim_behavior(result if isinstance(result, Mapping) else {})


def dispatch_kernel_message(
    message: Mapping[str, Any],
    send_to_worker: WorkerSender,
) -> Dict[str, Any] | None:
    """Dispatch a registered introspection route using the standard envelope."""
    route = tuple(message.get("route", ()))
    route_name = INTROSPECTION_ROUTES.get(route)
    if route_name != "introspection.sim.behavior":
        return None

    return {
        "ok": True,
        "messageId": message.get("messageId", message.get("id")),
        "type": "introspection",
        "identity": message.get("identity", {}),
        "route": list(route),
        "result": handle_sim_introspection_behavior(message, send_to_worker),
    }
