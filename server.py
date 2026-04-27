from fastapi import FastAPI, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
import uuid, os, shutil, json

app = FastAPI()

DB_FILE = "jobs.json"

# folders
os.makedirs("inputs", exist_ok=True)
os.makedirs("videos", exist_ok=True)

# init db
if not os.path.exists(DB_FILE):
    with open(DB_FILE, "w") as f:
        json.dump({}, f)

def load_db():
    with open(DB_FILE) as f:
        return json.load(f)

def save_db(data):
    with open(DB_FILE, "w") as f:
        json.dump(data, f, indent=2)

# serve files
app.mount("/inputs", StaticFiles(directory="inputs"), name="inputs")
app.mount("/videos", StaticFiles(directory="videos"), name="videos")

# create job
@app.post("/create-job/")
async def create_job(prompt: str = Form(...), file: UploadFile = File(...)):
    job_id = str(uuid.uuid4())
    file_path = f"inputs/{job_id}.png"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    db = load_db()
    db[job_id] = {
        "prompt": prompt,
        "image": file_path,
        "status": "pending",
        "result": None
    }
    save_db(db)

    return {"job_id": job_id}

# get job
@app.get("/get-job/{job_id}")
def get_job(job_id: str):
    return load_db().get(job_id, {"error": "not found"})

# worker pulls job
@app.get("/next-job")
def next_job():
    db = load_db()
    for jid, job in db.items():
        if job["status"] == "pending":
            job["status"] = "processing"
            save_db(db)
            return {"job_id": jid, **job}
    return {"job_id": None}

# upload video from kaggle
@app.post("/upload-video/{job_id}")
async def upload_video(job_id: str, file: UploadFile = File(...)):
    path = f"videos/{job_id}.mp4"
    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"ok": True}

# mark done
@app.post("/complete-job/{job_id}")
def complete_job(job_id: str, video_url: str):
    db = load_db()
    if job_id in db:
        db[job_id]["status"] = "done"
        db[job_id]["result"] = video_url
        save_db(db)
    return {"ok": True}
