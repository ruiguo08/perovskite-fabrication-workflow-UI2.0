"""The transactional web persistence boundary.

:class:`WebRepository` owns every SQL statement for the application. The
implementation is split across the per-domain mixins composed below; shared
record types live in :mod:`.records`, cross-domain SQL helpers in
:mod:`.helpers`.
"""

from __future__ import annotations

from .admin import AdminMixin
from .base import WebRepositoryBase
from .baseline import BaselinesMixin
from .batch import FabricationBatchesMixin
from .campaign import CampaignsMixin
from .campaign_analysis import CampaignAnalysisMixin
from .condition import ConditionsMixin
from .experiment import ExperimentsMixin
from .identity import UsersMixin
from .material import MaterialsMixin
from .preset import LayerPresetsMixin
from .result import ResultsMixin


class WebRepository(
    ExperimentsMixin,
    BaselinesMixin,
    LayerPresetsMixin,
    MaterialsMixin,
    ResultsMixin,
    UsersMixin,
    AdminMixin,
    CampaignsMixin,
    CampaignAnalysisMixin,
    ConditionsMixin,
    FabricationBatchesMixin,
    WebRepositoryBase,
):
    """Persist web state through one shared transactional database boundary."""
