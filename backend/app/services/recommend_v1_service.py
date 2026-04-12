from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import PolynomialFeatures

from app.models.schemas import FrontendInputs


def clip(x: float, lo: float, hi: float) -> float:
    return float(max(lo, min(hi, x)))


def clip01(x: float) -> float:
    return clip(x, 0.0, 1.0)


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
BONE_LOSS_MAP = {"none": 0.00, "low": 0.20, "medium": 0.55, "high": 0.90}


@dataclass
class BackendScalars:
    d: float
    j: float
    p: float
    o: float
    mp_target_pct: float
    vo_target_mm: float
    vo_need_label: str


@dataclass
class ScoreWeights:
    benefit_mp: float = 0.55
    benefit_vo_target: float = 0.30
    risk_tmj: float = 0.10
    risk_pdl: float = 0.05
    low_pdl_ratio: float = 0.70
    up_pdl_ratio: float = 0.30


@dataclass
class ThresholdParams:
    tmj_base: float = 1.00
    tmj_penalty: float = 0.55
    pdl_base: float = 1.00
    pdl_penalty: float = 0.35


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

    def load_data(self):
        if not self.data_path.exists():
            raise FileNotFoundError(f'未找到数据文件: {self.data_path}')
        self.df = pd.read_excel(self.data_path)
        required = [self.COL_MP, self.COL_VO, self.COL_TMJ, self.COL_LOW, self.COL_UP]
        missing = [c for c in required if c not in self.df.columns]
        if missing:
            raise ValueError(f'Excel 缺少必要列: {missing}')
        self.mp_values = sorted(self.df[self.COL_MP].dropna().unique().tolist())
        self.vo_values = sorted(self.df[self.COL_VO].dropna().unique().tolist())
        self.obs_minmax = {
            'tmj': (float(self.df[self.COL_TMJ].min()), float(self.df[self.COL_TMJ].max())),
            'low': (float(self.df[self.COL_LOW].min()), float(self.df[self.COL_LOW].max())),
            'up': (float(self.df[self.COL_UP].min()), float(self.df[self.COL_UP].max())),
        }

    @staticmethod
    def _make_model() -> Pipeline:
        return Pipeline([
            ('poly', PolynomialFeatures(degree=2, include_bias=False)),
            ('ridge', Ridge(alpha=1.0)),
        ])

    def fit(self):
        x = self.df[[self.COL_MP, self.COL_VO]].values
        self.model_tmj = self._make_model().fit(x, self.df[self.COL_TMJ].values)
        self.model_low = self._make_model().fit(x, self.df[self.COL_LOW].values)
        self.model_up = self._make_model().fit(x, self.df[self.COL_UP].values)

    def map_frontend(self, inputs: FrontendInputs) -> BackendScalars:
        o, vo_target, vo_label = self._map_occlusal_need(inputs)
        j = self._map_tmj_sensitivity(inputs)
        p = self._map_periodontal(inputs)
        mp_target = self._mp_target_from_limits(j, p)
        return BackendScalars(
            d=self._map_treatment_need(inputs),
            j=j,
            p=p,
            o=o,
            mp_target_pct=mp_target,
            vo_target_mm=vo_target,
            vo_need_label=vo_label,
        )

    @staticmethod
    def _merge(parts: List[float], weights: List[float], default: float) -> float:
        if not parts:
            return default
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
        return self._merge(parts, weights, 0.50)

    def _map_tmj_sensitivity(self, inputs: FrontendInputs) -> float:
        t = inputs.tmj_sensitivity
        parts, weights = [], []
        if t.pain_vas is not None:
            parts.append(minmax_norm(t.pain_vas, 0.0, 10.0)); weights.append(0.50)
        if t.joint_state in JOINT_STATE_MAP:
            parts.append(JOINT_STATE_MAP[t.joint_state]); weights.append(0.35)
        mouth_mm = t.mouth_opening_mm
        if mouth_mm is None and t.mouth_opening_state in MOUTH_OPENING_STATE_TO_MM:
            mouth_mm = MOUTH_OPENING_STATE_TO_MM[t.mouth_opening_state]
        if mouth_mm is not None:
            parts.append(clip01((45.0 - mouth_mm) / 20.0)); weights.append(0.15)
        return self._merge(parts, weights, 0.40)

    def _map_periodontal(self, inputs: FrontendInputs) -> float:
        p = inputs.periodontal
        parts, weights = [], []
        if p.mobility_state in MOBILITY_MAP:
            parts.append(MOBILITY_MAP[p.mobility_state]); weights.append(0.45)
        if p.bone_loss_state in BONE_LOSS_MAP:
            parts.append(BONE_LOSS_MAP[p.bone_loss_state]); weights.append(0.55)
        return self._merge(parts, weights, 0.35)

    @staticmethod
    def _map_occlusal_need(inputs: FrontendInputs) -> Tuple[float, float, str]:
        o = inputs.occlusal_need
        d = float(o.deep_overbite)
        i = float(o.occlusal_interference)
        c = float(o.anterior_crossbite)
        score = clip01(0.50 * d + 0.30 * i + 0.20 * c)

        if d >= 0.5:
            vo_pref = 5.8 + 0.8 * i + 0.6 * c
        else:
            vo_pref = 3.0 + 1.0 * i + 0.8 * c
        vo_pref = clip(vo_pref, 3.0, 7.0)

        mouth_state = inputs.tmj_sensitivity.mouth_opening_state or 'normal'
        vo_cap_map = {'normal': 7.0, 'mildly_limited': 6.5, 'limited': 5.5}
        vo_cap = vo_cap_map.get(mouth_state, 7.0)
        vo_target = min(vo_pref, vo_cap)

        if score < 0.10:
            label = 'very_low'
        elif score < 0.35:
            label = 'low'
        elif score < 0.70:
            label = 'medium'
        else:
            label = 'high'
        return score, vo_target, label

    @staticmethod
    def _mp_target_from_limits(j: float, p: float) -> float:
        h_mp = clip01(0.75 * j + 0.25 * p)
        return 70.0 - 20.0 * (h_mp ** 1.6)

    def _predict_raw(self, mp: float, vo: float) -> Dict[str, float]:
        x = np.array([[mp, vo]], dtype=float)
        return {
            'tmj': float(self.model_tmj.predict(x)[0]),
            'low': float(self.model_low.predict(x)[0]),
            'up': float(self.model_up.predict(x)[0]),
        }

    def _predict_risks(self, mp: float, vo: float) -> Dict[str, float]:
        raw = self._predict_raw(mp, vo)
        r_tmj = minmax_norm(raw['tmj'], *self.obs_minmax['tmj'])
        r_low = minmax_norm(raw['low'], *self.obs_minmax['low'])
        r_up = minmax_norm(raw['up'], *self.obs_minmax['up'])
        r_pdl = self.weights.low_pdl_ratio * r_low + self.weights.up_pdl_ratio * r_up
        return {
            'raw_tmj': raw['tmj'], 'raw_low': raw['low'], 'raw_up': raw['up'],
            'r_tmj': clip01(r_tmj), 'r_low': clip01(r_low), 'r_up': clip01(r_up), 'r_pdl': clip01(r_pdl),
        }

    @staticmethod
    def _benefit_mp(mp: float, mp_target_pct: float, sigma_mp: float = 4.5) -> float:
        return clip01(math.exp(-((mp - mp_target_pct) ** 2) / (2.0 * sigma_mp ** 2)))

    @staticmethod
    def _benefit_vo_target(vo: float, vo_target_mm: float, sigma_vo: float = 0.70) -> float:
        return clip01(math.exp(-((vo - vo_target_mm) ** 2) / (2.0 * sigma_vo ** 2)))

    def _hard_constraints(self, r_tmj: float, r_pdl: float, j: float, p: float) -> Dict[str, Any]:
        tmj_cap = self.thresholds.tmj_base - self.thresholds.tmj_penalty * j
        pdl_cap = self.thresholds.pdl_base - self.thresholds.pdl_penalty * p
        tmj_ok = r_tmj <= tmj_cap
        pdl_ok = r_pdl <= pdl_cap
        feasible = tmj_ok and pdl_ok
        if feasible:
            factor = 'feasible'
        else:
            factor = 'tmj' if (tmj_cap - r_tmj) < (pdl_cap - r_pdl) else 'pdl'
        return {'tmj_cap': clip01(tmj_cap), 'pdl_cap': clip01(pdl_cap), 'tmj_ok': tmj_ok, 'pdl_ok': pdl_ok, 'feasible': feasible, 'limit_factor': factor}

    def evaluate_point(self, mp: float, vo: float, s: BackendScalars) -> Dict[str, Any]:
        risks = self._predict_risks(mp, vo)
        benefit_mp = self._benefit_mp(mp, s.mp_target_pct)
        benefit_vo = self._benefit_vo_target(vo, s.vo_target_mm)
        constraints = self._hard_constraints(risks['r_tmj'], risks['r_pdl'], s.j, s.p)
        utility = (
            self.weights.benefit_mp * benefit_mp
            + self.weights.benefit_vo_target * benefit_vo
            - self.weights.risk_tmj * risks['r_tmj']
            - self.weights.risk_pdl * risks['r_pdl']
        )
        return {
            'mp': float(mp), 'vo': float(vo), 'benefit_mp': float(benefit_mp), 'benefit_vo': float(benefit_vo),
            'mp_target_pct': float(s.mp_target_pct), 'vo_target_mm': float(s.vo_target_mm), **risks, **constraints, 'utility': float(utility),
        }

    def evaluate_grid(self, s: BackendScalars, mp_grid: Optional[List[float]], vo_grid: Optional[List[float]]) -> List[Dict[str, Any]]:
        mps = mp_grid or self.mp_values
        vos = vo_grid or self.vo_values
        return [self.evaluate_point(float(mp), float(vo), s) for mp in mps for vo in vos]

    def recommend(self, scalars: BackendScalars, mp_grid: Optional[List[float]] = None, vo_grid: Optional[List[float]] = None) -> Dict[str, Any]:
        grid = self.evaluate_grid(scalars, mp_grid, vo_grid)
        feasible = sorted([g for g in grid if g['feasible']], key=lambda x: x['utility'], reverse=True)
        if feasible:
            best, alternatives, status = feasible[0], feasible[1:4], 'feasible_recommendation'
        else:
            best = None
            alternatives: List[Dict[str, Any]] = []
            status = 'approximate_recommendation'
            base_tmj_cap = clip01(self.thresholds.tmj_base - self.thresholds.tmj_penalty * scalars.j)
            base_pdl_cap = clip01(self.thresholds.pdl_base - self.thresholds.pdl_penalty * scalars.p)
            for relax in [1.05, 1.10]:
                tmj_cap = clip01(base_tmj_cap * relax)
                pdl_cap = clip01(base_pdl_cap * relax)
                relaxed = sorted(
                    [g for g in grid if g['r_tmj'] <= tmj_cap and g['r_pdl'] <= pdl_cap],
                    key=lambda x: x['utility'],
                    reverse=True,
                )
                if relaxed:
                    best, alternatives = relaxed[0], relaxed[1:4]
                    status = f'approximate_recommendation_relaxed_{int((relax - 1.0) * 100)}'
                    break
            if best is None:
                ranked = sorted(grid, key=lambda x: x['utility'], reverse=True)
                best, alternatives, status = ranked[0], ranked[1:4], 'approximate_recommendation_unconstrained'
        return {'status': status, 'best': best, 'alternatives': alternatives, 'grid': grid}

    def build_chart_payload(self, recommendation: Dict[str, Any]) -> Dict[str, Any]:
        grid = recommendation['grid']
        best = recommendation['best']
        alternatives = recommendation['alternatives']
        factor_map = {'feasible': 0, 'tmj': 1, 'pdl': 2}
        utility_heatmap = [[g['mp'], g['vo'], g['utility']] for g in grid]
        limit_heatmap = [[g['mp'], g['vo'], factor_map.get(g['limit_factor'], -1)] for g in grid]
        radar = []
        for label, item in [('best', best)] + [(f'alt_{i+1}', x) for i, x in enumerate(alternatives)]:
            radar.append({'name': label, 'mp': item['mp'], 'vo': item['vo'], 'values': {
                '疗效收益': round(item['benefit_mp'], 4), 'VO适配收益': round(item['benefit_vo'], 4),
                'TMJ风险': round(item['r_tmj'], 4), '前牙PDL风险': round(item['r_pdl'], 4), '综合得分': round(item['utility'], 4),
            }})
        local_mp = sorted([g for g in grid if abs(g['vo'] - best['vo']) < 1e-9], key=lambda x: x['mp'])
        local_vo = sorted([g for g in grid if abs(g['mp'] - best['mp']) < 1e-9], key=lambda x: x['vo'])
        utility_surface = [[g['mp'], g['vo'], g['utility']] for g in grid]
        tmj_surface = [[g['mp'], g['vo'], g['r_tmj']] for g in grid]
        pdl_surface = [[g['mp'], g['vo'], g['r_pdl']] for g in grid]
        recommend_points = {
            'utility': [{'name': 'best', 'value': [best['mp'], best['vo'], best['utility']]}] + [
                {'name': f'alt_{i+1}', 'value': [x['mp'], x['vo'], x['utility']]} for i, x in enumerate(alternatives)
            ],
            'tmj': [{'name': 'best', 'value': [best['mp'], best['vo'], best['r_tmj']]}] + [
                {'name': f'alt_{i+1}', 'value': [x['mp'], x['vo'], x['r_tmj']]} for i, x in enumerate(alternatives)
            ],
            'pdl': [{'name': 'best', 'value': [best['mp'], best['vo'], best['r_pdl']]}] + [
                {'name': f'alt_{i+1}', 'value': [x['mp'], x['vo'], x['r_pdl']]} for i, x in enumerate(alternatives)
            ],
        }
        return {
            'best': best,
            'alternatives': alternatives,
            'heatmaps': {'utility': utility_heatmap, 'limit_factor': limit_heatmap},
            'radar': radar,
            'curves': {'fix_vo_vary_mp': local_mp, 'fix_mp_vary_vo': local_vo},
            'surface3d': {'utility': utility_surface, 'tmj': tmj_surface, 'pdl': pdl_surface, 'recommend_points': recommend_points},
            'meta': {'vo_target_mm': best['vo_target_mm'], 'chart_note': 'surface3D 数据给 ECharts-GL 使用'},
        }

    def build_echarts_gl_option_templates(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        utility_surface = payload['surface3d']['utility']
        tmj_surface = payload['surface3d']['tmj']
        pdl_surface = payload['surface3d']['pdl']
        points = payload['surface3d']['recommend_points']
        base_axes = {
            'xAxis3D': {'type': 'value', 'name': 'MP(%)'},
            'yAxis3D': {'type': 'value', 'name': 'VO(mm)'},
            'grid3D': {'viewControl': {'projection': 'perspective'}, 'boxWidth': 120, 'boxDepth': 90, 'light': {'main': {'intensity': 1.2}, 'ambient': {'intensity': 0.5}}},
        }
        return {
            'utility_surface3d_option': {
                **base_axes,
                'zAxis3D': {'type': 'value', 'name': '综合得分'},
                'series': [
                    {'type': 'surface', 'name': '综合得分曲面', 'data': utility_surface, 'wireframe': {'show': True}},
                    {'type': 'scatter3D', 'name': '推荐点', 'data': points['utility'], 'symbolSize': 12},
                ],
            },
            'tmj_surface3d_option': {
                **base_axes,
                'zAxis3D': {'type': 'value', 'name': 'TMJ风险'},
                'series': [
                    {'type': 'surface', 'name': 'TMJ风险曲面', 'data': tmj_surface, 'wireframe': {'show': True}},
                    {'type': 'scatter3D', 'name': '推荐点', 'data': points['tmj'], 'symbolSize': 12},
                ],
            },
            'pdl_surface3d_option': {
                **base_axes,
                'zAxis3D': {'type': 'value', 'name': '前牙PDL风险'},
                'series': [
                    {'type': 'surface', 'name': '前牙PDL风险曲面', 'data': pdl_surface, 'wireframe': {'show': True}},
                    {'type': 'scatter3D', 'name': '推荐点', 'data': points['pdl'], 'symbolSize': 12},
                ],
            },
        }

    def get_meta(self) -> Dict[str, Any]:
        return {
            'engine_version': 'MAD_v2',
            'data_file': self.data_path.name,
            'maps': {
                'symptom_severity': SYMPTOM_MAP,
                'complaint_strength': COMPLAINT_MAP,
                'joint_state': JOINT_STATE_MAP,
                'mouth_opening_state': MOUTH_OPENING_STATE_TO_MM,
                'mobility_state': MOBILITY_MAP,
                'bone_loss_state': BONE_LOSS_MAP,
            },
            'weights': self.weights.__dict__,
            'thresholds': self.thresholds.__dict__,
            'grid_defaults': {
                'mp_grid': list(np.arange(50, 70.1, 1.0)),
                'vo_grid': list(np.arange(3, 7.01, 0.25)),
            },
        }


recommend_v1_service = RecommendV1Service()
