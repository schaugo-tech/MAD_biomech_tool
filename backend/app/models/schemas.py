from typing import Dict

from pydantic import BaseModel, Field


class ConstraintConfig(BaseModel):
    tmj_max: float = Field(4.5, description="TMJ 最大允许应力 MPa")
    pdl_lower_max: float = Field(5.8, description="下前牙 PDL 最大允许应力 kPa")
    pdl_upper_max: float = Field(5.8, description="上前牙 PDL 最大允许应力 kPa")
    max_mp: float = Field(70.0, description="最大前伸比例 %")
    max_vo: float = Field(7.0, description="最大开口量 mm")


class WeightConfig(BaseModel):
    safety: float = 0.45
    effectiveness: float = 0.30
    feasibility: float = 0.20
    balance: float = 0.05


class FormulaConfig(BaseModel):
    mp_gain_gamma: float = Field(1.2, description='MP 治疗效果得分曲线指数，越大越偏好高 MP')
    vo_gain_gamma: float = Field(1.1, description='VO 治疗可行性得分曲线指数，越大越偏好高 VO')
    safety_gamma: float = Field(1.35, description='安全性得分曲线指数，越大对应力超限更敏感')
    tradeoff_strength: float = Field(0.30, description='效果/可行性与安全性冲突时的惩罚强度')
    risk_gamma: float = Field(1.5, description='风险惩罚曲线指数，越大表示高风险区惩罚更陡')


class AnalysisRequest(BaseModel):
    constraints: ConstraintConfig = ConstraintConfig()
    weights: WeightConfig = WeightConfig()
    formulas: FormulaConfig = FormulaConfig()
    selected_mp: float = 60.0
    selected_vo: float = 5.0
    grid_step_mp: float = 1.0
    grid_step_vo: float = 0.25


class ReportRequest(BaseModel):
    analysis: Dict
