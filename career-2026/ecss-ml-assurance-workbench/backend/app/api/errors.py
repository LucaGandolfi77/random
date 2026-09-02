"""Structured API errors."""

from typing import Any

from fastapi import HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.schemas.api import ApiError


class ApiException(Exception):
    """Raise from services to map to a structured JSON error response."""

    def __init__(
        self,
        code: str,
        message: str,
        http_status: int = status.HTTP_400_BAD_REQUEST,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.http_status = http_status
        self.details = details


def not_found(kind: str = "resource") -> ApiException:
    return ApiException("NOT_FOUND", f"{kind.capitalize()} not found.", status.HTTP_404_NOT_FOUND)


def _payload(exc: ApiException) -> ApiError:
    return ApiError(code=exc.code, message=exc.message, details=exc.details)


def register_exception_handlers(app) -> None:  # type: ignore[no-untyped-def]
    @app.exception_handler(ApiException)
    async def _api_exception(_request: Request, exc: ApiException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.http_status,
            content=_payload(exc).model_dump(mode="json"),
        )

    @app.exception_handler(RequestValidationError)
    async def _validation_exception(request: Request, exc: RequestValidationError) -> JSONResponse:
        errors: list[dict[str, Any]] = []
        for err in exc.errors():
            errors.append(
                {
                    "loc": ".".join(str(part) for part in err.get("loc", [])),
                    "type": err.get("type"),
                    "message": err.get("msg"),
                }
            )
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=ApiError(
                code="VALIDATION_ERROR", message="Request validation failed.", details={"errors": errors}
            ).model_dump(mode="json"),
        )

    @app.exception_handler(HTTPException)
    async def _http_exception(_request: Request, exc: HTTPException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=ApiError(code="HTTP_ERROR", message=str(exc.detail)).model_dump(mode="json"),
        )

    @app.exception_handler(Exception)
    async def _unhandled_exception(_request: Request, _exc: Exception) -> JSONResponse:
        # Deliberately generic: never leak stack traces to API clients.
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=ApiError(code="INTERNAL_ERROR", message="An unexpected error occurred.").model_dump(mode="json"),
        )
