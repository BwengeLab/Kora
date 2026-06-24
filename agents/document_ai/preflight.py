from __future__ import annotations

import hashlib
import io
from dataclasses import dataclass
from pathlib import Path
import subprocess
import tempfile
from typing import Protocol
import zipfile

from agents.document_ai.enterprise_schemas import FileInspection


@dataclass(frozen=True)
class PreflightPolicy:
    max_file_bytes: int = 100 * 1024 * 1024
    max_pdf_pages: int = 500
    max_image_pixels: int = 80_000_000
    max_office_entries: int = 10_000
    max_office_uncompressed_bytes: int = 500 * 1024 * 1024
    max_office_compression_ratio: float = 100.0
    allow_macro_workbooks: bool = False
    require_malware_scan: bool = False


@dataclass(frozen=True)
class MalwareScan:
    status: str
    detail: str = ""


class MalwareScanner(Protocol):
    def scan(self, content: bytes, file_name: str) -> MalwareScan: ...


class UnavailableMalwareScanner:
    def scan(self, content: bytes, file_name: str) -> MalwareScan:
        return MalwareScan(status="unknown", detail="malware scanner unavailable")


class ClamAVCommandScanner:
    def __init__(self, executable: str = "clamscan", timeout_seconds: int = 60) -> None:
        self.executable = executable
        self.timeout_seconds = timeout_seconds

    def scan(self, content: bytes, file_name: str) -> MalwareScan:
        suffix = Path(file_name).suffix
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=True) as handle:
            handle.write(content)
            handle.flush()
            try:
                result = subprocess.run(
                    [self.executable, "--no-summary", handle.name],
                    capture_output=True,
                    text=True,
                    timeout=self.timeout_seconds,
                    check=False,
                )
            except (FileNotFoundError, subprocess.TimeoutExpired) as exc:
                return MalwareScan(status="unknown", detail=str(exc))
        if result.returncode == 0:
            return MalwareScan(status="clean")
        if result.returncode == 1:
            return MalwareScan(status="infected", detail=result.stdout.strip())
        return MalwareScan(status="unknown", detail=result.stderr.strip())


def inspect_document(
    content: bytes,
    file_name: str,
    declared_content_type: str,
    policy: PreflightPolicy | None = None,
    scanner: MalwareScanner | None = None,
) -> FileInspection:
    policy = policy or PreflightPolicy()
    scanner = scanner or UnavailableMalwareScanner()
    digest = hashlib.sha256(content).hexdigest()
    suffix = Path(file_name).suffix.lower()
    reasons: list[str] = []
    warnings: list[str] = []
    detected = _detect_type(content, suffix)
    disposition = "accepted"
    page_count = 0

    if not content:
        return FileInspection("rejected", "empty", digest, 0, reasons=("empty-file",))
    if len(content) > policy.max_file_bytes:
        reasons.append("file-size-limit-exceeded")
        disposition = "rejected"
    allowed = {"csv", "xlsx", "pdf", "png", "jpeg", "webp", "tiff"}
    if detected not in allowed:
        reasons.append("unsupported-or-invalid-file-signature")
        disposition = "rejected"
    expected = _type_for_suffix(suffix)
    if expected and detected != expected:
        reasons.append("extension-signature-mismatch")
        disposition = "quarantined" if disposition != "rejected" else disposition
    if declared_content_type and not _content_type_matches(declared_content_type, detected):
        warnings.append("declared-content-type-mismatch")

    if detected == "pdf":
        page_count, pdf_reasons = _inspect_pdf(content, policy)
        reasons.extend(pdf_reasons)
    elif detected in {"png", "jpeg", "webp", "tiff"}:
        reasons.extend(_inspect_image(content, policy))
    elif detected == "xlsx":
        reasons.extend(_inspect_office_zip(content, policy, suffix))
    if reasons and disposition == "accepted":
        disposition = "quarantined"
    if any(reason.endswith("limit-exceeded") for reason in reasons):
        disposition = "rejected"

    scan = scanner.scan(content, file_name)
    if scan.status == "infected":
        reasons.append("malware-detected")
        disposition = "rejected"
    elif scan.status != "clean":
        warnings.append("malware-scan-unavailable")
        if policy.require_malware_scan and disposition != "rejected":
            reasons.append("malware-scan-required")
            disposition = "quarantined"

    inspection = FileInspection(
        disposition=disposition,
        detected_type=detected,
        sha256=digest,
        size_bytes=len(content),
        page_count=page_count,
        warnings=tuple(sorted(set(warnings))),
        reasons=tuple(sorted(set(reasons))),
        malware_status=scan.status,
    )
    inspection.validate()
    return inspection


def _detect_type(content: bytes, suffix: str) -> str:
    if content.startswith(b"%PDF-"):
        return "pdf"
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if content.startswith(b"\xff\xd8\xff"):
        return "jpeg"
    if content[:4] in {b"II*\x00", b"MM\x00*"}:
        return "tiff"
    if content.startswith(b"RIFF") and content[8:12] == b"WEBP":
        return "webp"
    if content.startswith(b"PK\x03\x04"):
        return "xlsx" if _looks_like_xlsx(content) else "zip"
    if suffix == ".csv" and b"\x00" not in content[:4096]:
        return "csv"
    return "unknown"


def _looks_like_xlsx(content: bytes) -> bool:
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            names = set(archive.namelist())
        return "[Content_Types].xml" in names and any(
            name.startswith("xl/") for name in names
        )
    except zipfile.BadZipFile:
        return False


def _inspect_pdf(content: bytes, policy: PreflightPolicy) -> tuple[int, list[str]]:
    reasons: list[str] = []
    try:
        from pypdf import PdfReader

        reader = PdfReader(io.BytesIO(content))
        if reader.is_encrypted:
            reasons.append("encrypted-pdf")
            return 0, reasons
        page_count = len(reader.pages)
        if page_count > policy.max_pdf_pages:
            reasons.append("pdf-page-limit-exceeded")
        return page_count, reasons
    except Exception:
        return 0, ["invalid-pdf"]


def _inspect_image(content: bytes, policy: PreflightPolicy) -> list[str]:
    try:
        from PIL import Image

        with Image.open(io.BytesIO(content)) as image:
            width, height = image.size
            if width * height > policy.max_image_pixels:
                return ["image-pixel-limit-exceeded"]
    except Exception:
        return ["invalid-image"]
    return []


def _inspect_office_zip(
    content: bytes, policy: PreflightPolicy, suffix: str
) -> list[str]:
    reasons: list[str] = []
    if suffix == ".xlsm" and not policy.allow_macro_workbooks:
        reasons.append("macro-workbook-not-allowed")
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            entries = archive.infolist()
            if len(entries) > policy.max_office_entries:
                reasons.append("office-entry-limit-exceeded")
            total = sum(item.file_size for item in entries)
            compressed = sum(max(item.compress_size, 1) for item in entries)
            if total > policy.max_office_uncompressed_bytes:
                reasons.append("office-uncompressed-limit-exceeded")
            if total / compressed > policy.max_office_compression_ratio:
                reasons.append("office-compression-ratio-limit-exceeded")
    except zipfile.BadZipFile:
        reasons.append("invalid-office-container")
    return reasons


def _type_for_suffix(suffix: str) -> str:
    return {
        ".csv": "csv",
        ".xlsx": "xlsx",
        ".xlsm": "xlsx",
        ".pdf": "pdf",
        ".png": "png",
        ".jpg": "jpeg",
        ".jpeg": "jpeg",
        ".webp": "webp",
        ".tif": "tiff",
        ".tiff": "tiff",
    }.get(suffix, "")


def _content_type_matches(content_type: str, detected: str) -> bool:
    normalized = content_type.lower().split(";", 1)[0].strip()
    expected = {
        "csv": {"text/csv", "application/csv", "text/plain"},
        "xlsx": {
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-excel.sheet.macroenabled.12",
        },
        "pdf": {"application/pdf"},
        "png": {"image/png"},
        "jpeg": {"image/jpeg"},
        "webp": {"image/webp"},
        "tiff": {"image/tiff"},
    }
    return normalized in expected.get(detected, set())
