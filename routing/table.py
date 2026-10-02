"""Deterministic message type and kernel introspection route mappings."""

ROUTES = {
    "sim": ("cognitive",),
    "cognitive": ("cognitive",),
    "introspection.sim.behavior": ("cognitive",),
    "tec": ("orchestration",),
    "task": ("orchestration",),
    "substrate": ("substrate",),
    "governance": ("governance",),
    "universe.start": ("orchestration",),
    "universe.tick": ("orchestration",),
    "universe.state": ("orchestration",),
    "universe.umbrella": ("orchestration",),
    "ecosystem.step": ("cognitive", "orchestration", "substrate"),
}

# Kernel routes use the same segment representation as incoming envelopes.
# Keep this separate from ROUTES: Router.route() uses ROUTES as a message-type
# to scheduler-lane map.
INTROSPECTION_ROUTES = {
    ("introspection", "sim", "behavior"): "introspection.sim.behavior",
}

LANE_ACTIONS = {
    "cognitive": "cognitive.process",
    "orchestration": "orchestration.execute",
    "substrate": "substrate.write",
    "governance": "governance.inspect",
}

MESSAGE_ACTIONS = {
    "universe.start": "universe.start",
    "universe.tick": "universe.tick",
    "universe.state": "universe.read",
    "universe.umbrella": "universe.read",
}
