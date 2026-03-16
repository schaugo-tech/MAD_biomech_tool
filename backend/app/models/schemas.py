from typing import Dict, List

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
    comfort: float = 0.15
    balance: float = 0.10


class AnalysisRequest(BaseModel):
    constraints: ConstraintConfig = ConstraintConfig()
    weights: WeightConfig = WeightConfig()
    selected_mp: float = 60.0
    selected_vo: float = 5.0
    grid_step_mp: float = 1.0
    grid_step_vo: float = 0.25


class ReportRequest(BaseModel):
    analysis: Dict
