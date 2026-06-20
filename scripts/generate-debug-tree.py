#!/usr/bin/env python3
"""Generate tree.json from DebugTreeInit.pdf structure."""

import json
from datetime import datetime, timezone

nodes = {}


def add(node_id, **kwargs):
    nodes[node_id] = {"id": node_id, **kwargs}


def dead_end(node_id, subsystem, text=None):
    add(
        node_id,
        type="solution",
        subsystem=subsystem,
        text=text or "No recorded fix for this path. Log this problem for the electrical lead.",
        tags=[],
        ifUnsolved=None,
    )


def solution(node_id, subsystem, text, tags=None, deadend=None):
    add(
        node_id,
        type="solution",
        subsystem=subsystem,
        text=text,
        tags=tags or [],
        ifUnsolved=deadend or f"{subsystem}_deadend_001",
    )


def question(node_id, subsystem, text, answers):
    add(node_id, type="question", subsystem=subsystem, text=text, answers=answers)


def action(node_id, subsystem, text, confirmation, next_id):
    add(
        node_id,
        type="action",
        subsystem=subsystem,
        text=text,
        confirmation=confirmation,
        next=next_id,
    )


def build_analog_branch(prefix, subsystem):
    """Shared analog-voltage diagnostic path (also reused for shift actuator OK path)."""
    d = f"{prefix}_deadend_001"
    dead_end(d, subsystem)

    solution(
        f"{prefix}_sol_supply_power",
        subsystem,
        "Supply the correct power to the sensor.",
        tags=["power", "sensor"],
        deadend=d,
    )
    solution(
        f"{prefix}_sol_supply_voltage",
        subsystem,
        "Supply the correct voltage level (check sensor datasheet — 5 V from ECU or 13 V from PDM).",
        tags=["power", "voltage"],
        deadend=d,
    )
    solution(
        f"{prefix}_sol_configure_av",
        subsystem,
        "Configure the correct AV input in MoTeC and ensure pullup control is on.",
        tags=["motec", "av-input", "pullup"],
        deadend=d,
    )
    solution(
        f"{prefix}_sol_switch_pin",
        subsystem,
        "Either switch M1 Tune to use that pin, or move the wire to the correct pin.",
        tags=["motec", "pinout"],
        deadend=d,
    )
    solution(
        f"{prefix}_sol_shear_rewire",
        subsystem,
        "Likely a shear in the signal wire — rewire the signal wire.",
        tags=["signal", "wiring", "shear"],
        deadend=d,
    )
    solution(
        f"{prefix}_sol_secure_ground",
        subsystem,
        "Secure the ground bolts.",
        tags=["ground"],
        deadend=d,
    )
    solution(
        f"{prefix}_sol_rewire_ground",
        subsystem,
        "Rewire the ground wire — shear found along the ground path.",
        tags=["ground", "wiring", "shear"],
        deadend=d,
    )
    solution(
        f"{prefix}_sol_repin",
        subsystem,
        "Re-pin or re-crimp the ring terminal — termination is bad.",
        tags=["connector", "termination"],
        deadend=d,
    )
    solution(
        f"{prefix}_sol_spacer",
        subsystem,
        "Add a spacer — DTM connector contact is improper.",
        tags=["dtm", "connector"],
        deadend=d,
    )
    solution(
        f"{prefix}_sol_double_check",
        subsystem,
        "Sensor works on the bench — you likely mis-checked power, ground, signal, or pinout. Double-check all four.",
        tags=["bench-test"],
        deadend=d,
    )
    solution(
        f"{prefix}_sol_use_other",
        subsystem,
        "Use the working replacement sensor on the car setup.",
        tags=["sensor", "spares"],
        deadend=d,
    )
    dead_end(f"{prefix}_deadend_002", subsystem, "No recorded fix after bench test and sensor swap.")

    question(
        f"{prefix}_001",
        subsystem,
        "Is the sensor getting power? (Check with multimeter)",
        [
            {"label": "Yes", "next": f"{prefix}_002"},
            {"label": "No", "next": f"{prefix}_sol_supply_power"},
        ],
    )
    question(
        f"{prefix}_002",
        subsystem,
        "Is it the right voltage level? (Check sensor datasheet — 5 V from ECU or 13 V from PDM)",
        [
            {"label": "Yes", "next": f"{prefix}_003"},
            {"label": "No", "next": f"{prefix}_sol_supply_voltage"},
        ],
    )
    question(
        f"{prefix}_003",
        subsystem,
        "Is the sensor grounded? (Check continuity to chassis ground)",
        [
            {"label": "Yes", "next": f"{prefix}_004"},
            {"label": "No", "next": f"{prefix}_005"},
        ],
    )
    question(
        f"{prefix}_004",
        subsystem,
        "Is there continuity from the MoTeC connector to the sensor signal wire?",
        [
            {"label": "Yes", "next": f"{prefix}_006"},
            {"label": "No", "next": f"{prefix}_007"},
        ],
    )
    question(
        f"{prefix}_006",
        subsystem,
        "Is it configured to the correct AV input in MoTeC? (Check MoTeC pinout)",
        [
            {"label": "Yes", "next": f"{prefix}_act_bench"},
            {"label": "No", "next": f"{prefix}_sol_configure_av"},
        ],
    )
    question(
        f"{prefix}_007",
        subsystem,
        "Is there continuity to any other MoTeC pins?",
        [
            {"label": "Yes", "next": f"{prefix}_sol_switch_pin"},
            {"label": "No", "next": f"{prefix}_sol_shear_rewire"},
        ],
    )
    question(
        f"{prefix}_005",
        subsystem,
        "Are the ground bolts secure?",
        [
            {"label": "Secure", "next": f"{prefix}_008"},
            {"label": "Not secure", "next": f"{prefix}_sol_secure_ground"},
        ],
    )
    question(
        f"{prefix}_008",
        subsystem,
        "Check for any shears along the ground wire.",
        [
            {"label": "Sheared", "next": f"{prefix}_sol_rewire_ground"},
            {"label": "Not sheared", "next": f"{prefix}_009"},
        ],
    )
    question(
        f"{prefix}_009",
        subsystem,
        "Are both sides of the wires properly terminated with pins or ring terminals?",
        [
            {"label": "Properly terminated", "next": f"{prefix}_010"},
            {"label": "Bad termination", "next": f"{prefix}_sol_repin"},
        ],
    )
    question(
        f"{prefix}_010",
        subsystem,
        "Is there proper contact between both sides of the DTM connector?",
        [
            {"label": "Proper", "next": d},
            {"label": "Improper", "next": f"{prefix}_sol_spacer"},
        ],
    )
    action(
        f"{prefix}_act_bench",
        subsystem,
        "Try the sensor with the bench power supply and a multimeter.",
        "Done — tested on bench",
        f"{prefix}_011",
    )
    question(
        f"{prefix}_011",
        subsystem,
        "Does the sensor work on the bench?",
        [
            {"label": "Works", "next": f"{prefix}_sol_double_check"},
            {"label": "Doesn't work", "next": f"{prefix}_012"},
        ],
    )
    question(
        f"{prefix}_012",
        subsystem,
        "Try another sensor.",
        [
            {"label": "Works", "next": f"{prefix}_sol_use_other"},
            {"label": "Doesn't work", "next": f"{prefix}_deadend_002"},
        ],
    )
    return f"{prefix}_001"


def build_digital_branch(prefix, subsystem):
    d = f"{prefix}_deadend_001"
    dead_end(d, subsystem)

    solution(
        f"{prefix}_sol_supply_power",
        subsystem,
        "Supply the correct power to the sensor.",
        tags=["power", "sensor"],
        deadend=d,
    )
    solution(
        f"{prefix}_sol_supply_voltage",
        subsystem,
        "Supply the correct voltage level (check sensor datasheet — 5 V from ECU or 13 V from PDM).",
        tags=["power", "voltage"],
        deadend=d,
    )
    solution(
        f"{prefix}_sol_configure_di",
        subsystem,
        "Configure the correct digital input in MoTeC and ensure pullup control is on.",
        tags=["motec", "digital-input", "pullup"],
        deadend=d,
    )
    solution(
        f"{prefix}_sol_switch_pin",
        subsystem,
        "Either switch M1 Tune to use that pin, or move the wire to the correct pin. Ensure pullup control is on.",
        tags=["motec", "pinout", "pullup"],
        deadend=d,
    )
    solution(
        f"{prefix}_sol_shear_rewire",
        subsystem,
        "Likely a shear in the signal wire — rewire the signal wire.",
        tags=["signal", "wiring", "shear"],
        deadend=d,
    )
    solution(
        f"{prefix}_sol_secure_ground",
        subsystem,
        "Secure the ground bolts.",
        tags=["ground"],
        deadend=d,
    )
    solution(
        f"{prefix}_sol_rewire_ground",
        subsystem,
        "Rewire the ground wire — shear found along the ground path.",
        tags=["ground", "wiring", "shear"],
        deadend=d,
    )
    solution(
        f"{prefix}_sol_repin",
        subsystem,
        "Re-pin or re-crimp the ring terminal — termination is bad.",
        tags=["connector", "termination"],
        deadend=d,
    )
    solution(
        f"{prefix}_sol_spacer",
        subsystem,
        "Add a spacer — DTM connector contact is improper.",
        tags=["dtm", "connector"],
        deadend=d,
    )
    solution(
        f"{prefix}_sol_double_check",
        subsystem,
        "Sensor works on the bench — you likely mis-checked power, ground, signal, or pinout. Double-check all four.",
        tags=["bench-test"],
        deadend=d,
    )
    solution(
        f"{prefix}_sol_use_other",
        subsystem,
        "Use the working replacement sensor on the car setup.",
        tags=["sensor", "spares"],
        deadend=d,
    )
    dead_end(f"{prefix}_deadend_002", subsystem, "No recorded fix after bench test and sensor swap.")

    question(
        f"{prefix}_001",
        subsystem,
        "Is the sensor getting power? (Check with multimeter)",
        [
            {"label": "Yes", "next": f"{prefix}_002"},
            {"label": "No", "next": f"{prefix}_sol_supply_power"},
        ],
    )
    question(
        f"{prefix}_002",
        subsystem,
        "Is it the right voltage level? (Check sensor datasheet — 5 V from ECU or 13 V from PDM)",
        [
            {"label": "Yes", "next": f"{prefix}_003"},
            {"label": "No", "next": f"{prefix}_sol_supply_voltage"},
        ],
    )
    question(
        f"{prefix}_003",
        subsystem,
        "Is the sensor grounded? (Check continuity to chassis ground)",
        [
            {"label": "Yes", "next": f"{prefix}_004"},
            {"label": "No", "next": f"{prefix}_005"},
        ],
    )
    question(
        f"{prefix}_004",
        subsystem,
        "Is there continuity from the MoTeC connector to the sensor signal wire?",
        [
            {"label": "Yes", "next": f"{prefix}_006"},
            {"label": "No", "next": f"{prefix}_007"},
        ],
    )
    question(
        f"{prefix}_006",
        subsystem,
        "Is it configured to the correct digital input in MoTeC with pullup control on? (Check MoTeC pinout)",
        [
            {"label": "Yes", "next": f"{prefix}_act_bench"},
            {"label": "No", "next": f"{prefix}_sol_configure_di"},
        ],
    )
    question(
        f"{prefix}_007",
        subsystem,
        "Is there continuity to any other MoTeC pins?",
        [
            {"label": "Yes", "next": f"{prefix}_sol_switch_pin"},
            {"label": "No", "next": f"{prefix}_sol_shear_rewire"},
        ],
    )
    question(
        f"{prefix}_005",
        subsystem,
        "Are the ground bolts secure?",
        [
            {"label": "Secure", "next": f"{prefix}_008"},
            {"label": "Not secure", "next": f"{prefix}_sol_secure_ground"},
        ],
    )
    question(
        f"{prefix}_008",
        subsystem,
        "Check for any shears along the ground wire.",
        [
            {"label": "Sheared", "next": f"{prefix}_sol_rewire_ground"},
            {"label": "Not sheared", "next": f"{prefix}_009"},
        ],
    )
    question(
        f"{prefix}_009",
        subsystem,
        "Are both sides of the wires properly terminated with pins or ring terminals?",
        [
            {"label": "Properly terminated", "next": f"{prefix}_010"},
            {"label": "Bad termination", "next": f"{prefix}_sol_repin"},
        ],
    )
    question(
        f"{prefix}_010",
        subsystem,
        "Is there proper contact between both sides of the DTM connector?",
        [
            {"label": "Proper", "next": d},
            {"label": "Improper", "next": f"{prefix}_sol_spacer"},
        ],
    )
    action(
        f"{prefix}_act_bench",
        subsystem,
        "Try the sensor with the bench power supply and a multimeter.",
        "Done — tested on bench",
        f"{prefix}_011",
    )
    question(
        f"{prefix}_011",
        subsystem,
        "Does the sensor work on the bench?",
        [
            {"label": "Works", "next": f"{prefix}_sol_double_check"},
            {"label": "Doesn't work", "next": f"{prefix}_012"},
        ],
    )
    question(
        f"{prefix}_012",
        subsystem,
        "Try another sensor.",
        [
            {"label": "Works", "next": f"{prefix}_sol_use_other"},
            {"label": "Doesn't work", "next": f"{prefix}_deadend_002"},
        ],
    )
    return f"{prefix}_001"


# --- Root ---
add(
    "root",
    type="question",
    subsystem=None,
    text="What's the situation?",
    answers=[
        {"label": "Existing sensor/actuator isn't working properly", "next": "sensor_001"},
        {"label": "Car won't turn on", "next": "power_001"},
        {"label": "Battery issues at drive", "next": "power_010"},
        {"label": "Drive feature won't work (shifting / launch / dash)", "next": "drive_001"},
    ],
)

# --- Sensor type picker (1) ---
ana_entry = build_analog_branch("ana", "sensor")
dig_entry = build_digital_branch("dig", "sensor")

dead_end("sensor_deadend_paddles", "sensor", "Shift paddles branch not yet documented — log this problem.")
dead_end("sensor_deadend_pump", "sensor", "Water pump branch not yet documented — log this problem.")
dead_end("sensor_deadend_fans", "sensor", "Fans branch not yet documented — log this problem.")

# CAN sensor branch (1.3)
dead_end("cans_deadend_001", "sensor", "No recorded fix for this CAN sensor path.")
solution(
    "cans_sol_misconfigured",
    "sensor",
    "Likely misconfigured CAN ID, bus, and/or baud rate — check datasheets and configure in MoTeC.",
    tags=["can", "motec", "configuration"],
    deadend="cans_deadend_001",
)
solution(
    "cans_sol_resistor_recrimp",
    "sensor",
    "Termination resistor is likely loose or fell out — re-crimp CAN Hi and Lo MoTeC pins with the 120 Ω resistor.",
    tags=["can", "termination", "motec"],
    deadend="cans_deadend_001",
)
solution(
    "cans_sol_use_other",
    "sensor",
    "Use the other sensor on the car setup.",
    tags=["can", "sensor", "spares"],
    deadend="cans_deadend_001",
)

question(
    "cans_001",
    "sensor",
    "What is the CAN bus diagnostic?",
    [
        {"label": "Bus off", "next": "cans_act_busoff"},
        {"label": "Bus OK (but no readings)", "next": "cans_010"},
    ],
)
action(
    "cans_act_busoff",
    "sensor",
    "Follow analog-style power, ground, and signal checks. Additionally check continuity, then measure resistance across CAN Hi and Lo.",
    "Done — checks complete",
    ana_entry,
)
question(
    "cans_010",
    "sensor",
    "Are you seeing messages of the expected CAN ID on the correct bus and baud rate in CAN Monitor? (Use MoTeC Utilities)",
    [
        {"label": "Yes", "next": "cans_sol_misconfigured"},
        {"label": "No", "next": "cans_011"},
    ],
)
question(
    "cans_011",
    "sensor",
    "Check resistance across CAN Hi and Lo — what is it reading?",
    [
        {"label": "100–120 Ω (correct)", "next": "cans_012"},
        {"label": "Anything else", "next": "cans_sol_resistor_recrimp"},
    ],
)
question(
    "cans_012",
    "sensor",
    "Try another sensor.",
    [
        {"label": "Works", "next": "cans_sol_use_other"},
        {"label": "Doesn't work", "next": "cans_deadend_001"},
    ],
)

# Shift actuator (1.4)
dead_end("shift_deadend_denied", "sensor", "Shift request denied — no documented fix yet. Log this problem.")
action(
    "shift_act_paddle",
    "sensor",
    "No shift requests in MoTeC — this is a shift paddle issue. Inspect shift paddles (see paddles branch).",
    "Done — inspected paddles",
    "sensor_deadend_paddles",
)
action(
    "shift_act_signal",
    "sensor",
    "Shift requests show OK — check power, ground, and signal continuity for both upshift and downshift signals.",
    "Done — starting signal path checks",
    ana_entry,
)

question(
    "shift_001",
    "sensor",
    "Are you seeing shift requests in MoTeC?",
    [
        {"label": "Yes", "next": "shift_002"},
        {"label": "No", "next": "shift_act_paddle"},
    ],
)
question(
    "shift_002",
    "sensor",
    "What are the shift request statuses showing?",
    [
        {"label": "OK", "next": "shift_act_signal"},
        {"label": "Denied", "next": "shift_deadend_denied"},
    ],
)

question(
    "sensor_001",
    "sensor",
    "What kind of sensor/actuator is it?",
    answers=[
        {"label": "Analog voltage (TPS, brake pressure, 0–5 V)", "next": ana_entry},
        {"label": "Digital input (wheel speed, on/off)", "next": dig_entry},
        {"label": "CAN sensor (lambda, IMU, 4-wire)", "next": "cans_001"},
        {"label": "Shift actuator (by the engine)", "next": "shift_001"},
        {"label": "Shift paddles (steering wheel)", "next": "sensor_deadend_paddles"},
        {"label": "Water pump", "next": "sensor_deadend_pump"},
        {"label": "Fans", "next": "sensor_deadend_fans"},
    ],
)

# --- Car won't turn on (2) ---
dead_end("power_deadend_starter_yes", "power", "Starter button lit but car won't start — branch not yet documented. Log this problem.")
dead_end("power_deadend_starter_no", "power", "Starter button not lit — branch not yet documented. Log this problem.")

question(
    "power_001",
    "power",
    "Is the starter button lighting up?",
    [
        {"label": "Yes", "next": "power_deadend_starter_yes"},
        {"label": "No", "next": "power_deadend_starter_no"},
    ],
)

# --- Battery issues (3) ---
dead_end("power_deadend_sharp", "power", "Sharp voltage drop-off — branch not yet documented. Log this problem.")
dead_end("power_deadend_decay", "power", "Steady voltage decay — branch not yet documented. Log this problem.")

question(
    "power_010",
    "power",
    "Check voltage logs — what do you see?",
    [
        {"label": "Sharp drop-off", "next": "power_deadend_sharp"},
        {"label": "Steady decay", "next": "power_deadend_decay"},
    ],
)

# --- Drive features (4) ---
dead_end("drive_deadend_shift", "drive", "Shifting feature branch not yet documented. Log this problem.")
dead_end("drive_deadend_launch", "drive", "Launch control branch not yet documented. Log this problem.")
dead_end("drive_deadend_dashboard", "drive", "Dash branch not yet documented. Log this problem.")

question(
    "drive_001",
    "drive",
    "What feature isn't working?",
    [
        {"label": "Shifting", "next": "drive_deadend_shift"},
        {"label": "Launch control", "next": "drive_deadend_launch"},
        {"label": "Dash", "next": "drive_deadend_dashboard"},
    ],
)

tree = {
    "version": "2.0",
    "lastModified": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "nodes": nodes,
}

if __name__ == "__main__":
    import pathlib

    out = pathlib.Path(__file__).resolve().parent.parent / "tree.json"
    out.write_text(json.dumps(tree, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(nodes)} nodes to {out}")
