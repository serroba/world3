import matplotlib

matplotlib.use("Agg")

from pyworld3.adapters.plotting import plot_world_variables
from pyworld3.application.ports import SimulationParams
from pyworld3.application.simulate import SimulationService


def test_plot_world_variables_produces_file(tmp_path):
    """Smoke test: plot_world_variables runs without error and saves a file."""
    service = SimulationService()
    result = service.run(
        SimulationParams(year_min=1900, year_max=1950, dt=1, pyear=1925, iphst=1925)
    )

    time = result.time
    var_names = ["pop", "nr"]
    var_data = [result.series[v].values for v in var_names]
    var_lims = [(min(d), max(d)) for d in var_data]

    plot_world_variables(
        time,
        var_data,
        var_names,
        var_lims,
        title="Smoke test",
    )

    outfile = tmp_path / "smoke.png"
    import matplotlib.pyplot as plt

    plt.savefig(outfile)
    plt.close("all")
    assert outfile.exists()
    assert outfile.stat().st_size > 0
