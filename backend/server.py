from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import re
import secrets
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# CORS - must be added right after app creation
app.add_middleware(
    CORSMiddleware,
    allow_credentials=False,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security for admin
security = HTTPBasic()

def verify_admin(credentials: HTTPBasicCredentials = Depends(security)):
    correct_username = secrets.compare_digest(credentials.username, os.environ.get("BASIC_AUTH_USERNAME", "admin"))
    correct_password = secrets.compare_digest(credentials.password, os.environ.get("BASIC_AUTH_PASSWORD", "ilkaps"))
    if not (correct_username and correct_password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect credentials",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

# ============= MODELS =============

class Driver(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    plate: str
    area: str = ""
    facility: str = ""
    phone: str = ""
    email: str = ""
    active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class DriverCreate(BaseModel):
    name: str
    plate: str
    area: str = ""
    facility: str = ""
    phone: str = ""
    email: str = ""

class DriverUpdate(BaseModel):
    name: Optional[str] = None
    plate: Optional[str] = None
    area: Optional[str] = None
    facility: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    active: Optional[bool] = None

class Tour(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str
    container: str = ""
    fraction: str
    facility: str
    address: str
    weight: Optional[float] = None
    time: str = ""
    completed: bool = False
    on_way: bool = False
    is_pause: bool = False
    is_same_day: bool = False
    open_from: str = ""
    open_to: str = ""
    remark: str = ""
    plads: str = ""
    driver_id: str = ""
    driver_name: str = ""
    report_id: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class TourCreate(BaseModel):
    date: str = ""
    container: str = ""
    fraction: str
    facility: str
    address: str = ""
    is_same_day: bool = False
    open_from: str = ""
    open_to: str = ""
    remark: str = ""
    plads: str = ""
    driver_id: str = ""
    driver_name: str = ""
    report_id: str = ""

class TourUpdate(BaseModel):
    weight: Optional[float] = None
    time: Optional[str] = None
    completed: Optional[bool] = None
    on_way: Optional[bool] = None

class Report(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    driver_id: str = ""
    driver_name: str = ""
    vehicle_reg: str = ""
    start_time: str = ""
    end_time: str = ""
    report_date: str = ""
    plads: str = ""
    notes: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ReportCreate(BaseModel):
    driver_id: str = ""
    driver_name: str = ""
    vehicle_reg: str = ""
    start_time: str = ""
    end_time: str = ""
    report_date: str = ""
    plads: str = ""
    notes: str = ""

class ReportUpdate(BaseModel):
    driver_id: Optional[str] = None
    driver_name: Optional[str] = None
    vehicle_reg: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    report_date: Optional[str] = None
    plads: Optional[str] = None
    notes: Optional[str] = None

class ParsedTour(BaseModel):
    date: str
    container: str
    fraction: str
    facility: str
    address: str
    open_from: str = ""
    open_to: str = ""
    remark: str = ""

class ParseMailRequest(BaseModel):
    text: str
    report_id: str = ""

class ParseMailResponse(BaseModel):
    success: bool
    tours: List[ParsedTour]
    count: int
    debug_info: str = ""
    grouped_by_facility: dict = {}

class Message(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    from_admin: bool = True
    to_driver_id: str
    to_driver_name: str = ""
    content: str
    read: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class MessageCreate(BaseModel):
    to_driver_id: str
    content: str

class DriverStats(BaseModel):
    driver_id: str
    driver_name: str
    plate: str
    total_tours: int = 0
    completed_tours: int = 0
    total_weight: float = 0
    today_tours: int = 0
    today_completed: int = 0
    last_start_time: str = ""
    last_end_time: str = ""
    reports: List[dict] = []

class Plads(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PladsCreate(BaseModel):
    name: str

class Schedule(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    driver_id: str
    driver_name: str
    date: str  # YYYY-MM-DD
    plads: str  # plads name or "FRI"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ScheduleCreate(BaseModel):
    driver_id: str
    driver_name: str
    date: str
    plads: str

class ScheduleBulkCreate(BaseModel):
    schedules: List[ScheduleCreate]

class ReportHistory(BaseModel):
    date: str
    total_tours: int
    completed_tours: int
    total_weight: float
    driver_count: int
    reports: List[dict]

# ============= DRIVER ENDPOINTS =============

@api_router.get("/drivers", response_model=List[Driver])
async def get_drivers():
    drivers = await db.drivers.find({}, {"_id": 0}).to_list(100)
    return drivers

@api_router.get("/drivers/{driver_id}", response_model=Driver)
async def get_driver(driver_id: str):
    driver = await db.drivers.find_one({"id": driver_id}, {"_id": 0})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    return Driver(**driver)

@api_router.post("/drivers", response_model=Driver)
async def create_driver(driver: DriverCreate):
    driver_obj = Driver(**driver.model_dump())
    doc = driver_obj.model_dump()
    await db.drivers.insert_one(doc)
    return driver_obj

@api_router.put("/drivers/{driver_id}", response_model=Driver)
async def update_driver(driver_id: str, update: DriverUpdate):
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.drivers.update_one(
        {"id": driver_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    driver = await db.drivers.find_one({"id": driver_id}, {"_id": 0})
    return Driver(**driver)

@api_router.delete("/drivers/{driver_id}")
async def delete_driver(driver_id: str):
    result = await db.drivers.delete_one({"id": driver_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Driver not found")
    return {"message": "Driver deleted"}

# ============= TOUR ENDPOINTS =============

@api_router.get("/tours", response_model=List[Tour])
async def get_tours(report_id: Optional[str] = None, plads: Optional[str] = None, driver_id: Optional[str] = None):
    query = {}
    if report_id:
        query["report_id"] = report_id
    if plads:
        query["plads"] = plads
    if driver_id:
        query["driver_id"] = driver_id
    tours = await db.tours.find(query, {"_id": 0}).to_list(500)
    return tours

@api_router.post("/tours", response_model=Tour)
async def create_tour(tour: TourCreate):
    tour_obj = Tour(**tour.model_dump())
    doc = tour_obj.model_dump()
    await db.tours.insert_one(doc)
    return tour_obj

@api_router.post("/tours/bulk", response_model=List[Tour])
async def create_tours_bulk(tours: List[TourCreate]):
    created_tours = []
    for tour in tours:
        tour_obj = Tour(**tour.model_dump())
        doc = tour_obj.model_dump()
        await db.tours.insert_one(doc)
        created_tours.append(tour_obj)
    return created_tours

@api_router.put("/tours/{tour_id}", response_model=Tour)
async def update_tour(tour_id: str, update: TourUpdate):
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.tours.update_one(
        {"id": tour_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tour not found")
    
    tour = await db.tours.find_one({"id": tour_id}, {"_id": 0})
    return Tour(**tour)

@api_router.delete("/tours/{tour_id}")
async def delete_tour(tour_id: str):
    result = await db.tours.delete_one({"id": tour_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tour not found")
    return {"message": "Tour deleted"}

@api_router.delete("/tours/report/{report_id}")
async def delete_tours_by_report(report_id: str):
    result = await db.tours.delete_many({"report_id": report_id})
    return {"message": f"Deleted {result.deleted_count} tours"}

# ============= REPORT ENDPOINTS =============

@api_router.get("/reports/history")
async def get_report_history(days: int = 30):
    """Get report history for the last N days"""
    from datetime import timedelta
    
    history = []
    today = datetime.now(timezone.utc).date()
    
    for i in range(days):
        date = today - timedelta(days=i)
        date_str = date.strftime("%Y-%m-%d")
        
        # Get reports for this date
        day_reports = await db.reports.find(
            {"report_date": date_str},
            {"_id": 0}
        ).to_list(100)
        
        if not day_reports:
            continue
            
        # Get tours for this date
        day_tours = await db.tours.find(
            {"date": date_str, "is_pause": False},
            {"_id": 0}
        ).to_list(500)
        
        total_tours = len(day_tours)
        completed_tours = len([t for t in day_tours if t.get("completed")])
        total_weight = sum(t.get("weight", 0) or 0 for t in day_tours)
        
        # Get unique drivers
        driver_ids = set(r.get("driver_id") for r in day_reports if r.get("driver_id"))
        
        history.append({
            "date": date_str,
            "total_tours": total_tours,
            "completed_tours": completed_tours,
            "total_weight": total_weight,
            "driver_count": len(driver_ids),
            "reports": [{
                "id": r["id"],
                "driver_name": r.get("driver_name", ""),
                "start_time": r.get("start_time", ""),
                "end_time": r.get("end_time", ""),
                "plads": r.get("plads", "")
            } for r in day_reports[:10]]
        })
    
    return history

@api_router.get("/reports", response_model=List[Report])
async def get_reports(driver_id: Optional[str] = None, date: Optional[str] = None):
    query = {}
    if driver_id:
        query["driver_id"] = driver_id
    if date:
        query["report_date"] = date
    reports = await db.reports.find(query, {"_id": 0}).to_list(100)
    return reports

@api_router.get("/reports/{report_id}", response_model=Report)
async def get_report(report_id: str):
    report = await db.reports.find_one({"id": report_id}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return Report(**report)

@api_router.post("/reports", response_model=Report)
async def create_report(report: ReportCreate):
    report_obj = Report(**report.model_dump())
    doc = report_obj.model_dump()
    await db.reports.insert_one(doc)
    return report_obj

@api_router.put("/reports/{report_id}", response_model=Report)
async def update_report(report_id: str, update: ReportUpdate):
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.reports.update_one(
        {"id": report_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Report not found")
    
    report = await db.reports.find_one({"id": report_id}, {"_id": 0})
    return Report(**report)

@api_router.delete("/reports/{report_id}")
async def delete_report(report_id: str):
    await db.tours.delete_many({"report_id": report_id})
    result = await db.reports.delete_one({"id": report_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Report not found")
    return {"message": "Report and associated tours deleted"}

# ============= MAIL PARSING ENDPOINT =============

@api_router.post("/parse-mail", response_model=ParseMailResponse)
async def parse_mail(request: ParseMailRequest):
    text = request.text
    debug_lines = []
    
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    debug_lines.append(f"Total lines found: {len(lines)}")
    
    parsed_tours = []
    facility_groups = {}
    
    first_line = lines[0].lower() if lines else ""
    start_idx = 0
    if "afhentning" in first_line or "container" in first_line or "fraktion" in first_line:
        start_idx = 1
        debug_lines.append("Header line detected, skipping")
    
    for i, line in enumerate(lines[start_idx:], start=start_idx):
        parts = line.split('\t')
        
        if len(parts) < 5:
            parts = re.split(r'\s{2,}', line)
        
        if len(parts) >= 6:
            try:
                date = parts[0].strip()
                container = parts[1].strip()
                fraction = parts[2].strip()
                facility = parts[4].strip()
                address = parts[5].strip()
                open_from = parts[6].strip() if len(parts) > 6 else ""
                open_to = parts[7].strip() if len(parts) > 7 else ""
                remark = parts[8].strip() if len(parts) > 8 else ""
                
                date_pattern = re.compile(r'^\d{1,2}[-/]\d{1,2}[-/]\d{4}$')
                if not date_pattern.match(date):
                    debug_lines.append(f"Line {i+1}: Invalid date format '{date}'")
                    continue
                
                if fraction and facility:
                    tour = ParsedTour(
                        date=date,
                        container=container,
                        fraction=fraction,
                        facility=facility,
                        address=address,
                        open_from=open_from,
                        open_to=open_to,
                        remark=remark
                    )
                    parsed_tours.append(tour)
                    
                    if facility not in facility_groups:
                        facility_groups[facility] = []
                    facility_groups[facility].append({
                        "container": container,
                        "fraction": fraction,
                        "address": address,
                        "remark": remark
                    })
                    
                    debug_lines.append(f"Line {i+1}: OK - {container} | {fraction} -> {facility}")
                else:
                    debug_lines.append(f"Line {i+1}: Skipped - missing fraction or facility")
                    
            except Exception as e:
                debug_lines.append(f"Line {i+1}: Error - {str(e)}")
        else:
            date_pattern = re.compile(r'^\d{1,2}[-/]\d{1,2}[-/]\d{4}$')
            if date_pattern.match(line):
                debug_lines.append(f"Line {i+1}: Found date, but not enough columns ({len(parts)} parts)")
            else:
                debug_lines.append(f"Line {i+1}: Skipped - not enough columns ({len(parts)} parts)")
    
    if len(parsed_tours) > 20:
        parsed_tours = parsed_tours[:20]
        debug_lines.append("Limited to 20 tours")
    
    grouped_summary = {}
    for facility, items in facility_groups.items():
        grouped_summary[facility] = {
            "count": len(items),
            "containers": [item["container"] for item in items]
        }
    
    debug_lines.append(f"\n=== GROUPED BY FACILITY ===")
    for facility, data in grouped_summary.items():
        debug_lines.append(f"{facility}: {data['count']} ture")
    
    return ParseMailResponse(
        success=len(parsed_tours) > 0,
        tours=parsed_tours,
        count=len(parsed_tours),
        debug_info="\n".join(debug_lines),
        grouped_by_facility=grouped_summary
    )

# ============= PAUSE ENDPOINT =============

@api_router.post("/tours/pause", response_model=Tour)
async def create_pause(report_id: str = "", plads: str = "", driver_id: str = "", driver_name: str = ""):
    pause_tour = Tour(
        date="",
        container="",
        fraction="PAUSE",
        facility="PAUSE",
        address="",
        is_pause=True,
        plads=plads,
        driver_id=driver_id,
        driver_name=driver_name,
        report_id=report_id
    )
    doc = pause_tour.model_dump()
    await db.tours.insert_one(doc)
    return pause_tour

# ============= MESSAGE ENDPOINTS =============

@api_router.get("/messages", response_model=List[Message])
async def get_messages(driver_id: Optional[str] = None):
    query = {}
    if driver_id:
        query["to_driver_id"] = driver_id
    messages = await db.messages.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [Message(**m) for m in messages]

@api_router.post("/messages", response_model=Message)
async def create_message(message: MessageCreate):
    # Get driver name
    driver = await db.drivers.find_one({"id": message.to_driver_id}, {"_id": 0})
    driver_name = driver["name"] if driver else ""
    
    msg_obj = Message(
        to_driver_id=message.to_driver_id,
        to_driver_name=driver_name,
        content=message.content
    )
    doc = msg_obj.model_dump()
    await db.messages.insert_one(doc)
    return msg_obj

@api_router.put("/messages/{message_id}/read")
async def mark_message_read(message_id: str):
    result = await db.messages.update_one(
        {"id": message_id},
        {"$set": {"read": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"message": "Message marked as read"}

@api_router.delete("/messages/{message_id}")
async def delete_message(message_id: str):
    result = await db.messages.delete_one({"id": message_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"message": "Message deleted"}

# ============= ADMIN STATS ENDPOINT =============

@api_router.get("/admin/stats", response_model=List[DriverStats])
async def get_admin_stats():
    drivers = await db.drivers.find({}, {"_id": 0}).to_list(100)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Batch queries - fetch all data at once
    all_tours = await db.tours.find({"is_pause": False}, {"_id": 0}).to_list(5000)
    all_reports = await db.reports.find({}, {"_id": 0}).to_list(1000)
    
    # Group by driver_id
    tours_by_driver = {}
    for t in all_tours:
        did = t.get("driver_id", "")
        if did not in tours_by_driver:
            tours_by_driver[did] = []
        tours_by_driver[did].append(t)
    
    reports_by_driver = {}
    for r in all_reports:
        did = r.get("driver_id", "")
        if did not in reports_by_driver:
            reports_by_driver[did] = []
        reports_by_driver[did].append(r)
    
    stats = []
    for driver in drivers:
        driver_id = driver["id"]
        driver_tours = tours_by_driver.get(driver_id, [])
        today_tours = [t for t in driver_tours if t.get("date") == today]
        driver_reports = sorted(reports_by_driver.get(driver_id, []), key=lambda r: r.get("report_date", ""), reverse=True)
        
        stats.append(DriverStats(
            driver_id=driver_id,
            driver_name=driver["name"],
            plate=driver["plate"],
            total_tours=len(driver_tours),
            completed_tours=len([t for t in driver_tours if t.get("completed")]),
            total_weight=sum(t.get("weight", 0) or 0 for t in driver_tours),
            today_tours=len(today_tours),
            today_completed=len([t for t in today_tours if t.get("completed")]),
            last_start_time=driver_reports[0]["start_time"] if driver_reports else "",
            last_end_time=driver_reports[0]["end_time"] if driver_reports else "",
            reports=[{
                "date": r["report_date"], "start": r["start_time"],
                "end": r["end_time"], "plads": r["plads"]
            } for r in driver_reports[:10]]
        ))
    
    return stats

# ============= ADMIN LOGIN =============

@api_router.post("/admin/login")
async def admin_login(credentials: dict):
    username = credentials.get("username", "")
    password = credentials.get("password", "")
    
    if username == os.environ.get("ADMIN_USERNAME", "admin") and password == os.environ.get("ADMIN_PASSWORD", "1234"):
        return {"success": True, "message": "Login successful"}
    else:
        raise HTTPException(status_code=401, detail="Invalid credentials")

# ============= PLADS MANAGEMENT =============

@api_router.get("/plads", response_model=List[Plads])
async def get_plads():
    plads_list = await db.plads.find({"active": True}, {"_id": 0}).to_list(100)
    return plads_list

@api_router.post("/plads", response_model=Plads)
async def create_plads(plads: PladsCreate):
    # Check if plads already exists
    existing = await db.plads.find_one({"name": plads.name})
    if existing:
        raise HTTPException(status_code=400, detail="Plads already exists")
    
    plads_obj = Plads(**plads.model_dump())
    doc = plads_obj.model_dump()
    await db.plads.insert_one(doc)
    return plads_obj

@api_router.delete("/plads/{plads_id}")
async def delete_plads(plads_id: str):
    result = await db.plads.update_one(
        {"id": plads_id},
        {"$set": {"active": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Plads not found")
    return {"message": "Plads deleted"}

# ============= SCHEDULE ENDPOINTS =============

@api_router.get("/schedule")
async def get_schedule(week_start: str):
    """Get schedule for a week starting from week_start date"""
    from datetime import timedelta
    
    start_date = datetime.strptime(week_start, "%Y-%m-%d").date()
    end_date = start_date + timedelta(days=6)
    
    schedules = await db.schedules.find({
        "date": {
            "$gte": week_start,
            "$lte": end_date.strftime("%Y-%m-%d")
        }
    }, {"_id": 0}).to_list(500)
    
    return schedules

@api_router.post("/schedule")
async def create_schedule(schedule: ScheduleCreate):
    """Create or update a single schedule entry"""
    # Check if schedule already exists for this driver and date
    existing = await db.schedules.find_one({
        "driver_id": schedule.driver_id,
        "date": schedule.date
    })
    
    if existing:
        # Update existing
        await db.schedules.update_one(
            {"id": existing["id"]},
            {"$set": {
                "plads": schedule.plads,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return {**existing, "plads": schedule.plads}
    else:
        # Create new
        schedule_obj = Schedule(**schedule.model_dump())
        doc = schedule_obj.model_dump()
        await db.schedules.insert_one(doc)
        return schedule_obj

@api_router.post("/schedule/bulk")
async def create_bulk_schedule(data: ScheduleBulkCreate):
    """Create or update multiple schedule entries"""
    results = []
    for schedule in data.schedules:
        existing = await db.schedules.find_one({
            "driver_id": schedule.driver_id,
            "date": schedule.date
        }, {"_id": 0})
        
        if existing:
            await db.schedules.update_one(
                {"id": existing["id"]},
                {"$set": {
                    "plads": schedule.plads,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            results.append({**existing, "plads": schedule.plads})
        else:
            schedule_obj = Schedule(**schedule.model_dump())
            doc = schedule_obj.model_dump()
            await db.schedules.insert_one(doc)
            results.append({k: v for k, v in doc.items() if k != "_id"})
    
    return {"message": f"Saved {len(results)} schedules", "count": len(results)}

@api_router.delete("/schedule")
async def clear_week_schedule(week_start: str):
    """Clear all schedules for a week"""
    from datetime import timedelta
    
    start_date = datetime.strptime(week_start, "%Y-%m-%d").date()
    end_date = start_date + timedelta(days=6)
    
    result = await db.schedules.delete_many({
        "date": {
            "$gte": week_start,
            "$lte": end_date.strftime("%Y-%m-%d")
        }
    })
    
    return {"message": f"Deleted {result.deleted_count} schedules"}

# ============= SEED DATA =============

@api_router.post("/seed")
async def seed_data():
    existing = await db.drivers.count_documents({})
    if existing > 0:
        # Still seed plads if not seeded
        existing_plads = await db.plads.count_documents({})
        if existing_plads == 0:
            default_plads = [
                "Glostrup", "Herlev", "Hillerød", "Ballerup", "Skipstrup",
                "Helsingør", "Køge", "Bjæverskov", "St. Heddinge", "Hårlev", "Gribskov"
            ]
            for plads_name in default_plads:
                plads = Plads(name=plads_name)
                await db.plads.insert_one(plads.model_dump())
        return {"message": "Data already seeded", "driver_count": existing}
    
    default_drivers = [
        {"name": "Dennis", "plate": "DV 10239", "area": "Glostrup", "facility": "ARGO", "phone": "", "email": ""},
        {"name": "Zekiye", "plate": "DY 84184", "area": "Herlev", "facility": "ARGO", "phone": "", "email": ""},
        {"name": "Emrer", "plate": "EC 25026", "area": "Hillerød", "facility": "ARGO", "phone": "", "email": ""},
        {"name": "Ferdat", "plate": "EN 80295", "area": "Ballerup", "facility": "ARGO", "phone": "", "email": ""},
        {"name": "FRI", "plate": "DM 13404", "area": "Skipstrup", "facility": "ARGO", "phone": "", "email": ""},
        {"name": "Rafael", "plate": "DR 30142", "area": "Helsingør", "facility": "ARGO", "phone": "", "email": ""},
        {"name": "John", "plate": "DS 78545", "area": "Køge", "facility": "ARGO", "phone": "", "email": ""},
        {"name": "Thomas", "plate": "DY 84177", "area": "Bjæverskov", "facility": "ARGO", "phone": "", "email": ""},
        {"name": "Tony", "plate": "EB 64418", "area": "St. Heddinge", "facility": "ARGO", "phone": "", "email": ""},
        {"name": "Murat", "plate": "EN 80294", "area": "Hårlev", "facility": "ARGO", "phone": "", "email": ""},
        {"name": "Nihat", "plate": "EC 66505", "area": "Gribskov", "facility": "ARGO", "phone": "", "email": ""},
        {"name": "Berrin", "plate": "BN55130", "area": "Glostrup", "facility": "ARGO", "phone": "", "email": ""},
    ]
    
    for driver_data in default_drivers:
        driver = Driver(**driver_data)
        await db.drivers.insert_one(driver.model_dump())
    
    # Seed default plads
    default_plads = [
        "Glostrup", "Herlev", "Hillerød", "Ballerup", "Skipstrup",
        "Helsingør", "Køge", "Bjæverskov", "St. Heddinge", "Hårlev", "Gribskov"
    ]
    
    existing_plads = await db.plads.count_documents({})
    if existing_plads == 0:
        for plads_name in default_plads:
            plads = Plads(name=plads_name)
            await db.plads.insert_one(plads.model_dump())
    
    return {"message": "Seeded default drivers and plads", "driver_count": len(default_drivers)}

@api_router.get("/")
async def root():
    return {"message": "Kørselsrapport API v2.0"}

# Include the router in the main app
app.include_router(api_router)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
