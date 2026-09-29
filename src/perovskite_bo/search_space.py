"""Search-space definitions shared by optimization strategies."""

from __future__ import annotations

from dataclasses import dataclass
from random import Random
from typing import Any, Mapping, Protocol, Sequence


class Parameter(Protocol):
    """A tunable parameter that can be sampled and validated.

    ``name`` is declared as a read-only property so the frozen dataclass
    parameters satisfy the protocol structurally (a settable protocol
    attribute would reject frozen instances).
    """

    @property
    def name(self) -> str: ...

    def sample(self, random: Random) -> Any: ...

    def contains(self, value: Any) -> bool: ...


@dataclass(frozen=True)
class FloatParameter:
    name: str
    lower: float
    upper: float

    def __post_init__(self) -> None:
        if self.lower > self.upper:
            raise ValueError(f"{self.name}: lower bound must not exceed upper bound")

    def sample(self, random: Random) -> float:
        return random.uniform(self.lower, self.upper)

    def contains(self, value: Any) -> bool:
        return isinstance(value, (int, float)) and not isinstance(value, bool) and self.lower <= value <= self.upper


@dataclass(frozen=True)
class IntegerParameter:
    name: str
    lower: int
    upper: int

    def __post_init__(self) -> None:
        if self.lower > self.upper:
            raise ValueError(f"{self.name}: lower bound must not exceed upper bound")

    def sample(self, random: Random) -> int:
        return random.randint(self.lower, self.upper)

    def contains(self, value: Any) -> bool:
        return isinstance(value, int) and not isinstance(value, bool) and self.lower <= value <= self.upper


@dataclass(frozen=True)
class ChoiceParameter:
    name: str
    choices: Sequence[Any]

    def __post_init__(self) -> None:
        if not self.choices:
            raise ValueError(f"{self.name}: at least one choice is required")

    def sample(self, random: Random) -> Any:
        return random.choice(self.choices)

    def contains(self, value: Any) -> bool:
        return value in self.choices


@dataclass(frozen=True)
class SearchSpace:
    """Collection of independently tunable process parameters."""

    parameters: Sequence[Parameter]

    def __post_init__(self) -> None:
        names = [parameter.name for parameter in self.parameters]
        if len(names) != len(set(names)):
            raise ValueError("search-space parameter names must be unique")

    def sample(self, random: Random) -> dict[str, Any]:
        return {parameter.name: parameter.sample(random) for parameter in self.parameters}

    def validate(self, values: dict[str, Any]) -> None:
        expected = {parameter.name for parameter in self.parameters}
        actual = set(values)
        if actual != expected:
            missing = sorted(expected - actual)
            unexpected = sorted(actual - expected)
            raise ValueError(f"search-space keys differ: missing={missing}, unexpected={unexpected}")
        for parameter in self.parameters:
            if not parameter.contains(values[parameter.name]):
                raise ValueError(f"{parameter.name} is outside the configured search space")


def search_space_from_spec(spec: Sequence[Mapping[str, Any]]) -> SearchSpace:
    """Build a :class:`SearchSpace` from JSON-able parameter specs.

    The spec shape is the one stored in ``perovskite_bo.bo_config``:
    ``{"name": str, "kind": "int"|"float", "lower": number, "upper": number}``
    or ``{"name": str, "kind": "choice", "choices": [value, ...]}``. Specs
    are plain data so a campaign's space can be supplied from configuration
    (today a module dict, later a database row) without touching this module.
    """

    parameters: list[Parameter] = []
    for entry in spec:
        if not isinstance(entry, Mapping):
            raise TypeError("each parameter spec must be a mapping")
        name = entry.get("name")
        if not isinstance(name, str) or not name.strip():
            raise ValueError("parameter spec requires a non-blank string name")
        kind = entry.get("kind")
        if kind == "int":
            parameters.append(IntegerParameter(name, *_spec_bounds(name, entry)))
        elif kind == "float":
            parameters.append(FloatParameter(name, *_spec_bounds(name, entry)))
        elif kind == "choice":
            choices = entry.get("choices")
            if (
                not isinstance(choices, Sequence)
                or isinstance(choices, (str, bytes))
                or not choices
            ):
                raise ValueError(f"{name}: choice parameters require a non-empty choices list")
            parameters.append(ChoiceParameter(name, list(choices)))
        else:
            raise ValueError(f"{name}: unsupported parameter kind {kind!r}")
    return SearchSpace(parameters)


def _spec_bounds(name: str, entry: Mapping[str, Any]) -> tuple[Any, Any]:
    lower = entry.get("lower")
    upper = entry.get("upper")
    for label, value in (("lower", lower), ("upper", upper)):
        if not isinstance(value, (int, float)) or isinstance(value, bool):
            raise ValueError(f"{name}: {label} bound must be a number")
    return lower, upper
