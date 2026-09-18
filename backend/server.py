from fastapi import FastAPI, APIRouter, HTTPException, File, UploadFile
from fastapi import Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import requests
import logging
from pathlib import Path
from typing import Optional, List, Annotated
from uuid import uuid4
from datetime import datetime, timezone
from bson import ObjectId
from pydantic import BaseModel, Field, ConfigDict, BeforeValidator

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

CATEGORIES = {"design", "flex", "pasting", "offset"}

STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "printseva"
storage_key = None


def init_storage(force: bool = False):
    global storage_key
    if storage_key and not force:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120,
    )
    if resp.status_code in (400, 404):
        key = init_storage(force=True)
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data, timeout=120,
        )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code in (400, 404):
        key = init_storage(force=True)
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def oid(v: str) -> ObjectId:
    try:
        return ObjectId(v)
    except Exception:
        raise HTTPException(status_code=404, detail="Job not found")


def coerce_id(v):
    return str(v)


PyObjectId = Annotated[str, BeforeValidator(coerce_id)]


class BaseDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")
    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    def to_mongo(self) -> dict:
        d = self.model_dump(by_alias=True)
        if d.get("_id") is None:
            d.pop("_id", None)
        return d

    @classmethod
    def from_mongo(cls, doc: dict):
        return cls(**doc)


class Bid(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: uuid4().hex)
    vendor_name: str
    vendor_type: str = "designer"
    quote: float
    delivery_days: int
    message: str = ""
    status: str = "pending"
    created_at: str = Field(default_factory=now_iso)


class Proof(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: uuid4().hex)
    photo_url: str
    lat: float
    lng: float
    address: str
    captured_at: str
    note: str = ""


class DesignVersion(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: uuid4().hex)
    version_no: int
    url: str
    storage_path: str
    filename: str = ""
    uploaded_at: str = Field(default_factory=now_iso)


class DesignPin(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: uuid4().hex)
    version_id: str
    x_pct: float
    y_pct: float
    comment: str
    status: str = "pending"
    created_at: str = Field(default_factory=now_iso)


class DesignRoom(BaseModel):
    model_config = ConfigDict(extra="ignore")
    versions: List[DesignVersion] = Field(default_factory=list)
    pins: List[DesignPin] = Field(default_factory=list)
    approved: bool = False
    approved_at: Optional[str] = None
    forwarded_to_press: bool = False
    forwarded_at: Optional[str] = None


class Job(BaseDocument):
    title: str
    category: str
    dimension: str
    city: str
    pincode: str
    budget: float
    deadline: str
    description: str = ""
    client_name: str = "Client / Agency"
    status: str = "open"  # open | in_progress | proof_submitted | completed
    bids: List[Bid] = Field(default_factory=list)
    accepted_bid_id: Optional[str] = None
    proof: Optional[Proof] = None
    design: Optional[DesignRoom] = None
    released_amount: Optional[float] = None
    platform_fee: Optional[float] = None
    vendor_payout: Optional[float] = None
    created_at: str = Field(default_factory=now_iso)


class JobCreate(BaseModel):
    title: str
    category: str
    dimension: str
    city: str
    pincode: str
    budget: float
    deadline: str
    description: str = ""
    client_name: str = "Client / Agency"


class BidCreate(BaseModel):
    vendor_name: str
    vendor_type: str = "designer"
    quote: float
    delivery_days: int
    message: str = ""


class ProofCreate(BaseModel):
    photo_url: str
    lat: float
    lng: float
    address: str
    captured_at: str
    note: str = ""


class DesignPinCreate(BaseModel):
    version_id: str
    x_pct: float
    y_pct: float
    comment: str


class PinStatusUpdate(BaseModel):
    status: str


async def notify(role: str, title: str, body: str):
    await db.notifications.insert_one({
        "role": role,
        "title": title,
        "body": body,
        "read": False,
        "created_at": now_iso(),
    })


async def get_job_or_404(job_id: str) -> dict:
    doc = await db.jobs.find_one({"_id": oid(job_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Job not found")
    return doc


@api_router.get("/")
async def root():
    return {"message": "PrintSeva API running"}


@api_router.get("/jobs")
async def list_jobs(category: Optional[str] = None, city: Optional[str] = None, status: Optional[str] = None):
    q = {}
    if category and category != "all":
        q["category"] = category
    if city:
        q["city"] = {"$regex": city.strip(), "$options": "i"}
    if status:
        q["status"] = status
    docs = await db.jobs.find(q).sort("created_at", -1).to_list(1000)
    return [Job.from_mongo(d).model_dump() for d in docs]


@api_router.post("/jobs")
async def create_job(input: JobCreate):
    if input.category not in CATEGORIES:
        raise HTTPException(status_code=400, detail="Invalid category")
    job = Job(**input.model_dump())
    result = await db.jobs.insert_one(job.to_mongo())
    job.id = str(result.inserted_id)
    await notify("client", "Job posted", f"'{job.title}' is now live on the PrintSeva marketplace")
    return job.model_dump()


@api_router.post("/jobs/{job_id}/bids")
async def place_bid(job_id: str, input: BidCreate):
    doc = await get_job_or_404(job_id)
    if doc["status"] != "open":
        raise HTTPException(status_code=400, detail="Bidding is closed for this job")
    bid = Bid(**input.model_dump())
    await db.jobs.update_one({"_id": doc["_id"]}, {"$push": {"bids": bid.model_dump()}})
    await notify("client", "New bid received", f"{bid.vendor_name} quoted \u20b9{bid.quote:,.0f} for '{doc['title']}'")
    return bid.model_dump()


@api_router.post("/jobs/{job_id}/bids/{bid_id}/accept")
async def accept_bid(job_id: str, bid_id: str):
    doc = await get_job_or_404(job_id)
    if doc.get("accepted_bid_id"):
        raise HTTPException(status_code=400, detail="A bid is already accepted for this job")
    bid = next((b for b in doc.get("bids", []) if b["id"] == bid_id), None)
    if not bid:
        raise HTTPException(status_code=404, detail="Bid not found")
    await db.jobs.update_one(
        {"_id": doc["_id"]},
        {"$set": {
            "bids.$[accepted].status": "accepted",
            "bids.$[others].status": "rejected",
            "accepted_bid_id": bid_id,
            "status": "in_progress",
        }},
        array_filters=[{"accepted.id": bid_id}, {"others.id": {"$ne": bid_id}}],
    )
    await notify("vendor", "Bid accepted", f"Your bid of \u20b9{bid['quote']:,.0f} for '{doc['title']}' was accepted. Start work and submit proof on time.")
    return {"ok": True, "status": "in_progress"}


@api_router.post("/jobs/{job_id}/bids/{bid_id}/reject")
async def reject_bid(job_id: str, bid_id: str):
    doc = await get_job_or_404(job_id)
    bid = next((b for b in doc.get("bids", []) if b["id"] == bid_id), None)
    if not bid:
        raise HTTPException(status_code=404, detail="Bid not found")
    if doc.get("accepted_bid_id") == bid_id:
        raise HTTPException(status_code=400, detail="Cannot reject an accepted bid")
    await db.jobs.update_one(
        {"_id": doc["_id"], "bids.id": bid_id},
        {"$set": {"bids.$.status": "rejected"}},
    )
    return {"ok": True}


@api_router.post("/jobs/{job_id}/proof")
async def submit_proof(job_id: str, input: ProofCreate):
    doc = await get_job_or_404(job_id)
    if doc["status"] != "in_progress":
        raise HTTPException(status_code=400, detail="Proof can only be submitted for in-progress jobs")
    proof = Proof(**input.model_dump())
    await db.jobs.update_one(
        {"_id": doc["_id"]},
        {"$set": {"proof": proof.model_dump(), "status": "proof_submitted"}},
    )
    await notify("client", "Pasting proof submitted", f"GPS-verified proof for '{doc['title']}' is awaiting your approval")
    return proof.model_dump()


@api_router.post("/jobs/{job_id}/verify")
async def verify_job(job_id: str):
    doc = await get_job_or_404(job_id)
    if doc["status"] != "proof_submitted":
        raise HTTPException(status_code=400, detail="No proof is awaiting verification for this job")
    quote = next((b["quote"] for b in doc.get("bids", []) if b["id"] == doc.get("accepted_bid_id")), doc.get("budget", 0))
    fee = round(quote * 0.25, 2)
    payout = round(quote * 0.75, 2)
    await db.jobs.update_one(
        {"_id": doc["_id"]},
        {"$set": {
            "status": "completed",
            "released_amount": quote,
            "platform_fee": fee,
            "vendor_payout": payout,
            "released_at": now_iso(),
        }},
    )
    await notify("vendor", "Payment released", f"\u20b9{payout:,.0f} (75% of \u20b9{quote:,.0f}) added to your wallet for '{doc['title']}'")
    return {"ok": True, "status": "completed", "released_amount": quote, "platform_fee": fee, "vendor_payout": payout}


ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


@api_router.get("/files/{path:path}")
async def get_file(path: str, download: Optional[str] = None):
    try:
        data, content_type = get_object(path)
    except requests.HTTPError:
        raise HTTPException(status_code=404, detail="File not found")
    headers = {}
    if download:
        headers["Content-Disposition"] = f'attachment; filename="{path.split("/")[-1]}"'
    return Response(content=data, media_type=content_type, headers=headers)


@api_router.post("/jobs/{job_id}/design/versions")
async def upload_design_version(job_id: str, file: UploadFile = File(...)):
    doc = await get_job_or_404(job_id)
    if doc["category"] != "design":
        raise HTTPException(status_code=400, detail="Design room is available for design jobs only")
    if doc["status"] != "in_progress":
        raise HTTPException(status_code=400, detail="Drafts can be uploaded only while the job is in progress")
    if (file.content_type or "") not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Upload a JPG, PNG or WebP image")
    data = await file.read()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Max file size is 10 MB")
    ext = (file.filename or "draft.png").split(".")[-1].lower()
    path = f"{APP_NAME}/uploads/{job_id}/{uuid4().hex}.{ext}"
    result = put_object(path, data, file.content_type)
    design = doc.get("design") or {}
    versions = design.get("versions", [])
    version = {
        "id": uuid4().hex,
        "version_no": len(versions) + 1,
        "url": f"/api/files/{result['path']}",
        "storage_path": result["path"],
        "filename": file.filename or f"draft.{ext}",
        "uploaded_at": now_iso(),
    }
    design["versions"] = versions + [version]
    await db.jobs.update_one({"_id": doc["_id"]}, {"$set": {"design": design}})
    await notify("client", f"Draft V{version['version_no']} uploaded", f"A new draft for '{doc['title']}' is ready for review in the Design Room")
    return version


@api_router.post("/jobs/{job_id}/design/pins")
async def add_design_pin(job_id: str, input: DesignPinCreate):
    doc = await get_job_or_404(job_id)
    design = doc.get("design") or {}
    versions = design.get("versions", [])
    if not versions:
        raise HTTPException(status_code=400, detail="No draft uploaded yet")
    if design.get("approved"):
        raise HTTPException(status_code=400, detail="Design already approved")
    if not any(v["id"] == input.version_id for v in versions):
        raise HTTPException(status_code=400, detail="Version not found")
    if not input.comment.strip():
        raise HTTPException(status_code=400, detail="Pin comment is required")
    pin = {
        "id": uuid4().hex,
        "version_id": input.version_id,
        "x_pct": round(input.x_pct, 2),
        "y_pct": round(input.y_pct, 2),
        "comment": input.comment.strip(),
        "status": "pending",
        "created_at": now_iso(),
    }
    design["pins"] = design.get("pins", []) + [pin]
    await db.jobs.update_one({"_id": doc["_id"]}, {"$set": {"design": design}})
    await notify("vendor", "New feedback pin", f"Pin #{len(design['pins'])} on '{doc['title']}': {pin['comment'][:60]}")
    return pin


@api_router.patch("/jobs/{job_id}/design/pins/{pin_id}")
async def update_design_pin(job_id: str, pin_id: str, input: PinStatusUpdate):
    doc = await get_job_or_404(job_id)
    if input.status not in ("pending", "resolved"):
        raise HTTPException(status_code=400, detail="Invalid pin status")
    result = await db.jobs.update_one(
        {"_id": doc["_id"], "design.pins.id": pin_id},
        {"$set": {"design.pins.$.status": input.status}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Pin not found")
    return {"ok": True, "status": input.status}


@api_router.post("/jobs/{job_id}/design/approve")
async def approve_design(job_id: str):
    doc = await get_job_or_404(job_id)
    if doc["category"] != "design":
        raise HTTPException(status_code=400, detail="Design approval applies to design jobs only")
    design = doc.get("design") or {}
    if not design.get("versions"):
        raise HTTPException(status_code=400, detail="No draft available to approve")
    if design.get("approved"):
        raise HTTPException(status_code=400, detail="Design already approved")
    if doc["status"] != "in_progress":
        raise HTTPException(status_code=400, detail="Job is not active")
    quote = next((b["quote"] for b in doc.get("bids", []) if b["id"] == doc.get("accepted_bid_id")), doc.get("budget", 0))
    fee = round(quote * 0.25, 2)
    payout = round(quote * 0.75, 2)
    design["approved"] = True
    design["approved_at"] = now_iso()
    await db.jobs.update_one(
        {"_id": doc["_id"]},
        {"$set": {"design": design, "status": "completed", "released_amount": quote, "platform_fee": fee, "vendor_payout": payout, "released_at": now_iso()}},
    )
    await notify("vendor", "Design approved & payment released", f"'{doc['title']}' was approved. \u20b9{payout:,.0f} (75%) settled to your wallet.")
    return {"ok": True, "released_amount": quote, "platform_fee": fee, "vendor_payout": payout}


@api_router.post("/jobs/{job_id}/design/forward-press")
async def forward_design_press(job_id: str):
    doc = await get_job_or_404(job_id)
    design = doc.get("design") or {}
    if not design.get("approved"):
        raise HTTPException(status_code=400, detail="Approve the design before sending it to press")
    if design.get("forwarded_to_press"):
        raise HTTPException(status_code=400, detail="Design already forwarded to press")
    design["forwarded_to_press"] = True
    design["forwarded_at"] = now_iso()
    await db.jobs.update_one({"_id": doc["_id"]}, {"$set": {"design": design}})
    await notify("client", "Sent to printing press", f"'{doc['title']}' was forwarded to production")
    return {"ok": True}


@api_router.get("/wallet")
async def wallet():
    docs = await db.jobs.find({}).to_list(1000)
    escrow = 0.0
    escrow_count = 0
    platform_fees = 0.0
    vendor_payouts = 0.0
    released_total = 0.0
    completed = 0
    open_jobs = 0
    for j in docs:
        quote = next((b["quote"] for b in j.get("bids", []) if b["id"] == j.get("accepted_bid_id")), None)
        if j["status"] in ("in_progress", "proof_submitted") and quote:
            escrow += quote
            escrow_count += 1
        elif j["status"] == "completed" and quote:
            platform_fees += j.get("platform_fee") if j.get("platform_fee") is not None else quote * 0.25
            vendor_payouts += j.get("vendor_payout") if j.get("vendor_payout") is not None else quote * 0.75
            released_total += quote
            completed += 1
        if j["status"] == "open":
            open_jobs += 1
    return {
        "escrow_balance": round(escrow, 2),
        "escrow_count": escrow_count,
        "platform_fees": round(platform_fees, 2),
        "vendor_payouts": round(vendor_payouts, 2),
        "released_total": round(released_total, 2),
        "completed_jobs": completed,
        "open_jobs": open_jobs,
    }


@api_router.get("/notifications")
async def list_notifications(role: Optional[str] = None):
    q = {"role": role} if role else {}
    docs = await db.notifications.find(q).sort("created_at", -1).to_list(30)
    out = []
    for d in docs:
        d["id"] = str(d.pop("_id", ""))
        out.append(d)
    return out


@api_router.post("/notifications/read")
async def read_notifications():
    await db.notifications.update_many({}, {"$set": {"read": True}})
    return {"ok": True}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
