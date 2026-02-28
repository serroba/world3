import numpy as np

from pyworld3 import World3

from .models import SimulationRequest, SimulationResponse, TimeSeriesOutput


class SimulationValidationError(ValueError):
    """Raised for validation errors in simulation inputs/outputs.

    This is a subclass of ValueError so existing code that catches ValueError
    continues to work, but it can be caught specifically to distinguish our
    validation messages from unexpected ValueErrors deeper in the stack.
    """


CONSTANT_DEFAULTS: dict[str, float] = {
    # Population sector
    "p1i": 65e7,
    "p2i": 70e7,
    "p3i": 19e7,
    "p4i": 6e7,
    "dcfsn": 3.8,
    "fcest": 4000,
    "hsid": 20,
    "ieat": 3,
    "len": 28,
    "lpd": 20,
    "mtfn": 12,
    "pet": 4000,
    "rlt": 30,
    "sad": 20,
    "zpgt": 4000,
    # Capital sector
    "ici": 2.1e11,
    "sci": 1.44e11,
    "iet": 4000,
    "iopcd": 400,
    "lfpf": 0.75,
    "lufdt": 2,
    "icor1": 3,
    "icor2": 3,
    "scor1": 1,
    "scor2": 1,
    "alic1": 14,
    "alic2": 14,
    "alsc1": 20,
    "alsc2": 20,
    "fioac1": 0.43,
    "fioac2": 0.43,
    # Agriculture sector
    "ali": 0.9e9,
    "pali": 2.3e9,
    "lfh": 0.7,
    "palt": 3.2e9,
    "pl": 0.1,
    "alai1": 2,
    "alai2": 2,
    "io70": 7.9e11,
    "lyf1": 1,
    "lyf2": 1,
    "sd": 0.07,
    "uili": 8.2e6,
    "alln": 1000,
    "uildt": 10,
    "lferti": 600,
    "ilf": 600,
    "fspd": 2,
    "sfpc": 230,
    # Pollution sector
    "ppoli": 2.5e7,
    "ppol70": 1.36e8,
    "ahl70": 1.5,
    "amti": 1,
    "imti": 10,
    "imef": 0.1,
    "fipm": 0.001,
    "frpm": 0.02,
    "ppgf1": 1,
    "ppgf2": 1,
    "ppgf21": 1,
    "pptd1": 20,
    "pptd2": 20,
    # Resource sector
    "nri": 1e12,
    "nruf1": 1,
    "nruf2": 1,
}

# (min, max) bounds for each constant. None means unbounded on that side.
CONSTANT_CONSTRAINTS: dict[str, tuple[float | None, float | None]] = {
    # Population initials (ge=0)
    "p1i": (0, None),
    "p2i": (0, None),
    "p3i": (0, None),
    "p4i": (0, None),
    # Population time delays / rates (gt=0)
    "dcfsn": (0, None),
    "fcest": (0, None),
    "hsid": (0, None),
    "ieat": (0, None),
    "len": (0, None),
    "lpd": (0, None),
    "mtfn": (0, None),
    "pet": (0, None),
    "rlt": (0, None),
    "sad": (0, None),
    "zpgt": (0, None),
    # Capital initials (ge=0)
    "ici": (0, None),
    "sci": (0, None),
    # Capital time delays / rates (gt=0)
    "iet": (0, None),
    "iopcd": (0, None),
    "lufdt": (0, None),
    # Capital multipliers / ratios (gt=0)
    "icor1": (0, None),
    "icor2": (0, None),
    "scor1": (0, None),
    "scor2": (0, None),
    "alic1": (0, None),
    "alic2": (0, None),
    "alsc1": (0, None),
    "alsc2": (0, None),
    # Fractions (ge=0, le=1)
    "lfpf": (0, 1),
    "fioac1": (0, 1),
    "fioac2": (0, 1),
    # Agriculture initials (ge=0)
    "ali": (0, None),
    "pali": (0, None),
    "io70": (0, None),
    "uili": (0, None),
    # Agriculture fractions / rates
    "lfh": (0, 1),
    "palt": (0, None),
    "pl": (0, 1),
    "alai1": (0, None),
    "alai2": (0, None),
    "lyf1": (0, None),
    "lyf2": (0, None),
    "sd": (0, None),
    "alln": (0, None),
    "uildt": (0, None),
    "lferti": (0, None),
    "ilf": (0, None),
    "fspd": (0, None),
    "sfpc": (0, None),
    # Pollution initials (ge=0)
    "ppoli": (0, None),
    "ppol70": (0, None),
    # Pollution rates / multipliers (gt=0)
    "ahl70": (0, None),
    "amti": (0, None),
    "imti": (0, None),
    "imef": (0, None),
    "fipm": (0, None),
    "frpm": (0, None),
    "ppgf1": (0, None),
    "ppgf2": (0, None),
    "ppgf21": (0, None),
    "pptd1": (0, None),
    "pptd2": (0, None),
    # Resource initial (ge=0)
    "nri": (0, None),
    # Resource multipliers (gt=0)
    "nruf1": (0, None),
    "nruf2": (0, None),
}

DEFAULT_OUTPUT_VARIABLES: list[str] = [
    "pop",
    "nr",
    "nrfr",
    "io",
    "iopc",
    "fpc",
    "f",
    "so",
    "sopc",
    "ppolx",
    "ppol",
    "al",
    "ly",
    "le",
    "cbr",
    "cdr",
    "fioaa",
    "fcaor",
    "tai",
    "aiph",
]


def _validate_constants(overrides: dict[str, float]) -> None:
    """Validate constant overrides against CONSTANT_CONSTRAINTS."""
    errors: list[str] = []
    for name, value in overrides.items():
        bounds = CONSTANT_CONSTRAINTS.get(name)
        if bounds is None:
            continue
        lo, hi = bounds
        if lo is not None and value < lo:
            errors.append(f"Constant '{name}' must be >= {lo}, got {value}")
        if hi is not None and value > hi:
            errors.append(f"Constant '{name}' must be <= {hi}, got {value}")
    if errors:
        raise SimulationValidationError("; ".join(errors))


def run_simulation(request: SimulationRequest) -> SimulationResponse:
    world3 = World3(
        year_min=request.year_min,
        year_max=request.year_max,
        dt=request.dt,
        pyear=request.pyear,
        iphst=request.iphst,
    )

    merged = dict(CONSTANT_DEFAULTS)
    if request.constants:
        unknown = set(request.constants) - set(CONSTANT_DEFAULTS)
        if unknown:
            raise SimulationValidationError(
                f"Unknown constants: {', '.join(sorted(unknown))}"
            )
        merged.update(request.constants)

    _validate_constants(merged)

    world3.init_world3_constants(**merged)
    world3.init_world3_variables()
    world3.set_world3_table_functions()
    world3.set_world3_delay_functions()
    world3.run_world3(fast=True)

    output_vars = request.output_variables or DEFAULT_OUTPUT_VARIABLES
    all_valid = set(DEFAULT_OUTPUT_VARIABLES) | set(CONSTANT_DEFAULTS)
    unknown_vars = [
        v for v in output_vars if v not in all_valid or not hasattr(world3, v)
    ]
    if unknown_vars:
        raise SimulationValidationError(
            f"Unknown output variables: {', '.join(unknown_vars)}"
        )

    series: dict[str, TimeSeriesOutput] = {}
    for var_name in output_vars:
        raw = getattr(world3, var_name)
        arr = np.asarray(raw, dtype=float)
        if np.any(np.isinf(arr)):
            raise SimulationValidationError(
                f"Infinite values encountered in simulation output for '{var_name}'"
            )
        nan_count = int(np.sum(np.isnan(arr)))
        if nan_count > 0:
            # Tolerate a single leading NaN (common initialization artifact in
            # delay-based World3 variables like cbr/cdr at t=0).  Anything
            # beyond that signals simulation divergence.
            leading_nan = np.isnan(arr[0]) if len(arr) > 0 else False
            if nan_count > 1 or (nan_count == 1 and not leading_nan):
                raise SimulationValidationError(
                    f"NaN values encountered in simulation output for"
                    f" '{var_name}'; the simulation likely diverged"
                )
            # Replace the single leading NaN with 0.0
            arr = arr.copy()
            arr[0] = 0.0
        series[var_name] = TimeSeriesOutput(name=var_name, values=arr.tolist())

    return SimulationResponse(
        year_min=request.year_min,
        year_max=request.year_max,
        dt=request.dt,
        time=world3.time.tolist(),
        constants_used=merged,
        series=series,
    )
