from __future__ import annotations

import os
import secrets
from datetime import date, datetime
from io import BytesIO
from pathlib import Path
from typing import Optional

from fastapi import (
    Depends,
    FastAPI,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile,
)
from fastapi.responses import FileResponse, HTMLResponse, RedirectResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from passlib.context import CryptContext
from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String, Text, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session, relationship, sessionmaker
from starlette.middleware.sessions import SessionMiddleware

from app.pdf_utils import generate_findings_pdf


BASE_DIR = Path(__file__).resolve().parent
DATABASE_URL = f"sqlite:///{BASE_DIR / 'auditoria.db'}"
EVIDENCE_DIR = BASE_DIR / "static" / "evidence"
EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class RoleEnum(str):
    ADMIN = "admin"
    AUDITOR = "auditor"
    CLIENT = "client"


class AuditStatus(str):
    PLANNED = "planificada"
    IN_PROGRESS = "en_curso"
    CLOSED = "cerrada"


class AuditType(str):
    INTERNAL = "interna"
    EXTERNAL = "externa"


class FindingStatus(str):
    OPEN = "abierto"
    ACTION_PLAN = "plan_accion"
    CLOSED = "cerrado"


class ActionPlanStatus(str):
    OPEN = "pendiente"
    IN_PROGRESS = "en_progreso"
    CLOSED = "cerrado"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default=RoleEnum.CLIENT)

    created_audits = relationship("Audit", back_populates="responsible", foreign_keys="Audit.responsible_id")


class Audit(Base):
    __tablename__ = "audits"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    audit_type = Column(String(20), nullable=False, default=AuditType.INTERNAL)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    status = Column(String(20), nullable=False, default=AuditStatus.PLANNED)
    responsible_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    responsible = relationship("User", back_populates="created_audits", foreign_keys=[responsible_id])
    checklist_items = relationship("ChecklistItem", cascade="all, delete-orphan", back_populates="audit")
    activities = relationship("AuditActivity", cascade="all, delete-orphan", back_populates="audit")
    findings = relationship("Finding", cascade="all, delete-orphan", back_populates="audit")


class ChecklistItem(Base):
    __tablename__ = "checklist_items"

    id = Column(Integer, primary_key=True, index=True)
    audit_id = Column(Integer, ForeignKey("audits.id"))
    description = Column(Text, nullable=False)
    status = Column(String(20), nullable=False, default="pendiente")

    audit = relationship("Audit", back_populates="checklist_items")


class AuditActivity(Base):
    __tablename__ = "audit_activities"

    id = Column(Integer, primary_key=True, index=True)
    audit_id = Column(Integer, ForeignKey("audits.id"))
    activity_date = Column(Date, nullable=False)
    activity_type = Column(String(20), nullable=False)  # visita, entrevista, documento
    notes = Column(Text, nullable=True)

    audit = relationship("Audit", back_populates="activities")


class Finding(Base):
    __tablename__ = "findings"

    id = Column(Integer, primary_key=True, index=True)
    audit_id = Column(Integer, ForeignKey("audits.id"))
    category = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String(20), nullable=False)
    status = Column(String(20), nullable=False, default=FindingStatus.OPEN)
    evidence_file = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    audit = relationship("Audit", back_populates="findings")
    action_plans = relationship("ActionPlan", cascade="all, delete-orphan", back_populates="finding")


class ActionPlan(Base):
    __tablename__ = "action_plans"

    id = Column(Integer, primary_key=True, index=True)
    finding_id = Column(Integer, ForeignKey("findings.id"))
    description = Column(Text, nullable=False)
    responsible = Column(String(150), nullable=False)
    due_date = Column(Date, nullable=True)
    status = Column(String(20), nullable=False, default=ActionPlanStatus.OPEN)

    finding = relationship("Finding", back_populates="action_plans")


app = FastAPI(title="Auditoria MVP")
app.add_middleware(SessionMiddleware, secret_key=os.environ.get("SESSION_SECRET", secrets.token_hex(16)))
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))


# Dependency

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_default_users(db: Session) -> None:
    if not db.query(User).filter_by(username="admin").first():
        admin = User(
            username="admin",
            full_name="Administrador",
            password_hash=pwd_context.hash("admin"),
            role=RoleEnum.ADMIN,
        )
        db.add(admin)
        db.commit()


@app.on_event("startup")
def startup_event() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        create_default_users(db)


# Authentication helpers

def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="No autenticado")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    return user


@app.get("/login", response_class=HTMLResponse)
def login_form(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})


@app.post("/login")
def login(
    request: Request,
    username: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter_by(username=username).first()
    if not user or not pwd_context.verify(password, user.password_hash):
        return templates.TemplateResponse(
            "login.html",
            {"request": request, "error": "Credenciales inválidas"},
            status_code=400,
        )
    request.session["user_id"] = user.id
    response = RedirectResponse("/", status_code=303)
    return response


@app.get("/logout")
def logout(request: Request):
    request.session.clear()
    return RedirectResponse("/login", status_code=303)


@app.get("/", response_class=HTMLResponse)
def dashboard(request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    total_audits = db.query(Audit).count()
    open_findings = db.query(Finding).filter(Finding.status != FindingStatus.CLOSED).count()
    closed_findings = db.query(Finding).filter(Finding.status == FindingStatus.CLOSED).count()
    audits_in_progress = db.query(Audit).filter(Audit.status == AuditStatus.IN_PROGRESS).count()
    audits_closed = db.query(Audit).filter(Audit.status == AuditStatus.CLOSED).count()

    return templates.TemplateResponse(
        "dashboard.html",
        {
            "request": request,
            "user": user,
            "total_audits": total_audits,
            "open_findings": open_findings,
            "closed_findings": closed_findings,
            "audits_in_progress": audits_in_progress,
            "audits_closed": audits_closed,
        },
    )


@app.get("/users", response_class=HTMLResponse)
def list_users(request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    if user.role != RoleEnum.ADMIN:
        raise HTTPException(status_code=403, detail="Acceso no autorizado")
    users = db.query(User).all()
    return templates.TemplateResponse("users.html", {"request": request, "user": user, "users": users})


@app.post("/users")
def create_user(
    request: Request,
    username: str = Form(...),
    full_name: str = Form(...),
    role: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db),
):
    current = get_current_user(request, db)
    if current.role != RoleEnum.ADMIN:
        raise HTTPException(status_code=403, detail="Acceso no autorizado")
    if db.query(User).filter_by(username=username).first():
        raise HTTPException(status_code=400, detail="El usuario ya existe")
    new_user = User(
        username=username,
        full_name=full_name,
        role=role,
        password_hash=pwd_context.hash(password),
    )
    db.add(new_user)
    db.commit()
    return RedirectResponse("/users", status_code=303)


@app.get("/audits", response_class=HTMLResponse)
def audits_list(request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    audits = db.query(Audit).order_by(Audit.start_date.desc().nullslast()).all()
    auditors = db.query(User).filter(User.role == RoleEnum.AUDITOR).all()
    return templates.TemplateResponse(
        "audits_list.html",
        {"request": request, "user": user, "audits": audits, "auditors": auditors, "statuses": AuditStatus.__dict__},
    )


@app.post("/audits")
def create_audit(
    request: Request,
    name: str = Form(...),
    description: str = Form("") ,
    audit_type: str = Form(...),
    start_date: Optional[date] = Form(None),
    end_date: Optional[date] = Form(None),
    responsible_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
):
    user = get_current_user(request, db)
    if user.role not in (RoleEnum.ADMIN, RoleEnum.AUDITOR):
        raise HTTPException(status_code=403, detail="Acceso no autorizado")
    audit = Audit(
        name=name,
        description=description,
        audit_type=audit_type,
        start_date=start_date,
        end_date=end_date,
        responsible_id=responsible_id,
        status=AuditStatus.PLANNED,
    )
    db.add(audit)
    db.commit()
    return RedirectResponse("/audits", status_code=303)


@app.post("/audits/{audit_id}/status")
def update_audit_status(
    request: Request,
    audit_id: int,
    status: str = Form(...),
    db: Session = Depends(get_db),
):
    user = get_current_user(request, db)
    if user.role not in (RoleEnum.ADMIN, RoleEnum.AUDITOR):
        raise HTTPException(status_code=403, detail="Acceso no autorizado")
    audit = db.query(Audit).get(audit_id)
    if not audit:
        raise HTTPException(status_code=404, detail="Auditoría no encontrada")
    audit.status = status
    db.commit()
    return RedirectResponse(f"/audits/{audit_id}", status_code=303)


@app.get("/audits/{audit_id}", response_class=HTMLResponse)
def audit_detail(audit_id: int, request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    audit = db.query(Audit).get(audit_id)
    if not audit:
        raise HTTPException(status_code=404, detail="Auditoría no encontrada")
    return templates.TemplateResponse(
        "audit_detail.html",
        {
            "request": request,
            "user": user,
            "audit": audit,
            "statuses": {
                "finding": FindingStatus.__dict__,
                "plan": ActionPlanStatus.__dict__,
                "audit": AuditStatus.__dict__,
            },
        },
    )


@app.post("/audits/{audit_id}/checklist")
def add_checklist_item(
    request: Request,
    audit_id: int,
    description: str = Form(...),
    db: Session = Depends(get_db),
):
    user = get_current_user(request, db)
    if user.role not in (RoleEnum.ADMIN, RoleEnum.AUDITOR):
        raise HTTPException(status_code=403, detail="Acceso no autorizado")
    audit = db.query(Audit).get(audit_id)
    if not audit:
        raise HTTPException(status_code=404, detail="Auditoría no encontrada")
    item = ChecklistItem(audit_id=audit_id, description=description)
    db.add(item)
    db.commit()
    return RedirectResponse(f"/audits/{audit_id}", status_code=303)


@app.post("/audits/{audit_id}/activities")
def add_activity(
    request: Request,
    audit_id: int,
    activity_date: date = Form(...),
    activity_type: str = Form(...),
    notes: str = Form("") ,
    db: Session = Depends(get_db),
):
    user = get_current_user(request, db)
    if user.role not in (RoleEnum.ADMIN, RoleEnum.AUDITOR):
        raise HTTPException(status_code=403, detail="Acceso no autorizado")
    activity = AuditActivity(
        audit_id=audit_id,
        activity_date=activity_date,
        activity_type=activity_type,
        notes=notes,
    )
    db.add(activity)
    db.commit()
    return RedirectResponse(f"/audits/{audit_id}", status_code=303)


@app.post("/audits/{audit_id}/findings")
def add_finding(
    request: Request,
    audit_id: int,
    category: str = Form(...),
    description: str = Form(...),
    severity: str = Form(...),
    status: str = Form(FindingStatus.OPEN),
    evidence: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    user = get_current_user(request, db)
    if user.role not in (RoleEnum.ADMIN, RoleEnum.AUDITOR):
        raise HTTPException(status_code=403, detail="Acceso no autorizado")

    evidence_path: Optional[str] = None
    if evidence and evidence.filename:
        ext = Path(evidence.filename).suffix
        unique_name = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{secrets.token_hex(4)}{ext}"
        save_path = EVIDENCE_DIR / unique_name
        with save_path.open("wb") as buffer:
            buffer.write(evidence.file.read())
        evidence_path = f"/static/evidence/{unique_name}"

    finding = Finding(
        audit_id=audit_id,
        category=category,
        description=description,
        severity=severity,
        status=status,
        evidence_file=evidence_path,
    )
    db.add(finding)
    db.commit()
    return RedirectResponse(f"/audits/{audit_id}", status_code=303)


@app.post("/findings/{finding_id}/status")
def update_finding_status(
    request: Request,
    finding_id: int,
    status: str = Form(...),
    db: Session = Depends(get_db),
):
    user = get_current_user(request, db)
    if user.role not in (RoleEnum.ADMIN, RoleEnum.AUDITOR):
        raise HTTPException(status_code=403, detail="Acceso no autorizado")
    finding = db.query(Finding).get(finding_id)
    if not finding:
        raise HTTPException(status_code=404, detail="Hallazgo no encontrado")
    finding.status = status
    db.commit()
    return RedirectResponse(f"/audits/{finding.audit_id}", status_code=303)


@app.post("/findings/{finding_id}/action_plans")
def add_action_plan(
    request: Request,
    finding_id: int,
    description: str = Form(...),
    responsible: str = Form(...),
    due_date: Optional[date] = Form(None),
    db: Session = Depends(get_db),
):
    user = get_current_user(request, db)
    if user.role not in (RoleEnum.ADMIN, RoleEnum.AUDITOR, RoleEnum.CLIENT):
        raise HTTPException(status_code=403, detail="Acceso no autorizado")
    finding = db.query(Finding).get(finding_id)
    if not finding:
        raise HTTPException(status_code=404, detail="Hallazgo no encontrado")
    action_plan = ActionPlan(
        finding_id=finding_id,
        description=description,
        responsible=responsible,
        due_date=due_date,
    )
    db.add(action_plan)
    db.commit()
    return RedirectResponse(f"/audits/{finding.audit_id}", status_code=303)


@app.post("/action_plans/{plan_id}/status")
def update_action_plan_status(
    request: Request,
    plan_id: int,
    status: str = Form(...),
    db: Session = Depends(get_db),
):
    user = get_current_user(request, db)
    plan = db.query(ActionPlan).get(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan no encontrado")
    if user.role not in (RoleEnum.ADMIN, RoleEnum.AUDITOR, RoleEnum.CLIENT):
        raise HTTPException(status_code=403, detail="Acceso no autorizado")
    plan.status = status
    db.commit()
    return RedirectResponse(f"/audits/{plan.finding.audit_id}", status_code=303)


@app.get("/reports", response_class=HTMLResponse)
def reports_home(request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    audits = db.query(Audit).all()
    return templates.TemplateResponse("reports.html", {"request": request, "user": user, "audits": audits})


@app.get("/reports/audits/{status}")
def audits_by_status(status: str, request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    audits = db.query(Audit).filter(Audit.status == status).all()
    return templates.TemplateResponse(
        "audits_by_status.html",
        {"request": request, "user": user, "audits": audits, "status": status},
    )


@app.get("/reports/findings/csv")
def export_findings_csv(db: Session = Depends(get_db)):
    import pandas as pd

    findings = (
        db.query(Finding)
        .join(Audit)
        .with_entities(
            Audit.name.label("auditoria"),
            Finding.category,
            Finding.description,
            Finding.severity,
            Finding.status,
            Finding.created_at,
        )
        .all()
    )

    df = pd.DataFrame(findings, columns=["auditoria", "categoria", "descripcion", "criticidad", "estado", "creado"])
    csv_path = BASE_DIR / "static" / "hallazgos.csv"
    df.to_csv(csv_path, index=False)
    return FileResponse(csv_path, filename="hallazgos.csv")


@app.get("/reports/findings/pdf")
def export_findings_pdf(db: Session = Depends(get_db)):
    findings = (
        db.query(Finding)
        .join(Audit)
        .with_entities(
            Audit.name,
            Finding.category,
            Finding.description,
            Finding.severity,
            Finding.status,
        )
        .all()
    )

    pdf_bytes = generate_findings_pdf(findings)
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=hallazgos.pdf"},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    if exc.status_code == 401:
        return RedirectResponse("/login", status_code=303)
    return templates.TemplateResponse(
        "error.html",
        {"request": request, "status_code": exc.status_code, "detail": exc.detail},
        status_code=exc.status_code,
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
