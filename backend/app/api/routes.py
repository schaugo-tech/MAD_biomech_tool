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
