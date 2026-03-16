from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import PolynomialFeatures

from app.models.schemas import AnalysisRequest


@dataclass
class FitModel:
    name: str
    pipeline: Pipeline
    min_value: float
    max_value: float

    def predict(self, mp, vo):
        X = np.column_stack([np.asarray(mp).reshape(-1), np.asarray(vo).reshape(-1)])
        y = self.pipeline.predict(X)
        return y


class StudyService:
    def __init__(self):
        base_dir = Path(__file__).resolve().parents[2]
        self.data_path = base_dir / 'data' / 'P491310E02_关节盘及牙齿应力数据V250225.xlsx'
        self.raw_df = self._load_raw_data()
        self.models = self._fit_models()
        self.meta = self._build_meta()

    def _load_raw_data(self) -> pd.DataFrame:
        if not self.data_path.exists():
            raise FileNotFoundError(f'未找到数据文件: {self.data_path}')
        df = pd.read_excel(self.data_path, sheet_name='原始数据')
        rename_map = {
            '下颌前伸量 /%': 'mp',
            '垂直开口量 /mm': 'vo',
            '关节盘应力最大值 /MPa': 'tmj',
            '下前牙PDL应力最大值/kPa': 'pdl_lower',
            '上前牙PDL应力最大值/kPa': 'pdl_upper',
            '（左侧）关节盘应力最大值 /MPa': 'tmj_left',
            '（右侧）关节盘应力最大值 /MPa': 'tmj_right',
        }
        df = df.rename(columns=rename_map)
        return df

    def _fit_single_model(self, target: str) -> FitModel:
        X = self.raw_df[['mp', 'vo']].values
        y = self.raw_df[target].values
        pipe = Pipeline([
            ('poly', PolynomialFeatures(degree=2, include_bias=True)),
            ('reg', LinearRegression())
        ])
        pipe.fit(X, y)
        return FitModel(
            name=target,
            pipeline=pipe,
            min_value=float(np.min(y)),
            max_value=float(np.max(y)),
        )

    def _fit_models(self) -> Dict[str, FitModel]:
        return {
            'tmj': self._fit_single_model('tmj'),
            'pdl_lower': self._fit_single_model('pdl_lower'),
            'pdl_upper': self._fit_single_model('pdl_upper'),
        }

    def _build_meta(self):
        return {
            'study_name': 'MAD 生物力学交互式设计工具 V1',
            'parameter_ranges': {
                'mp': [50, 70],
                'vo': [3, 7],
            },
            'defaults': {
                'selected_mp': 60,
                'selected_vo': 5,
                'constraints': {
                    'tmj_max': 4.5,
                    'pdl_lower_max': 5.8,
                    'pdl_upper_max': 5.8,
                    'max_mp': 70,
                    'max_vo': 7,
                },
                'weights': {
                    'safety': 0.45,
                    'effectiveness': 0.30,
                    'comfort': 0.15,
                    'balance': 0.10,
                },
            },
            'chart_suggestions': [
                '整体评分热力图',
                '限制因子地图',
                '双应力响应面/等值图',
                'Pareto 散点图',
                '雷达图',
                '单参数趋势图',
            ],
        }

    def get_meta(self):
        return self.meta

    def get_raw_records(self):
        return self.raw_df.to_dict(orient='records')

    def _predict_frame(self, mp_values: np.ndarray, vo_values: np.ndarray) -> pd.DataFrame:
        MP, VO = np.meshgrid(mp_values, vo_values)
        flat_mp = MP.reshape(-1)
        flat_vo = VO.reshape(-1)
        tmj = self.models['tmj'].predict(flat_mp, flat_vo)
        pdl_lower = self.models['pdl_lower'].predict(flat_mp, flat_vo)
        pdl_upper = self.models['pdl_upper'].predict(flat_mp, flat_vo)
        frame = pd.DataFrame({
            'mp': flat_mp,
            'vo': flat_vo,
            'tmj': tmj,
            'pdl_lower': pdl_lower,
            'pdl_upper': pdl_upper,
        })
        return frame

    @staticmethod
    def _safe_score(value, low, high):
        score = 1 - (value - low) / max(high - low, 1e-9)
        return np.clip(score, 0, 1)

    @staticmethod
    def _soft_preference_score(value, center, spread):
        return np.clip(1 - np.abs(value - center) / spread, 0, 1)

    def _apply_scoring(self, df: pd.DataFrame, req: AnalysisRequest) -> pd.DataFrame:
        c = req.constraints
        w = req.weights
        df = df.copy()

        tmj_score = self._safe_score(df['tmj'], self.models['tmj'].min_value, c.tmj_max)
        pdl_lower_score = self._safe_score(df['pdl_lower'], self.models['pdl_lower'].min_value, c.pdl_lower_max)
        pdl_upper_score = self._safe_score(df['pdl_upper'], self.models['pdl_upper'].min_value, c.pdl_upper_max)
        safety_score = (tmj_score + pdl_lower_score + pdl_upper_score) / 3

        effectiveness_score = np.clip((df['mp'] - 50) / max(c.max_mp - 50, 1e-9), 0, 1)
        comfort_score = self._soft_preference_score(df['vo'], center=5.0, spread=2.0)
        balance_score = 1 - np.clip(np.abs(df['pdl_lower'] - df['pdl_upper']) / 3.0, 0, 1)

        df['score_safety'] = safety_score
        df['score_effectiveness'] = effectiveness_score
        df['score_comfort'] = comfort_score
        df['score_balance'] = balance_score

        df['overall_score'] = (
            w.safety * df['score_safety'] +
            w.effectiveness * df['score_effectiveness'] +
            w.comfort * df['score_comfort'] +
            w.balance * df['score_balance']
        )

        df['constraint_tmj'] = df['tmj'] > c.tmj_max
        df['constraint_pdl_lower'] = df['pdl_lower'] > c.pdl_lower_max
        df['constraint_pdl_upper'] = df['pdl_upper'] > c.pdl_upper_max
        df['constraint_mp'] = df['mp'] > c.max_mp
        df['constraint_vo'] = df['vo'] > c.max_vo

        violation_cols = [
            'constraint_tmj', 'constraint_pdl_lower', 'constraint_pdl_upper', 'constraint_mp', 'constraint_vo'
        ]
        df['violation_count'] = df[violation_cols].sum(axis=1)
        df['is_feasible'] = df['violation_count'] == 0
        df['limiting_factor'] = df.apply(self._limiting_factor, axis=1)
        return df

    @staticmethod
    def _limiting_factor(row):
        factors = []
        if row['constraint_tmj']:
            factors.append('关节盘应力')
        if row['constraint_pdl_lower']:
            factors.append('下前牙PDL')
        if row['constraint_pdl_upper']:
            factors.append('上前牙PDL')
        if row['constraint_mp']:
            factors.append('前伸比例')
        if row['constraint_vo']:
            factors.append('开口量')
        return 'OK' if not factors else ' / '.join(factors)

    def _top_candidates(self, df: pd.DataFrame, count=3):
        feasible = df[df['is_feasible']].sort_values(['overall_score', 'score_safety'], ascending=False)
        if feasible.empty:
            return []
        dedup = feasible.drop_duplicates(subset=['mp', 'vo']).head(count)
        return dedup.to_dict(orient='records')

    def _selected_snapshot(self, df: pd.DataFrame, req: AnalysisRequest):
        target = df[(np.isclose(df['mp'], req.selected_mp)) & (np.isclose(df['vo'], req.selected_vo))]
        if target.empty:
            target = df.assign(distance=(df['mp'] - req.selected_mp)**2 + (df['vo'] - req.selected_vo)**2).sort_values('distance').head(1)
        row = target.iloc[0].to_dict()
        return row

    def analyze(self, req: AnalysisRequest):
        mp_values = np.arange(50, req.constraints.max_mp + 1e-9, req.grid_step_mp)
        vo_values = np.arange(3, req.constraints.max_vo + 1e-9, req.grid_step_vo)
        grid = self._predict_frame(mp_values, vo_values)
        grid = self._apply_scoring(grid, req)
        selected = self._selected_snapshot(grid, req)
        candidates = self._top_candidates(grid, 3)

        pareto_source = grid[['mp', 'vo', 'tmj', 'pdl_lower', 'overall_score', 'is_feasible']].copy()
        pareto_source['effectiveness_proxy'] = pareto_source['mp']

        return {
            'meta': self.meta,
            'selected': selected,
            'candidates': candidates,
            'grid': grid.round(4).to_dict(orient='records'),
            'raw_records': self.get_raw_records(),
            'pareto_records': pareto_source.round(4).to_dict(orient='records'),
            'interpretation': self._build_interpretation(selected, candidates),
        }

    def _build_interpretation(self, selected: Dict, candidates: List[Dict]) -> Dict:
        status = '可行' if selected.get('is_feasible') else '受限'
        selected_text = (
            f"当前点 MP {selected['mp']:.1f}% / VO {selected['vo']:.2f} mm，"
            f"整体评分 {selected['overall_score']:.3f}，状态为{status}。"
            f"TMJ {selected['tmj']:.2f} MPa，下前牙 PDL {selected['pdl_lower']:.2f} kPa，"
            f"上前牙 PDL {selected['pdl_upper']:.2f} kPa。"
        )
        if selected.get('is_feasible'):
            advice = '当前点未触发硬约束，可以作为可讨论方案。'
        else:
            advice = f"当前点受限，主要限制因子为：{selected['limiting_factor']}。"

        if candidates:
            best = candidates[0]
            best_text = (
                f"当前推荐优先点为 MP {best['mp']:.1f}% / VO {best['vo']:.2f} mm，"
                f"评分 {best['overall_score']:.3f}。"
            )
        else:
            best_text = '当前阈值下不存在可行点，建议放宽约束或缩小目标范围。'

        return {
            'selected_text': selected_text,
            'advice': advice,
            'best_text': best_text,
        }

    def build_report(self, req):
        analysis = req.analysis
        selected = analysis['selected']
        candidates = analysis.get('candidates', [])
        lines = [
            '# MAD 生物力学设计报告',
            '',
            '## 当前方案',
            f"- MP: {selected['mp']:.1f}%",
            f"- VO: {selected['vo']:.2f} mm",
            f"- 综合评分: {selected['overall_score']:.3f}",
            f"- TMJ: {selected['tmj']:.2f} MPa",
            f"- 下前牙 PDL: {selected['pdl_lower']:.2f} kPa",
            f"- 上前牙 PDL: {selected['pdl_upper']:.2f} kPa",
            f"- 可行性: {'可行' if selected['is_feasible'] else '受限'}",
            f"- 限制因子: {selected['limiting_factor']}",
            '',
            '## 推荐方案',
        ]
        if candidates:
            for idx, c in enumerate(candidates, 1):
                lines.extend([
                    f"### 备选 {idx}",
                    f"- MP {c['mp']:.1f}% / VO {c['vo']:.2f} mm",
                    f"- 综合评分 {c['overall_score']:.3f}",
                    f"- TMJ {c['tmj']:.2f} MPa，PDL下 {c['pdl_lower']:.2f} kPa，PDL上 {c['pdl_upper']:.2f} kPa",
                    '',
                ])
        else:
            lines.append('- 当前没有满足阈值的可行候选点。')
        lines.extend([
            '## 解释',
            analysis.get('interpretation', {}).get('selected_text', ''),
            '',
            analysis.get('interpretation', {}).get('advice', ''),
            '',
            analysis.get('interpretation', {}).get('best_text', ''),
            '',
            '## 说明',
            '- 当前版本基于离散实验点与二次回归响应面。',
            '- 图表与规则是为了快速讨论、再迭代，不是最终临床定稿。',
        ])
        return '\n'.join(lines)


study_service = StudyService()
