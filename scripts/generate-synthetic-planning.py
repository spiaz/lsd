#!/usr/bin/env python3
"""Generate the public, fully synthetic PDF planning fixture."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen.canvas import Canvas


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "fixtures" / "planning-synthetic.pdf"

PAGE_WIDTH, PAGE_HEIGHT = A4
LEFT = 20
RIGHT = PAGE_WIDTH - 20
TOP = PAGE_HEIGHT - 24
ROW_HEIGHT = 12


@dataclass(frozen=True)
class Trip:
    line: str
    vehicle: str
    origin: str
    start: str
    destination: str
    end: str


@dataclass(frozen=True)
class Day:
    day: date
    status: str
    service: str = ""
    presence_start: str = ""
    presence_end: str = ""
    worked: str = ""
    rr: str = ""
    trips: tuple[Trip, ...] = ()


WEEKDAYS = ("Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom")
PLACES = ("Deposito Alfa", "Terminal Nord", "Stazione Demo", "Parco Fittizio")


def build_days() -> list[Day]:
    first = date(2026, 10, 1)
    days: list[Day] = []
    for offset in range(31):
        current = first + timedelta(days=offset)
        number = current.day
        if number in {4, 11, 18, 25}:
            days.append(Day(current, "RIPOSO"))
            continue
        if number in {8, 22}:
            days.append(Day(current, "RR", rr="07:36"))
            continue
        if number == 15:
            days.append(Day(current, "CONGEDO"))
            continue

        line = f"D{(number % 5) + 1}"
        vehicle = f"V-{300 + number:03d}"
        origin = PLACES[number % len(PLACES)]
        middle = PLACES[(number + 1) % len(PLACES)]
        destination = PLACES[(number + 2) % len(PLACES)]

        if number in {3, 10, 17, 24, 31}:
            trips = (
                Trip(line, vehicle, origin, "06:20", middle, "09:15"),
                Trip(line, vehicle, middle, "09:28", destination, "11:40"),
                Trip(f"D{(number % 5) + 2}", f"V-{400 + number:03d}", destination, "15:12", middle, "17:05"),
                Trip(f"D{(number % 5) + 2}", f"V-{400 + number:03d}", middle, "17:18", origin, "19:06"),
            )
            days.append(Day(current, "SPEZZATO", f"S-{100 + number}", "06:20", "19:06", "07:48", "04:44", trips))
        elif number == 30:
            trips = (
                Trip(line, vehicle, origin, "21:48", middle, "23:56"),
                Trip(line, vehicle, middle, "24:08", destination, "25:31"),
            )
            days.append(Day(current, "UNICO", f"S-{100 + number}", "21:40", "25:31", "03:31", "00:20", trips))
        else:
            start_hour = 5 + number % 5
            start = f"{start_hour:02d}:{(number * 7) % 60:02d}"
            mid = f"{start_hour + 3:02d}:{(number * 7 + 13) % 60:02d}"
            end = f"{start_hour + 7:02d}:{(number * 7 + 26) % 60:02d}"
            trips = (
                Trip(line, vehicle, origin, start, middle, mid),
                Trip(line, vehicle, middle, mid, destination, end),
            )
            days.append(Day(current, "UNICO", f"S-{100 + number}", start, end, "07:20", "00:30", trips))
    return days


def fit_text(canvas: Canvas, value: str, x: float, y: float, width: float, size: float = 6.2) -> None:
    text = value
    while text and stringWidth(text, "Helvetica", size) > width:
        text = text[:-1]
    if text != value and len(text) > 1:
        text = text[:-1] + "."
    canvas.setFont("Helvetica", size)
    canvas.drawString(x, y, text)


def draw_page_header(canvas: Canvas, page_number: int) -> float:
    canvas.setFillColor(colors.HexColor("#20233A"))
    canvas.setFont("Helvetica-Bold", 11)
    canvas.drawString(LEFT, TOP, "PLANNING SYNTHETIQUE - DONNEES FICTIVES")
    canvas.setFont("Helvetica", 7)
    canvas.drawRightString(RIGHT, TOP, f"Octobre 2026 - page {page_number}/3")
    canvas.setFillColor(colors.HexColor("#5A6078"))
    canvas.drawString(LEFT, TOP - 14, "Agent: CONDUCTEUR DEMO - Matricule: TEST-0001")
    canvas.drawRightString(RIGHT, TOP - 14, "Document public de test - aucune donnee reelle")
    return TOP - 32


def draw_columns(canvas: Canvas, y: float) -> float:
    columns = (
        ("Jour", 22), ("Date", 52), ("Service", 95), ("Type", 131),
        ("Pres. debut", 180), ("Pres. fin", 226), ("Ligne", 267),
        ("Voiture", 294), ("De", 332), ("Debut", 401),
        ("A", 434), ("Fin", 504), ("Travail", 535), ("RR", 570),
    )
    canvas.setFillColor(colors.HexColor("#E9EBF4"))
    canvas.rect(LEFT, y - 4, RIGHT - LEFT, 14, fill=1, stroke=0)
    canvas.setFillColor(colors.HexColor("#20233A"))
    canvas.setFont("Helvetica-Bold", 5.7)
    for title, x in columns:
        canvas.drawString(x, y, title)
    return y - 12


def draw_day(canvas: Canvas, item: Day, y: float) -> float:
    canvas.setStrokeColor(colors.HexColor("#B9BECE"))
    canvas.setLineWidth(0.35)
    canvas.line(LEFT, y + 4, RIGHT, y + 4)
    canvas.setFillColor(colors.HexColor("#20233A"))
    fit_text(canvas, WEEKDAYS[item.day.weekday()], 22, y - 4, 27)
    fit_text(canvas, item.day.strftime("%d/%m/%Y"), 52, y - 4, 41)
    fit_text(canvas, item.service, 95, y - 4, 34)
    fit_text(canvas, item.status, 131, y - 4, 47)
    fit_text(canvas, item.presence_start, 180, y - 4, 44)
    fit_text(canvas, item.presence_end, 226, y - 4, 38)
    fit_text(canvas, item.worked, 535, y - 4, 32)
    fit_text(canvas, item.rr, 570, y - 4, 20)
    y -= ROW_HEIGHT

    for trip in item.trips:
        canvas.setFillColor(colors.HexColor("#555B70"))
        fit_text(canvas, trip.line, 267, y - 4, 25)
        fit_text(canvas, trip.vehicle, 294, y - 4, 36)
        fit_text(canvas, trip.origin, 332, y - 4, 66, 5.8)
        fit_text(canvas, trip.start, 401, y - 4, 31)
        fit_text(canvas, trip.destination, 434, y - 4, 67, 5.8)
        fit_text(canvas, trip.end, 504, y - 4, 29)
        y -= 9
    return y - 2


def generate() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    canvas = Canvas(str(OUTPUT), pagesize=A4, pageCompression=1)
    days = build_days()
    ranges = ((0, 11), (11, 22), (22, 31))
    for page_number, (start, end) in enumerate(ranges, start=1):
        y = draw_columns(canvas, draw_page_header(canvas, page_number))
        for item in days[start:end]:
            y = draw_day(canvas, item, y)
        canvas.setStrokeColor(colors.HexColor("#B9BECE"))
        canvas.line(LEFT, 28, RIGHT, 28)
        canvas.setFillColor(colors.HexColor("#5A6078"))
        canvas.setFont("Helvetica", 6)
        canvas.drawString(LEFT, 18, "Fixture LSD - generata esclusivamente con nomi, linee, veicoli e orari sintetici")
        canvas.drawRightString(RIGHT, 18, "- FIN -" if page_number == 3 else "Segue")
        canvas.showPage()
    canvas.save()


if __name__ == "__main__":
    generate()
