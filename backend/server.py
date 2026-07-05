from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
import uuid
import random
import secrets
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal
from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request, Query, UploadFile, File
from fastapi.responses import Response
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict
import base64

# ---------------- Config ----------------
JWT_ALGORITHM = "HS256"
JWT_SECRET = os.environ["JWT_SECRET"]
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
CORS_ORIGINS = [o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()]

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="Customer Registry Pro API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("crp")


# ---------------- Utils ----------------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def get_current_user(request: Request) -> dict:
    token = None
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth[7:]
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ---------------- Models ----------------
class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str
    avatar: Optional[str] = None
    created_at: str


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ForgotIn(BaseModel):
    email: EmailStr


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    avatar: Optional[str] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6)


class CustomerIn(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    company: Optional[str] = None
    status: Literal["active", "inactive", "vip"] = "active"
    tags: List[str] = []
    notes: Optional[str] = None
    avatar: Optional[str] = None
    location: Optional[str] = None


class CustomerOut(CustomerIn):
    id: str
    created_at: str
    updated_at: str


class ComplaintIn(BaseModel):
    customer_id: str
    subject: str
    description: str
    priority: Literal["low", "medium", "high", "critical"] = "medium"
    status: Literal["open", "pending", "in_progress", "resolved", "closed"] = "open"
    category: str = "General"
    assignee: Optional[str] = None


class ComplaintUpdate(BaseModel):
    subject: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[Literal["low", "medium", "high", "critical"]] = None
    status: Optional[Literal["open", "pending", "in_progress", "resolved", "closed"]] = None
    category: Optional[str] = None
    assignee: Optional[str] = None
    resolution: Optional[str] = None


class CommentIn(BaseModel):
    body: str
    internal: bool = False


class TicketIn(BaseModel):
    customer_id: str
    title: str
    description: str
    priority: Literal["low", "medium", "high", "critical"] = "medium"
    status: Literal["open", "pending", "in_progress", "resolved", "closed"] = "open"
    channel: Literal["email", "phone", "chat", "web", "social"] = "email"
    assignee: Optional[str] = None


class InteractionIn(BaseModel):
    customer_id: str
    kind: Literal["call", "email", "meeting", "note", "chat"] = "note"
    summary: str
    body: Optional[str] = None


# ---------------- Auth Endpoints ----------------
@api.post("/auth/register", response_model=UserOut)
async def register(data: RegisterIn):
    email = data.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id,
        "email": email,
        "name": data.name,
        "role": "agent",
        "avatar": None,
        "password_hash": hash_password(data.password),
        "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    doc.pop("password_hash", None)
    doc.pop("_id", None)
    return doc


@api.post("/auth/login")
async def login(data: LoginIn):
    email = data.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], user["email"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "avatar": user.get("avatar"),
            "created_at": user["created_at"],
        },
    }


@api.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return user


@api.post("/auth/forgot-password")
async def forgot_password(data: ForgotIn):
    email = data.email.lower()
    user = await db.users.find_one({"email": email})
    if user:
        token = secrets.token_urlsafe(32)
        await db.password_reset_tokens.insert_one({
            "token": token,
            "user_id": user["id"],
            "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
            "used": False,
        })
        logger.info(f"[MOCKED EMAIL] Password reset link for {email}: /reset-password?token={token}")
    # Always return success (avoid enumeration)
    return {"message": "If the email exists, an OTP has been sent"}


@api.put("/auth/profile", response_model=UserOut)
async def update_profile(data: ProfileUpdate, user: dict = Depends(get_current_user)):
    update = {k: v for k, v in data.model_dump(exclude_none=True).items()}
    if update:
        await db.users.update_one({"id": user["id"]}, {"$set": update})
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return updated


@api.post("/auth/change-password")
async def change_password(data: PasswordChange, user: dict = Depends(get_current_user)):
    doc = await db.users.find_one({"id": user["id"]})
    if not verify_password(data.current_password, doc["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    await db.users.update_one({"id": user["id"]}, {"$set": {"password_hash": hash_password(data.new_password)}})
    return {"message": "Password updated"}


# ---------------- Customers ----------------
@api.get("/customers")
async def list_customers(
    q: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    user: dict = Depends(get_current_user),
):
    query: dict = {}
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
            {"company": {"$regex": q, "$options": "i"}},
        ]
    if status and status != "all":
        query["status"] = status
    total = await db.customers.count_documents(query)
    cursor = db.customers.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    items = await cursor.to_list(length=limit)
    return {"total": total, "items": items}


@api.post("/customers", response_model=CustomerOut)
async def create_customer(data: CustomerIn, user: dict = Depends(get_current_user)):
    doc = data.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_iso()
    doc["updated_at"] = now_iso()
    await db.customers.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/customers/{cid}", response_model=CustomerOut)
async def get_customer(cid: str, user: dict = Depends(get_current_user)):
    doc = await db.customers.find_one({"id": cid}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    return doc


@api.put("/customers/{cid}", response_model=CustomerOut)
async def update_customer(cid: str, data: CustomerIn, user: dict = Depends(get_current_user)):
    payload = data.model_dump()
    payload["updated_at"] = now_iso()
    await db.customers.update_one({"id": cid}, {"$set": payload})
    doc = await db.customers.find_one({"id": cid}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    return doc


@api.delete("/customers/{cid}")
async def delete_customer(cid: str, user: dict = Depends(get_current_user)):
    await db.customers.delete_one({"id": cid})
    await db.complaints.delete_many({"customer_id": cid})
    await db.tickets.delete_many({"customer_id": cid})
    await db.interactions.delete_many({"customer_id": cid})
    return {"message": "Deleted"}


# ---------------- Complaints ----------------
@api.get("/complaints")
async def list_complaints(
    q: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    customer_id: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    query: dict = {}
    if q:
        query["$or"] = [
            {"subject": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
        ]
    if status and status != "all":
        query["status"] = status
    if priority and priority != "all":
        query["priority"] = priority
    if customer_id:
        query["customer_id"] = customer_id
    items = await db.complaints.find(query, {"_id": 0}).sort("created_at", -1).to_list(length=500)
    # attach customer name for convenience
    cust_ids = list({c["customer_id"] for c in items})
    customers = await db.customers.find({"id": {"$in": cust_ids}}, {"_id": 0, "id": 1, "name": 1, "email": 1, "avatar": 1}).to_list(length=len(cust_ids))
    cmap = {c["id"]: c for c in customers}
    for c in items:
        c["customer"] = cmap.get(c["customer_id"])
    return items


@api.post("/complaints")
async def create_complaint(data: ComplaintIn, user: dict = Depends(get_current_user)):
    doc = data.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_iso()
    doc["updated_at"] = now_iso()
    doc["resolution"] = None
    doc["attachments"] = []
    doc["comments"] = []
    doc["timeline"] = [{"at": now_iso(), "by": user["name"], "event": "created"}]
    await db.complaints.insert_one(doc)
    await add_notification(f"New complaint: {data.subject}", "complaint", severity="info")
    doc.pop("_id", None)
    return doc


@api.get("/complaints/{cid}")
async def get_complaint(cid: str, user: dict = Depends(get_current_user)):
    doc = await db.complaints.find_one({"id": cid}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    if doc.get("customer_id"):
        doc["customer"] = await db.customers.find_one({"id": doc["customer_id"]}, {"_id": 0})
    return doc


@api.put("/complaints/{cid}")
async def update_complaint(cid: str, data: ComplaintUpdate, user: dict = Depends(get_current_user)):
    existing = await db.complaints.find_one({"id": cid})
    if not existing:
        raise HTTPException(status_code=404, detail="Not found")
    payload = {k: v for k, v in data.model_dump(exclude_none=True).items()}
    payload["updated_at"] = now_iso()
    timeline = existing.get("timeline", [])
    if "status" in payload and payload["status"] != existing.get("status"):
        timeline.append({"at": now_iso(), "by": user["name"], "event": f"status -> {payload['status']}"})
    if "priority" in payload and payload["priority"] != existing.get("priority"):
        timeline.append({"at": now_iso(), "by": user["name"], "event": f"priority -> {payload['priority']}"})
    payload["timeline"] = timeline
    await db.complaints.update_one({"id": cid}, {"$set": payload})
    doc = await db.complaints.find_one({"id": cid}, {"_id": 0})
    return doc


@api.delete("/complaints/{cid}")
async def delete_complaint(cid: str, user: dict = Depends(get_current_user)):
    await db.complaints.delete_one({"id": cid})
    return {"message": "Deleted"}


@api.post("/complaints/{cid}/comments")
async def add_comment(cid: str, data: CommentIn, user: dict = Depends(get_current_user)):
    entry = {
        "id": str(uuid.uuid4()),
        "by": user["name"],
        "by_id": user["id"],
        "body": data.body,
        "internal": data.internal,
        "at": now_iso(),
    }
    await db.complaints.update_one({"id": cid}, {"$push": {"comments": entry}})
    return entry


@api.post("/complaints/{cid}/attachments")
async def add_attachment(cid: str, file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")
    b64 = base64.b64encode(content).decode("utf-8")
    attachment = {
        "id": str(uuid.uuid4()),
        "filename": file.filename,
        "content_type": file.content_type,
        "size": len(content),
        "data": b64,
        "uploaded_by": user["name"],
        "at": now_iso(),
    }
    await db.complaints.update_one({"id": cid}, {"$push": {"attachments": attachment}})
    return {"id": attachment["id"], "filename": attachment["filename"], "size": attachment["size"], "content_type": attachment["content_type"], "at": attachment["at"]}


# ---------------- Tickets ----------------
@api.get("/tickets")
async def list_tickets(user: dict = Depends(get_current_user)):
    items = await db.tickets.find({}, {"_id": 0}).sort("created_at", -1).to_list(length=500)
    cust_ids = list({t["customer_id"] for t in items})
    customers = await db.customers.find({"id": {"$in": cust_ids}}, {"_id": 0, "id": 1, "name": 1, "email": 1, "avatar": 1}).to_list(length=len(cust_ids))
    cmap = {c["id"]: c for c in customers}
    for t in items:
        t["customer"] = cmap.get(t["customer_id"])
    return items


@api.post("/tickets")
async def create_ticket(data: TicketIn, user: dict = Depends(get_current_user)):
    doc = data.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_iso()
    doc["updated_at"] = now_iso()
    await db.tickets.insert_one(doc)
    await add_notification(f"New ticket: {data.title}", "ticket", severity="info")
    doc.pop("_id", None)
    return doc


@api.put("/tickets/{tid}")
async def update_ticket(tid: str, data: TicketIn, user: dict = Depends(get_current_user)):
    payload = data.model_dump()
    payload["updated_at"] = now_iso()
    await db.tickets.update_one({"id": tid}, {"$set": payload})
    return await db.tickets.find_one({"id": tid}, {"_id": 0})


@api.delete("/tickets/{tid}")
async def delete_ticket(tid: str, user: dict = Depends(get_current_user)):
    await db.tickets.delete_one({"id": tid})
    return {"message": "Deleted"}


# ---------------- Interactions ----------------
@api.get("/interactions")
async def list_interactions(customer_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query: dict = {}
    if customer_id:
        query["customer_id"] = customer_id
    items = await db.interactions.find(query, {"_id": 0}).sort("created_at", -1).to_list(length=500)
    cust_ids = list({i["customer_id"] for i in items})
    customers = await db.customers.find({"id": {"$in": cust_ids}}, {"_id": 0, "id": 1, "name": 1, "avatar": 1}).to_list(length=len(cust_ids))
    cmap = {c["id"]: c for c in customers}
    for i in items:
        i["customer"] = cmap.get(i["customer_id"])
    return items


@api.post("/interactions")
async def create_interaction(data: InteractionIn, user: dict = Depends(get_current_user)):
    doc = data.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_iso()
    doc["by"] = user["name"]
    await db.interactions.insert_one(doc)
    doc.pop("_id", None)
    return doc


# ---------------- Notifications ----------------
async def add_notification(message: str, kind: str = "info", severity: str = "info"):
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "message": message,
        "kind": kind,
        "severity": severity,
        "read": False,
        "created_at": now_iso(),
    })


@api.get("/notifications")
async def list_notifications(user: dict = Depends(get_current_user)):
    items = await db.notifications.find({}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(length=50)
    unread = await db.notifications.count_documents({"read": False})
    return {"items": items, "unread": unread}


@api.post("/notifications/{nid}/read")
async def mark_read(nid: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one({"id": nid}, {"$set": {"read": True}})
    return {"message": "ok"}


@api.post("/notifications/read-all")
async def mark_all_read(user: dict = Depends(get_current_user)):
    await db.notifications.update_many({"read": False}, {"$set": {"read": True}})
    return {"message": "ok"}


# ---------------- Dashboard / Analytics ----------------
@api.get("/dashboard/stats")
async def dashboard_stats(user: dict = Depends(get_current_user)):
    total_customers = await db.customers.count_documents({})
    active = await db.customers.count_documents({"status": "active"})
    inactive = await db.customers.count_documents({"status": "inactive"})
    vip = await db.customers.count_documents({"status": "vip"})
    open_c = await db.complaints.count_documents({"status": "open"})
    pending = await db.complaints.count_documents({"status": "pending"})
    in_progress = await db.complaints.count_documents({"status": "in_progress"})
    resolved = await db.complaints.count_documents({"status": "resolved"})
    closed = await db.complaints.count_documents({"status": "closed"})
    critical = await db.complaints.count_documents({"priority": "critical"})
    total_complaints = await db.complaints.count_documents({})

    # Monthly growth (last 6 months)
    now = datetime.now(timezone.utc)
    months = []
    for i in range(5, -1, -1):
        month_start = (now.replace(day=1) - timedelta(days=30 * i))
        month_label = month_start.strftime("%b")
        # count docs whose created_at ISO starts with the year-month
        ym = month_start.strftime("%Y-%m")
        cust_count = await db.customers.count_documents({"created_at": {"$regex": f"^{ym}"}})
        comp_count = await db.complaints.count_documents({"created_at": {"$regex": f"^{ym}"}})
        months.append({"month": month_label, "customers": cust_count, "complaints": comp_count})

    # Category breakdown
    categories_cursor = db.complaints.aggregate([{"$group": {"_id": "$category", "count": {"$sum": 1}}}])
    categories = []
    async for c in categories_cursor:
        categories.append({"category": c["_id"] or "General", "count": c["count"]})

    return {
        "customers": {"total": total_customers, "active": active, "inactive": inactive, "vip": vip},
        "complaints": {
            "total": total_complaints,
            "open": open_c,
            "pending": pending,
            "in_progress": in_progress,
            "resolved": resolved,
            "closed": closed,
            "critical": critical,
        },
        "revenue_placeholder": 128420,
        "csat": 92,
        "avg_resolution_hours": 6.4,
        "monthly": months,
        "categories": categories,
    }


@api.get("/dashboard/activity")
async def dashboard_activity(user: dict = Depends(get_current_user)):
    recent_complaints = await db.complaints.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(length=5)
    recent_interactions = await db.interactions.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(length=5)
    upcoming = await db.interactions.find({"kind": {"$in": ["call", "meeting"]}}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(length=5)
    return {"complaints": recent_complaints, "interactions": recent_interactions, "upcoming": upcoming}


# ---------------- Search ----------------
@api.get("/search")
async def global_search(q: str, user: dict = Depends(get_current_user)):
    if not q or len(q) < 2:
        return {"customers": [], "complaints": [], "tickets": []}
    cust = await db.customers.find(
        {"$or": [{"name": {"$regex": q, "$options": "i"}}, {"email": {"$regex": q, "$options": "i"}}]},
        {"_id": 0, "id": 1, "name": 1, "email": 1, "avatar": 1},
    ).limit(5).to_list(length=5)
    comp = await db.complaints.find(
        {"subject": {"$regex": q, "$options": "i"}},
        {"_id": 0, "id": 1, "subject": 1, "status": 1, "priority": 1},
    ).limit(5).to_list(length=5)
    tick = await db.tickets.find(
        {"title": {"$regex": q, "$options": "i"}},
        {"_id": 0, "id": 1, "title": 1, "status": 1},
    ).limit(5).to_list(length=5)
    return {"customers": cust, "complaints": comp, "tickets": tick}


# ---------------- Startup: seed ----------------
FIRST_NAMES = ["Aarav", "Vivaan", "Aditya", "Diya", "Anaya", "Ishaan", "Kabir", "Advait", "Meera", "Ananya",
               "Riya", "Rohan", "Sara", "Aryan", "Zara", "Priya", "Nikhil", "Tara", "Yash", "Ira",
               "Sofia", "Liam", "Emma", "Noah", "Olivia", "Ethan", "Ava", "Lucas", "Mia", "Mason"]
LAST_NAMES = ["Sharma", "Verma", "Iyer", "Patel", "Reddy", "Khan", "Kapoor", "Mehta", "Rao", "Chatterjee",
              "Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Garcia", "Wilson", "Chen"]
COMPANIES = ["Nova Labs", "Orbit Systems", "Aether Cloud", "Kinetic Retail", "Vertex Analytics",
             "Beacon Health", "Prism Logistics", "Stellar Motors", "Fusion Media", "Loom Digital",
             "Cinder Studios", "Halo Fintech", "Meridian Foods", "Zephyr AI", "Ridge Robotics"]
LOCATIONS = ["Bengaluru, IN", "Mumbai, IN", "Delhi, IN", "San Francisco, US", "New York, US",
             "London, UK", "Berlin, DE", "Singapore, SG", "Sydney, AU", "Toronto, CA"]
CATEGORIES = ["Billing", "Technical", "Delivery", "Product", "Account", "Feature Request", "Bug"]
SUBJECTS = [
    "Payment failed at checkout", "Cannot login to my account", "Order arrived damaged",
    "App crashes on launch", "Wrong item shipped", "Refund not processed",
    "Unable to reset password", "Slow response from support", "Feature request: dark mode",
    "Subscription auto-renewed unexpectedly", "Dashboard shows wrong metrics",
    "Data export not working", "Integration disconnected", "2FA issues on new device",
    "Address update not saving",
]
STATUSES = ["open", "pending", "in_progress", "resolved", "closed"]
PRIORITIES = ["low", "medium", "high", "critical"]
CHANNELS = ["email", "phone", "chat", "web", "social"]
AVATARS = [
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?crop=entropy&cs=srgb&fm=jpg&w=200&q=80",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?crop=entropy&cs=srgb&fm=jpg&w=200&q=80",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=entropy&cs=srgb&fm=jpg&w=200&q=80",
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?crop=entropy&cs=srgb&fm=jpg&w=200&q=80",
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?crop=entropy&cs=srgb&fm=jpg&w=200&q=80",
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?crop=entropy&cs=srgb&fm=jpg&w=200&q=80",
]


async def seed_admin():
    email = os.environ["ADMIN_EMAIL"].lower()
    password = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": email,
            "name": "Admin",
            "role": "admin",
            "avatar": AVATARS[0],
            "password_hash": hash_password(password),
            "created_at": now_iso(),
        })
        logger.info(f"Seeded admin: {email}")
    else:
        if not verify_password(password, existing["password_hash"]):
            await db.users.update_one({"email": email}, {"$set": {"password_hash": hash_password(password)}})
            logger.info(f"Updated admin password: {email}")


async def seed_demo_data():
    if await db.customers.count_documents({}) > 0:
        return
    random.seed(7)
    now = datetime.now(timezone.utc)

    # Customers
    customer_ids: List[str] = []
    for i in range(48):
        fn = random.choice(FIRST_NAMES)
        ln = random.choice(LAST_NAMES)
        name = f"{fn} {ln}"
        email = f"{fn.lower()}.{ln.lower()}{i}@example.com"
        status_choice = random.choices(["active", "inactive", "vip"], weights=[65, 20, 15])[0]
        created = now - timedelta(days=random.randint(0, 170))
        cid = str(uuid.uuid4())
        customer_ids.append(cid)
        await db.customers.insert_one({
            "id": cid,
            "name": name,
            "email": email,
            "phone": f"+91-9{random.randint(100000000, 999999999)}",
            "company": random.choice(COMPANIES),
            "status": status_choice,
            "tags": random.sample(["premium", "trial", "enterprise", "smb", "priority", "churn-risk"], k=random.randint(1, 3)),
            "notes": "Long-time customer. Prefers email contact.",
            "avatar": random.choice(AVATARS),
            "location": random.choice(LOCATIONS),
            "created_at": created.isoformat(),
            "updated_at": created.isoformat(),
        })

    # Complaints
    for _ in range(60):
        cid = random.choice(customer_ids)
        created = now - timedelta(days=random.randint(0, 170), hours=random.randint(0, 23))
        status = random.choices(STATUSES, weights=[20, 15, 20, 30, 15])[0]
        await db.complaints.insert_one({
            "id": str(uuid.uuid4()),
            "customer_id": cid,
            "subject": random.choice(SUBJECTS),
            "description": "Customer reported an issue. Awaiting investigation and follow-up.",
            "priority": random.choices(PRIORITIES, weights=[30, 40, 20, 10])[0],
            "status": status,
            "category": random.choice(CATEGORIES),
            "assignee": "Admin",
            "resolution": "Issue resolved after investigation." if status in ("resolved", "closed") else None,
            "attachments": [],
            "comments": [],
            "timeline": [{"at": created.isoformat(), "by": "System", "event": "created"}],
            "created_at": created.isoformat(),
            "updated_at": created.isoformat(),
        })

    # Tickets
    for _ in range(24):
        cid = random.choice(customer_ids)
        created = now - timedelta(days=random.randint(0, 60))
        await db.tickets.insert_one({
            "id": str(uuid.uuid4()),
            "customer_id": cid,
            "title": random.choice(SUBJECTS),
            "description": "Support ticket opened via channel.",
            "priority": random.choice(PRIORITIES),
            "status": random.choice(STATUSES),
            "channel": random.choice(CHANNELS),
            "assignee": "Admin",
            "created_at": created.isoformat(),
            "updated_at": created.isoformat(),
        })

    # Interactions
    kinds = ["call", "email", "meeting", "note", "chat"]
    for _ in range(80):
        cid = random.choice(customer_ids)
        created = now - timedelta(days=random.randint(0, 90))
        await db.interactions.insert_one({
            "id": str(uuid.uuid4()),
            "customer_id": cid,
            "kind": random.choice(kinds),
            "summary": random.choice([
                "Discussed billing concerns",
                "Onboarded new user",
                "Renewal call scheduled",
                "Follow-up on ticket",
                "Product demo requested",
                "Escalation review",
            ]),
            "body": "Detailed notes about the interaction and next steps.",
            "by": "Admin",
            "created_at": created.isoformat(),
        })

    # Notifications
    for msg in [
        ("New complaint: Payment failed at checkout", "warning"),
        ("Complaint resolved: App crashes on launch", "success"),
        ("New VIP customer added: Priya Sharma", "info"),
        ("Critical complaint escalated", "error"),
        ("Weekly report available", "info"),
    ]:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "message": msg[0],
            "kind": "system",
            "severity": msg[1],
            "read": False,
            "created_at": (now - timedelta(hours=random.randint(1, 48))).isoformat(),
        })
    logger.info("Seeded demo data.")


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.customers.create_index("email")
    await db.complaints.create_index("status")
    await db.complaints.create_index("customer_id")
    await seed_admin()
    await seed_demo_data()


@app.on_event("shutdown")
async def shutdown():
    client.close()


# ---------------- Middleware & mount ----------------
@api.get("/")
async def root():
    return {"message": "Customer Registry Pro API", "status": "ok"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
