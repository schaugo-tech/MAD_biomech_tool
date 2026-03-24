from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse

from app.models.schemas import AnalysisRequest, ReportRequest
from app.services.study_service import study_service

router = APIRouter()


@router.get("/study/meta")
def get_meta():
    return study_service.get_meta()


@router.get("/study/raw")
def get_raw():
    return study_service.get_raw_records()




@router.get("/study/analyze")
def analyze_get_help():
    return {
        "message": "该接口需要使用 POST 并携带 AnalysisRequest JSON。",
        "example": {
            "constraints": {
                "tmj_max": 4.5,
                "pdl_lower_max": 5.8,
                "pdl_upper_max": 5.8,
                "max_mp": 70.0,
                "max_vo": 7.0
            },
            "weights": {
                "safety": 0.45,
                "effectiveness": 0.30,
                "feasibility": 0.20,
                "balance": 0.05
            },
            "formulas": {
                "mp_gain_gamma": 1.2,
                "vo_gain_gamma": 1.1,
                "safety_gamma": 1.35,
                "tradeoff_strength": 0.30,
                "risk_gamma": 1.5
            },
            "selected_mp": 60.0,
            "selected_vo": 5.0,
            "grid_step_mp": 1.0,
            "grid_step_vo": 0.25
        }
    }

@router.post("/study/analyze")
def analyze(req: AnalysisRequest):
    try:
        return study_service.analyze(req)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/study/report", response_class=PlainTextResponse)
def report(req: ReportRequest):
    try:
        return study_service.build_report(req)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
