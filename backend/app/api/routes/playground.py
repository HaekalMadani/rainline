from fastapi import APIRouter, HTTPException, Query

from app.services.playground_service import PlaygroundService, UnknownIdentifierError

router = APIRouter(prefix="/playground", tags=["playground"])


@router.get("/lap")
def get_lap_estimate(
    driver: str = Query(..., description="3-letter driver code, e.g. LEC"),
    chassis: str = Query(..., description="Team chassis slug, e.g. redbull"),
    engine: str = Query(..., description="3-letter engine code, e.g. MER"),
):
    try:
        return PlaygroundService.simulate_lap(driver=driver, chassis=chassis, engine=engine)
    except UnknownIdentifierError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown {e.identifier_type} '{e.value}'. Use /api/playground/choices for valid options.",
        )
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="Playground coefficients are not available.")


@router.get("/choices")
def get_choices():
    try:
        return PlaygroundService.list_eligible_choices()
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="Playground coefficients are not available.")


@router.get("/challenges")
def get_challenges():
    return PlaygroundService.list_challenges()


@router.get("/methodology")
def get_methodology():
    try:
        return PlaygroundService.get_methodology()
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="Playground coefficients are not available.")
