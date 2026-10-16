#!/usr/bin/env python3
"""Local doctor must report a missing gateway token file instead of crashing."""

from __future__ import annotations

import json
import os
import subprocess
import tempfile
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent / "openclaw_relay.py"


def main() -> None:
    with tempfile.TemporaryDirectory() as tmp_name:
        tmp = Path(tmp_name)
        acpx = tmp / "acpx"
        (acpx / "dist").mkdir(parents=True)
        (acpx / "dist" / "cli.js").write_text("process.exit(1)\n", encoding="utf-8")
        cwd = tmp / "cwd"
        cwd.mkdir()
        (cwd / ".acpxrc.json").write_text("{}\n", encoding="utf-8")
        env = os.environ.copy()
        env.pop("OPENCLAW_RELAY_GATEWAY_TOKEN_FILE", None)
        env.pop("OPENCLAW_RELAY_CWD", None)
        env.pop("OPENCLAW_RELAY_ACPX_REPO", None)
        proc = subprocess.run(
            [
                "python3",
                str(SCRIPT),
                "doctor",
                "--cwd",
                str(cwd),
                "--acpx-repo",
                str(acpx),
            ],
            text=True,
            capture_output=True,
            env=env,
            check=False,
        )
    if proc.returncode != 0 or "Traceback" in proc.stderr or "TypeError" in proc.stderr:
        print(proc.stdout)
        print(proc.stderr, file=__import__("sys").stderr)
        raise SystemExit(1)
    payload = json.loads(proc.stdout)
    if payload.get("ready") is not False:
        raise SystemExit(f"expected ready false, got {payload.get('ready')!r}")
    print("ok doctor missing token file exits 0 with ready false")


if __name__ == "__main__":
    main()
