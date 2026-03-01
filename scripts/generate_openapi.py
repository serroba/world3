"""Export the FastAPI OpenAPI spec to docs/openapi.json."""

import json
from pathlib import Path

from pyworld3.adapters.api import app


def main() -> None:
    spec = app.openapi()
    out = Path("docs/openapi.json")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(spec, indent=2) + "\n")
    print(f"Written {out}")  # noqa: T201


if __name__ == "__main__":
    main()
