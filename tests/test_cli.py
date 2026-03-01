import json
from unittest.mock import patch

from typer.testing import CliRunner

from pyworld3.adapters.cli import app

runner = CliRunner()


def test_simulate_default():
    result = runner.invoke(app, ["simulate"])
    assert result.exit_code == 0
    data = json.loads(result.stdout)
    assert "time" in data
    assert "series" in data


def test_simulate_pretty():
    result = runner.invoke(app, ["simulate", "--pretty"])
    assert result.exit_code == 0
    data = json.loads(result.stdout)
    assert "series" in data


def test_simulate_with_set():
    result = runner.invoke(app, ["simulate", "--set", "nri=2e12", "--pretty"])
    assert result.exit_code == 0
    data = json.loads(result.stdout)
    assert data["constants_used"]["nri"] == 2e12


def test_simulate_with_var():
    result = runner.invoke(app, ["simulate", "--var", "pop", "--var", "nr"])
    assert result.exit_code == 0
    data = json.loads(result.stdout)
    assert set(data["series"].keys()) == {"pop", "nr"}


def test_simulate_invalid_set_format():
    result = runner.invoke(app, ["simulate", "--set", "badformat"])
    assert result.exit_code == 1


def test_simulate_invalid_set_value():
    result = runner.invoke(app, ["simulate", "--set", "nri=notanumber"])
    assert result.exit_code == 1


def test_simulate_unknown_constant():
    result = runner.invoke(app, ["simulate", "--set", "bad_param=1"])
    assert result.exit_code == 1


def test_simulate_output_file(tmp_path):
    outfile = tmp_path / "result.json"
    result = runner.invoke(app, ["simulate", "--output", str(outfile)])
    assert result.exit_code == 0
    data = json.loads(outfile.read_text())
    assert "series" in data


def test_constants_command():
    result = runner.invoke(app, ["constants"])
    assert result.exit_code == 0
    data = json.loads(result.stdout)
    assert len(data) == 65


def test_variables_command():
    result = runner.invoke(app, ["variables"])
    assert result.exit_code == 0
    data = json.loads(result.stdout)
    assert "pop" in data


# --- Validation tests ---


def test_simulate_negative_constant():
    result = runner.invoke(app, ["simulate", "--set", "nri=-1"])
    assert result.exit_code == 1
    assert "nri" in result.output


def test_simulate_pyear_outside_range():
    result = runner.invoke(app, ["simulate", "--pyear", "2200"])
    assert result.exit_code == 1


def test_simulate_iphst_outside_range():
    result = runner.invoke(app, ["simulate", "--iphst", "1800"])
    assert result.exit_code == 1


def test_simulate_excessive_steps():
    result = runner.invoke(app, ["simulate", "--dt", "0.001"])
    assert result.exit_code == 1


def test_simulate_year_min_out_of_bounds():
    result = runner.invoke(app, ["simulate", "--year-min", "1000"])
    assert result.exit_code == 1


def test_simulate_year_max_out_of_bounds():
    result = runner.invoke(app, ["simulate", "--year-max", "3000"])
    assert result.exit_code == 1


# --- Describe / summary tests ---


def test_constants_describe():
    result = runner.invoke(app, ["constants", "--describe"])
    assert result.exit_code == 0
    assert "Population" in result.stdout
    assert "Capital" in result.stdout
    assert "Initial population 0-14" in result.stdout
    assert "Initial industrial capital" in result.stdout


def test_variables_describe():
    result = runner.invoke(app, ["variables", "--describe"])
    assert result.exit_code == 0
    assert "Population" in result.stdout
    assert "Resources" in result.stdout
    assert "Total population" in result.stdout
    assert "Life expectancy" in result.stdout


def test_simulate_summary():
    result = runner.invoke(app, ["simulate", "--summary"])
    assert result.exit_code == 0
    assert "World3 Simulation Summary" in result.stdout
    assert "pop" in result.stdout
    # Should NOT be valid JSON
    try:
        json.loads(result.stdout)
        is_json = True
    except json.JSONDecodeError:
        is_json = False
    assert not is_json


def test_simulate_summary_with_output_is_error(tmp_path):
    outfile = tmp_path / "result.json"
    result = runner.invoke(app, ["simulate", "--summary", "--output", str(outfile)])
    assert result.exit_code == 1


def test_simulate_summary_with_pretty_is_error():
    result = runner.invoke(app, ["simulate", "--summary", "--pretty"])
    assert result.exit_code == 1


def test_simulate_plot(tmp_path):
    plot_file = tmp_path / "test_plot.png"
    result = runner.invoke(app, ["simulate", "--plot", str(plot_file)])
    assert result.exit_code == 0
    assert plot_file.exists()
    assert plot_file.stat().st_size > 0


# --- Scenario file tests ---


def test_simulate_from_toml(tmp_path):
    scenario = tmp_path / "test.toml"
    scenario.write_text(
        'name = "Test"\ndescription = "Test scenario"\n\n[constants]\nnri = 2e12\n'
    )
    result = runner.invoke(app, ["simulate", "--from", str(scenario), "--pretty"])
    assert result.exit_code == 0
    data = json.loads(result.stdout)
    assert data["constants_used"]["nri"] == 2e12


def test_simulate_from_toml_with_set_override(tmp_path):
    """--set overrides constants from the TOML file."""
    scenario = tmp_path / "test.toml"
    scenario.write_text('name = "Test"\n\n[constants]\nnri = 2e12\n')
    result = runner.invoke(
        app, ["simulate", "--from", str(scenario), "--set", "nri=3e12", "--pretty"]
    )
    assert result.exit_code == 0
    data = json.loads(result.stdout)
    assert data["constants_used"]["nri"] == 3e12


def test_simulate_from_toml_with_output_variables(tmp_path):
    scenario = tmp_path / "test.toml"
    scenario.write_text(
        'name = "Test"\noutput_variables = ["pop", "nr"]\n\n[constants]\n'
    )
    result = runner.invoke(app, ["simulate", "--from", str(scenario)])
    assert result.exit_code == 0
    data = json.loads(result.stdout)
    assert set(data["series"].keys()) == {"pop", "nr"}


def test_simulate_from_nonexistent_file():
    result = runner.invoke(app, ["simulate", "--from", "/nonexistent/file.toml"])
    assert result.exit_code == 1


def test_simulate_from_and_preset_mutually_exclusive(tmp_path):
    scenario = tmp_path / "test.toml"
    scenario.write_text('name = "Test"\n[constants]\n')
    result = runner.invoke(
        app, ["simulate", "--from", str(scenario), "--preset", "standard-run"]
    )
    assert result.exit_code == 1


# --- Preset tests ---


def test_presets_command():
    result = runner.invoke(app, ["presets"])
    assert result.exit_code == 0
    assert "standard-run" in result.stdout
    assert "doubled-resources" in result.stdout
    assert "optimistic-technology" in result.stdout
    assert "population-stability" in result.stdout
    assert "comprehensive-policy" in result.stdout


def test_simulate_with_preset():
    result = runner.invoke(app, ["simulate", "--preset", "standard-run", "--summary"])
    assert result.exit_code == 0
    assert "World3 Simulation Summary" in result.stdout


def test_simulate_with_preset_doubled_resources():
    result = runner.invoke(
        app, ["simulate", "--preset", "doubled-resources", "--pretty"]
    )
    assert result.exit_code == 0
    data = json.loads(result.stdout)
    assert data["constants_used"]["nri"] == 2e12


def test_simulate_unknown_preset():
    result = runner.invoke(app, ["simulate", "--preset", "nonexistent"])
    assert result.exit_code == 1
    assert "nonexistent" in result.output


# --- Compare command tests ---


def test_compare_two_presets():
    result = runner.invoke(
        app,
        ["compare", "--preset", "standard-run", "--preset", "optimistic-technology"],
    )
    assert result.exit_code == 0
    assert "Comparison:" in result.stdout
    assert "Standard Run" in result.stdout
    assert "Optimistic Technology" in result.stdout
    assert "Population" in result.stdout
    assert "Delta" in result.stdout


def test_compare_single_preset_vs_defaults():
    result = runner.invoke(app, ["compare", "--preset", "doubled-resources"])
    assert result.exit_code == 0
    assert "Standard Run" in result.stdout
    assert "Doubled Resources" in result.stdout


def test_compare_from_files(tmp_path):
    scenario_a = tmp_path / "a.toml"
    scenario_b = tmp_path / "b.toml"
    scenario_a.write_text('name = "Scenario A"\n[constants]\n')
    scenario_b.write_text('name = "Scenario B"\n[constants]\nnri = 2e12\n')
    result = runner.invoke(
        app, ["compare", "--from", str(scenario_a), "--from", str(scenario_b)]
    )
    assert result.exit_code == 0
    assert "Scenario A" in result.stdout
    assert "Scenario B" in result.stdout


def test_compare_no_scenarios():
    result = runner.invoke(app, ["compare"])
    assert result.exit_code == 1


def test_compare_too_many_scenarios():
    result = runner.invoke(
        app,
        [
            "compare",
            "--preset",
            "standard-run",
            "--preset",
            "doubled-resources",
            "--preset",
            "optimistic-technology",
        ],
    )
    assert result.exit_code == 1


def test_compare_with_plot(tmp_path):
    plot_file = tmp_path / "compare.png"
    result = runner.invoke(
        app,
        [
            "compare",
            "--preset",
            "standard-run",
            "--preset",
            "doubled-resources",
            "--plot",
            str(plot_file),
        ],
    )
    assert result.exit_code == 0
    assert plot_file.exists()
    assert plot_file.stat().st_size > 0


# --- Calibrate command tests ---


def _mock_calibrate_init(self, client=None):
    from pyworld3.adapters.owid.client import OWIDClient

    mock_client = OWIDClient.__new__(OWIDClient)
    mock_values = {
        "sp_pop_totl": 3.7e9,
        "sp_pop_0014_to_zs": 37.1,
        "sp_pop_1564_to_zs": 57.6,
        "sp_pop_65up_to_zs": 5.3,
        "sp_dyn_tfrt_in": 4.74,
        "ny_gdp_mktp_cd": 2.9e12,
        "nv_ind_totl_zs": 38.0,
        "ne_gdi_totl_zs": 25.0,
        "en_atm_co2e_pp_gd": 0.95,
    }
    mock_client.fetch_value = lambda parquet_url, column, year, **kw: mock_values.get(
        column
    )
    self._client = mock_client


def _mock_validate_init(self, client=None):
    from pyworld3.adapters.owid.client import OWIDClient

    mock_client = OWIDClient.__new__(OWIDClient)
    mock_ts = {
        "sp_pop_totl": (
            [1960, 1970, 1980, 1990, 2000, 2010, 2020],
            [3.0e9, 3.7e9, 4.4e9, 5.3e9, 6.1e9, 6.9e9, 7.8e9],
        ),
        "sp_dyn_le00_in": (
            [1960, 1970, 1980, 1990, 2000, 2010, 2020],
            [52.6, 58.8, 63.0, 65.4, 67.7, 70.6, 72.7],
        ),
        "sp_dyn_cbrt_in": (
            [1960, 1970, 1980, 1990, 2000, 2010, 2020],
            [34.9, 32.5, 28.3, 26.0, 21.5, 19.4, 17.9],
        ),
        "sp_dyn_cdrt_in": (
            [1960, 1970, 1980, 1990, 2000, 2010, 2020],
            [17.7, 12.4, 10.7, 9.4, 8.7, 7.9, 7.6],
        ),
    }

    def _fetch_ts(parquet_url, column, **kwargs):
        data = mock_ts.get(column)
        if data is None:
            return [], []
        years, values = data
        yr_min = kwargs.get("year_min")
        yr_max = kwargs.get("year_max")
        filtered = [
            (y, v)
            for y, v in zip(years, values)
            if (yr_min is None or y >= yr_min) and (yr_max is None or y <= yr_max)
        ]
        if not filtered:
            return [], []
        return ([float(y) for y, _ in filtered], [float(v) for _, v in filtered])

    mock_client.fetch_timeseries = _fetch_ts
    self._client = mock_client


_PATCH_CALIBRATE = patch(
    "pyworld3.application.calibrate.CalibrationService.__init__",
    _mock_calibrate_init,
)
_PATCH_VALIDATE = patch(
    "pyworld3.application.validate.ValidationService.__init__",
    _mock_validate_init,
)


def test_calibrate_default():
    with _PATCH_CALIBRATE:
        result = runner.invoke(app, ["calibrate"])
    assert result.exit_code == 0
    data = json.loads(result.stdout)
    assert data["reference_year"] == 1970
    assert "constants" in data


def test_calibrate_with_param():
    with _PATCH_CALIBRATE:
        result = runner.invoke(app, ["calibrate", "--param", "p1i"])
    assert result.exit_code == 0
    data = json.loads(result.stdout)
    assert "constants" in data


def test_calibrate_pretty():
    with _PATCH_CALIBRATE:
        result = runner.invoke(app, ["calibrate", "--pretty"])
    assert result.exit_code == 0
    data = json.loads(result.stdout)
    assert "constants" in data


def test_calibrate_output_file(tmp_path):
    outfile = tmp_path / "calibration.json"
    with _PATCH_CALIBRATE:
        result = runner.invoke(app, ["calibrate", "--output", str(outfile)])
    assert result.exit_code == 0
    data = json.loads(outfile.read_text())
    assert "constants" in data


# --- Validate command tests ---


def test_validate_default():
    with _PATCH_VALIDATE:
        result = runner.invoke(app, ["validate"])
    assert result.exit_code == 0
    data = json.loads(result.stdout)
    assert "metrics" in data
    assert "entity" in data


def test_validate_with_preset():
    with _PATCH_VALIDATE:
        result = runner.invoke(app, ["validate", "--preset", "standard-run"])
    assert result.exit_code == 0
    data = json.loads(result.stdout)
    assert "metrics" in data


def test_validate_summary():
    with _PATCH_VALIDATE:
        result = runner.invoke(app, ["validate", "--summary"])
    assert result.exit_code == 0
    assert "Validation Summary" in result.stdout


def test_validate_with_var():
    with _PATCH_VALIDATE:
        result = runner.invoke(app, ["validate", "--var", "pop"])
    assert result.exit_code == 0
    data = json.loads(result.stdout)
    assert "metrics" in data


def test_validate_output_file(tmp_path):
    outfile = tmp_path / "validation.json"
    with _PATCH_VALIDATE:
        result = runner.invoke(app, ["validate", "--output", str(outfile)])
    assert result.exit_code == 0
    data = json.loads(outfile.read_text())
    assert "metrics" in data


def test_validate_from_and_preset_mutually_exclusive(tmp_path):
    scenario = tmp_path / "test.toml"
    scenario.write_text('name = "Test"\n[constants]\n')
    result = runner.invoke(
        app, ["validate", "--from", str(scenario), "--preset", "standard-run"]
    )
    assert result.exit_code == 1
    assert "mutually exclusive" in result.output


def test_validate_unknown_preset():
    result = runner.invoke(app, ["validate", "--preset", "nonexistent"])
    assert result.exit_code == 1
    assert "nonexistent" in result.output
