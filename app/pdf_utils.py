"""Utilities for generating PDF reports without external dependencies."""

from __future__ import annotations

import textwrap
from datetime import datetime
from io import BytesIO
from typing import Iterable, Sequence


class _SimplePDF:
    """Minimal PDF writer supporting plain text paragraphs."""

    def __init__(
        self,
        *,
        page_width: float = 595.28,
        page_height: float = 841.89,
        margin: float = 40.0,
        font_size: int = 12,
        leading: float = 16.0,
        wrap_width: int = 90,
    ) -> None:
        self.page_width = page_width
        self.page_height = page_height
        self.margin = margin
        self.font_size = font_size
        self.leading = leading
        self.wrap_width = wrap_width
        usable_height = self.page_height - 2 * self.margin
        # Reserve at least one line per page.
        self.max_lines = max(1, int(usable_height // self.leading))
        self.pages: list[list[str]] = [[]]
        self._line_count = 0

    def add_title(self, text: str) -> None:
        self.add_paragraph(text.upper(), wrap=False)
        self.add_blank_line()

    def add_subtitle(self, text: str) -> None:
        self.add_paragraph(text, wrap=False)
        self.add_blank_line()

    def add_paragraph(self, text: str, *, wrap: bool = True) -> None:
        sanitized = text or ""
        if wrap:
            lines = textwrap.wrap(sanitized, width=self.wrap_width) or [""]
        else:
            lines = [sanitized]
        for line in lines:
            self._add_line(line)

    def add_blank_line(self) -> None:
        self._add_line("")

    def _add_line(self, text: str) -> None:
        if self._line_count >= self.max_lines:
            self.pages.append([])
            self._line_count = 0
        normalized = (text or "").encode("latin-1", "replace").decode("latin-1")
        self.pages[-1].append(normalized)
        self._line_count += 1

    @staticmethod
    def _escape(text: str) -> str:
        return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")

    def render(self) -> bytes:
        if not self.pages:
            self.pages.append([])
        objects: list[bytes] = []
        page_object_numbers = []
        content_object_numbers = []

        for page_index, lines in enumerate(self.pages):
            page_number = 3 + page_index
            content_number = 3 + len(self.pages) + page_index
            page_object_numbers.append(page_number)
            content_object_numbers.append(content_number)

            text_lines = [
                "BT",
                f"/F1 {self.font_size} Tf",
                f"{self.leading} TL",
                f"{self.margin} {self.page_height - self.margin} Td",
            ]
            first_line = True
            for line in lines:
                if not first_line:
                    text_lines.append("T*")
                first_line = False
                escaped = self._escape(line)
                text_lines.append(f"({escaped}) Tj")
            text_lines.append("ET")
            stream = "\n".join(text_lines).encode("latin-1")
            content_obj = b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream"
            objects.append(content_obj)

        font_object_number = 3 + 2 * len(self.pages)
        font_obj = b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
        objects.append(font_obj)

        pages_kids = " ".join(f"{num} 0 R" for num in page_object_numbers)
        pages_obj = f"<< /Type /Pages /Kids [{pages_kids}] /Count {len(self.pages)} >>".encode("latin-1")
        catalog_obj = b"<< /Type /Catalog /Pages 2 0 R >>"

        page_objects = []
        for page_num, content_num in zip(page_object_numbers, content_object_numbers):
            page_dict = (
                f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {self.page_width} {self.page_height}] "
                f"/Contents {content_num} 0 R /Resources << /Font << /F1 {font_object_number} 0 R >> >> >>"
            ).encode("latin-1")
            page_objects.append(page_dict)

        # Assemble all objects in order: catalog, pages, page dicts, content streams, font.
        full_objects: list[bytes] = [catalog_obj, pages_obj, *page_objects, *objects[:-1], objects[-1]]

        buffer = BytesIO()
        buffer.write(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
        offsets = [0]
        for index, obj in enumerate(full_objects, start=1):
            offsets.append(buffer.tell())
            buffer.write(f"{index} 0 obj\n".encode("latin-1"))
            buffer.write(obj)
            buffer.write(b"\nendobj\n")

        startxref = buffer.tell()
        buffer.write(b"xref\n")
        buffer.write(f"0 {len(full_objects) + 1}\n".encode("latin-1"))
        buffer.write(b"0000000000 65535 f \n")
        for offset in offsets[1:]:
            buffer.write(f"{offset:010d} 00000 n \n".encode("latin-1"))
        buffer.write(b"trailer\n")
        buffer.write(f"<< /Size {len(full_objects) + 1} /Root 1 0 R >>\n".encode("latin-1"))
        buffer.write(b"startxref\n")
        buffer.write(f"{startxref}\n".encode("latin-1"))
        buffer.write(b"%%EOF")
        return buffer.getvalue()


def generate_findings_pdf(findings: Iterable[Sequence[str | None]]) -> bytes:
    """Return a PDF report for the provided findings data."""

    pdf = _SimplePDF()
    pdf.add_title("Reporte de Hallazgos")
    pdf.add_subtitle(datetime.now().strftime("Generado: %d/%m/%Y %H:%M"))

    has_findings = False
    for index, finding in enumerate(findings, start=1):
        has_findings = True
        try:
            audit_name, category, description, severity, status = finding
        except ValueError:
            audit_name, category, description, severity, status = (None, None, None, None, None)
        header = (
            f"{index}. Auditoría: {audit_name or 'N/A'} | Categoría: {category or 'N/A'} | "
            f"Criticidad: {severity or 'N/A'} | Estado: {status or 'N/A'}"
        )
        pdf.add_paragraph(header)
        if description:
            pdf.add_paragraph(f"Descripción: {description}")
        pdf.add_blank_line()

    if not has_findings:
        pdf.add_paragraph("No hay hallazgos registrados actualmente.")

    return pdf.render()
