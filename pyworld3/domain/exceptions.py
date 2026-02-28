class SimulationValidationError(ValueError):
    """Raised for validation errors in simulation inputs/outputs.

    This is a subclass of ValueError so existing code that catches ValueError
    continues to work, but it can be caught specifically to distinguish our
    validation messages from unexpected ValueErrors deeper in the stack.
    """
