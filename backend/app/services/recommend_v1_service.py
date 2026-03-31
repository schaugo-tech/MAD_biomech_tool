from __future__ import annotations

import math
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import PolynomialFeatures

from app.models.schemas import FrontendInputs


def clip01(x: float) -> float:
    return float(max(0.0, min(1.0, x)))


def minmax_norm(x: float, xmin: float, xmax: float) -> float:
    if xmax <= xmin:
        return 0.0
    return clip01((x - xmin) / (xmax - xmin))


def saturating_gain(x: float, k: float = 1.0) -> float:
    x = clip01(x)
    return float(1.0 - math.exp(-k * x))


SYMPTOM_MAP = {"mild": 0.25, "moderate": 0.60, "severe": 0.90}
COMPLAINT_MAP = {"low": 0.20, "medium": 0.55, "high": 0.90}
JOINT_STATE_MAP = {"none": 0.00, "click": 0.45, "lock": 0.95}
MOUTH_OPENING_STATE_TO_MM = {"normal": 45.0, "mildly_limited": 36.0, "limited": 28.0}
MOBILITY_MAP = {"stable": 0.15, "mild": 0.50, "obvious": 0.90}
BONE_LOSS_MAP = {"low": 0.20, "medium": 0.55, "high": 0.90}


@dataclass
class BackendScalars:
    d: float
    j: float
    p: float
    o: float


@dataclass
class ScoreWeights:
    benefit_mp: float = 0.45
    benefit_vo: float = 0.20
    risk_tmj: float = 0.20
    risk_pdl: float = 0.15
    low_pdl_ratio: float = 0.70
    up_pdl_ratio: float = 0.30


@dataclass
class ThresholdParams:
    tmj_base: float = 0.92
    tmj_penalty: float = 0.28
    pdl_base: float = 0.92
    pdl_penalty: float = 0.28


class RecommendV1Service:
    COL_MP = "下颌前伸量 /%"
    COL_VO = "垂直开口量 /mm"
    COL_TMJ = "关节盘应力最大值 /MPa"
    COL_LOW = "下前牙PDL应力最大值/kPa"
    COL_UP = "上前牙PDL应力最大值/kPa"

    def __init__(self):
        base_dir = Path(__file__).resolve().parents[2]
        primary = base_dir / 'data' / '关节盘及牙齿应力数据.xlsx'
        fallback = base_dir / 'data' / 'P491310E02_关节盘及牙齿应力数据V250225.xlsx'
        self.data_path = primary if primary.exists() else fallback
        self.weights = ScoreWeights()
        self.thresholds = ThresholdParams()

        self.df: Optional[pd.DataFrame] = None
        self.model_tmj: Optional[Pipeline] = None
        self.model_low: Optional[Pipeline] = None
        self.model_up: Optional[Pipeline] = None
        self.mp_values: List[float] = []
        self.vo_values: List[float] = []
        self.obs_minmax: Dict[str, Tuple[float, float]] = {}
        self.load_data()
        self.fit()

    def load_data(self) -> None:
        if not self.data_path.exists():
            raise FileNotFoundError(f"未找到数据文件: {self.data_path}")
        self.df = pd.read_excel(self.data_path)

        required = [self.COL_MP, self.COL_VO, self.COL_TMJ, self.COL_LOW, self.COL_UP]
        missing = [c for c in required if c not in self.df.columns]
        if missing:
            raise ValueError(f"Excel 缺少必要列: {missing}")

        self.mp_values = sorted(self.df[self.COL_MP].dropna().unique().tolist())
        self.vo_values = sorted(self.df[self.COL_VO].dropna().unique().tolist())
        self.obs_minmax = {
            "tmj": (float(self.df[self.COL_TMJ].min()), float(self.df[self.COL_TMJ].max())),
            "low": (float(self.df[self.COL_LOW].min()), float(self.df[self.COL_LOW].max())),
            "up": (float(self.df[self.COL_UP].min()), float(self.df[self.COL_UP].max())),
        }

    @staticmethod
    def _make_model() -> Pipeline:
        return Pipeline([
            ("poly", PolynomialFeatures(degree=2, include_bias=False)),
            ("ridge", Ridge(alpha=1.0)),
        ])

    def fit(self) -> None:
        if self.df is None:
            self.load_data()
        x = self.df[[self.COL_MP, self.COL_VO]].values
        self.model_tmj = self._make_model().fit(x, self.df[self.COL_TMJ].values)
        self.model_low = self._make_model().fit(x, self.df[self.COL_LOW].values)
        self.model_up = self._make_model().fit(x, self.df[self.COL_UP].values)

    def map_frontend(self, inputs: FrontendInputs) -> BackendScalars:
        return BackendScalars(
            d=self._map_treatment_need(inputs),
            j=self._map_tmj(inputs),
            p=self._map_periodontal(inputs),
            o=self._map_occlusal(inputs),
        )

    @staticmethod
    def _weighted_avg(parts: List[float], weights: List[float], fallback: float) -> float:
        if not parts:
            return fallback
        return clip01(sum(v * w for v, w in zip(parts, weights)) / sum(weights))

    def _map_treatment_need(self, inputs: FrontendInputs) -> float:
        t = inputs.treatment_need
        parts, weights = [], []
        if t.ahi is not None:
            parts.append(minmax_norm(t.ahi, 5.0, 60.0)); weights.append(0.50)
        if t.symptom_severity in SYMPTOM_MAP:
            parts.append(SYMPTOM_MAP[t.symptom_severity]); weights.append(0.30)
        if t.complaint_strength in COMPLAINT_MAP:
            parts.append(COMPLAINT_MAP[t.complaint_strength]); weights.append(0.20)
        return self._weighted_avg(parts, weights, 0.50)

    def _map_tmj(self, inputs: FrontendInputs) -> float:
        t = inputs.tmj_sensitivity
        parts, weights = [], []
        if t.pain_vas is not None:
            parts.append(minmax_norm(t.pain_vas, 0.0, 10.0)); weights.append(0.45)
        if t.joint_state in JOINT_STATE_MAP:
            parts.append(JOINT_STATE_MAP[t.joint_state]); weights.append(0.35)
        mm = t.mouth_opening_mm
        if mm is None and t.mouth_opening_state in MOUTH_OPENING_STATE_TO_MM:
            mm = MOUTH_OPENING_STATE_TO_MM[t.mouth_opening_state]
        if mm is not None:
            parts.append(clip01((45.0 - mm) / 20.0)); weights.append(0.20)
        return self._weighted_avg(parts, weights, 0.40)

    def _map_periodontal(self, inputs: FrontendInputs) -> float:
        p = inputs.periodontal
        parts, weights = [], []
        if p.mobility_state in MOBILITY_MAP:
            parts.append(MOBILITY_MAP[p.mobility_state]); weights.append(0.45)
        if p.bone_loss_state in BONE_LOSS_MAP:
            parts.append(BONE_LOSS_MAP[p.bone_loss_state]); weights.append(0.55)
        return self._weighted_avg(parts, weights, 0.35)

    @staticmethod
    def _map_occlusal(inputs: FrontendInputs) -> float:
        o = inputs.occlusal_need
        return clip01(0.45 * float(o.deep_overbite) + 0.35 * float(o.occlusal_interference) + 0.20 * float(o.anterior_crossbite))

    def _predict_raw(self, mp: float, vo: float) -> Dict[str, float]:
        x = np.array([[mp, vo]], dtype=float)
        return {
            "tmj": float(self.model_tmj.predict(x)[0]),
            "low": float(self.model_low.predict(x)[0]),
            "up": float(self.model_up.predict(x)[0]),
        }

    def _predict_risks(self, mp: float, vo: float) -> Dict[str, float]:
        raw = self._predict_raw(mp, vo)
        r_tmj = minmax_norm(raw["tmj"], *self.obs_minmax["tmj"])
        r_low = minmax_norm(raw["low"], *self.obs_minmax["low"])
        r_up = minmax_norm(raw["up"], *self.obs_minmax["up"])
        r_pdl = self.weights.low_pdl_ratio * r_low + self.weights.up_pdl_ratio * r_up
        return {**{f"raw_{k}": v for k, v in raw.items()}, "r_tmj": clip01(r_tmj), "r_low": clip01(r_low), "r_up": clip01(r_up), "r_pdl": clip01(r_pdl)}

    def _hard_constraints(self, r_tmj: float, r_pdl: float, j: float, p: float) -> Dict[str, Any]:
        tmj_cap = self.thresholds.tmj_base - self.thresholds.tmj_penalty * j
        pdl_cap = self.thresholds.pdl_base - self.thresholds.pdl_penalty * p
        tmj_ok = r_tmj <= tmj_cap
        pdl_ok = r_pdl <= pdl_cap
        feasible = tmj_ok and pdl_ok
        if feasible:
            factor = "feasible"
        else:
            factor = "tmj" if (tmj_cap - r_tmj) < (pdl_cap - r_pdl) else "pdl"
        return {
            "tmj_cap": clip01(tmj_cap), "pdl_cap": clip01(pdl_cap), "tmj_ok": tmj_ok,
            "pdl_ok": pdl_ok, "feasible": feasible, "limit_factor": factor,
        }

    def evaluate_point(self, mp: float, vo: float, scalars: BackendScalars) -> Dict[str, Any]:
        risks = self._predict_risks(mp, vo)
        benefit_mp = saturating_gain(minmax_norm(mp, min(self.mp_values), max(self.mp_values)), 0.9 + 1.1 * scalars.d)
        benefit_vo = saturating_gain(minmax_norm(vo, min(self.vo_values), max(self.vo_values)), 0.7 + 1.0 * scalars.o)
        constraints = self._hard_constraints(risks["r_tmj"], risks["r_pdl"], scalars.j, scalars.p)
        utility = (
            self.weights.benefit_mp * benefit_mp
            + self.weights.benefit_vo * benefit_vo
            - self.weights.risk_tmj * (0.5 + 0.5 * scalars.j) * risks["r_tmj"]
            - self.weights.risk_pdl * (0.5 + 0.5 * scalars.p) * risks["r_pdl"]
        )
        return {
            "mp": float(mp), "vo": float(vo), "benefit_mp": float(benefit_mp), "benefit_vo": float(benefit_vo),
            **risks, **constraints, "utility": float(utility),
        }

    def evaluate_grid(self, scalars: BackendScalars, mp_grid: Optional[List[float]] = None, vo_grid: Optional[List[float]] = None) -> List[Dict[str, Any]]:
        mps = mp_grid or self.mp_values
        vos = vo_grid or self.vo_values
        return [self.evaluate_point(float(mp), float(vo), scalars) for mp in mps for vo in vos]

    def recommend(self, scalars: BackendScalars, mp_grid: Optional[List[float]] = None, vo_grid: Optional[List[float]] = None) -> Dict[str, Any]:
        grid = self.evaluate_grid(scalars, mp_grid, vo_grid)
        feasible = sorted([g for g in grid if g["feasible"]], key=lambda x: x["utility"], reverse=True)
        if feasible:
            best, alternatives, status = feasible[0], feasible[1:4], "feasible_recommendation"
        else:
            ranked = sorted(grid, key=lambda x: x["utility"], reverse=True)
            best, alternatives, status = ranked[0], ranked[1:4], "approximate_recommendation"
        return {"status": status, "best": best, "alternatives": alternatives, "grid": grid}

    @staticmethod
    def build_chart_payload(recommendation: Dict[str, Any]) -> Dict[str, Any]:
        grid = recommendation["grid"]
        best = recommendation["best"]
        alternatives = recommendation["alternatives"]
        utility_heatmap = [[g["mp"], g["vo"], g["utility"]] for g in grid]
        factor_map = {"feasible": 0, "tmj": 1, "pdl": 2}
        limit_heatmap = [[g["mp"], g["vo"], factor_map.get(g["limit_factor"], -1)] for g in grid]
        radar = []
        for label, item in [("best", best)] + [(f"alt_{i+1}", it) for i, it in enumerate(alternatives)]:
            radar.append({
                "name": label,
                "mp": item["mp"],
                "vo": item["vo"],
                "values": {
                    "疗效收益": round(item["benefit_mp"], 4), "可行性收益": round(item["benefit_vo"], 4),
                    "TMJ风险": round(item["r_tmj"], 4), "前牙PDL风险": round(item["r_pdl"], 4),
                    "综合得分": round(item["utility"], 4),
                }
            })
        local_mp = sorted([g for g in grid if abs(g["vo"] - best["vo"]) < 1e-9], key=lambda x: x["mp"])
        local_vo = sorted([g for g in grid if abs(g["mp"] - best["mp"]) < 1e-9], key=lambda x: x["vo"])
        return {
            "best": best,
            "alternatives": alternatives,
            "heatmaps": {"utility": utility_heatmap, "limit_factor": limit_heatmap},
            "radar": radar,
            "curves": {"fix_vo_vary_mp": local_mp, "fix_mp_vary_vo": local_vo},
        }

    def get_meta(self) -> Dict[str, Any]:
        return {
            "engine_version": "MAD_v1",
            "data_file": self.data_path.name,
            "maps": {
                "symptom_severity": SYMPTOM_MAP,
                "complaint_strength": COMPLAINT_MAP,
                "joint_state": JOINT_STATE_MAP,
                "mouth_opening_state": MOUTH_OPENING_STATE_TO_MM,
                "mobility_state": MOBILITY_MAP,
                "bone_loss_state": BONE_LOSS_MAP,
            },
            "weights": self.weights.__dict__,
            "thresholds": self.thresholds.__dict__,
            "grid_defaults": {
                "mp_grid": list(np.arange(50, 70.1, 1.0)),
                "vo_grid": list(np.arange(3, 7.01, 0.25)),
            },
        }


recommend_v1_service = RecommendV1Service()
