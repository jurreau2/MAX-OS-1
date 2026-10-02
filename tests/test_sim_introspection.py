from cognitive.sim_introspection import normalize_sim_behavior


def test_normalize_sim_behavior_accepts_snake_case_worker_payload():
    result = normalize_sim_behavior({
        "mode": "running", "last_op": "calc", "global_state": {"x": 1}, "status": "connected",
    })
    assert result["last_op"] == "calc"
    assert result["global_state"]["x"] == 1
