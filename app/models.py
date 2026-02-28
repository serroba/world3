from pydantic import BaseModel, Field, model_validator


class SimulationRequest(BaseModel):
    year_min: float = Field(
        default=1900, ge=1900, le=2500, description="Start year of the simulation"
    )
    year_max: float = Field(
        default=2100, ge=1900, le=2500, description="End year of the simulation"
    )
    dt: float = Field(
        default=0.5, gt=0, le=100, description="Time step of the simulation [year]"
    )
    pyear: float = Field(
        default=1975, description="Implementation date of new policies [year]"
    )
    iphst: float = Field(
        default=1940,
        description="Implementation date of new policy on health service time [year]",
    )
    constants: dict[str, float] | None = Field(
        default=None,
        description="Override any World3 constant by name (e.g. {'nri': 2e12})",
    )
    output_variables: list[str] | None = Field(
        default=None,
        description="Which output variables to return (default: a curated list)",
    )

    @model_validator(mode="after")
    def check_year_range(self):
        if self.year_max < self.year_min:
            raise ValueError(
                f"year_max ({self.year_max}) must be >= year_min ({self.year_min})"
            )
        if not (self.year_min <= self.pyear <= self.year_max):
            raise ValueError(
                f"pyear ({self.pyear}) must be within"
                f" [{self.year_min}, {self.year_max}]"
            )
        if not (self.year_min <= self.iphst <= self.year_max):
            raise ValueError(
                f"iphst ({self.iphst}) must be within"
                f" [{self.year_min}, {self.year_max}]"
            )
        steps = (self.year_max - self.year_min) / self.dt
        if steps > 100_000:
            raise ValueError(
                f"Too many time steps ({steps:.0f}); reduce the year range"
                f" or increase dt (max 100,000 steps)"
            )
        return self


class TimeSeriesOutput(BaseModel):
    name: str
    values: list[float]


class SimulationResponse(BaseModel):
    year_min: float
    year_max: float
    dt: float
    time: list[float]
    constants_used: dict[str, float]
    series: dict[str, TimeSeriesOutput]
