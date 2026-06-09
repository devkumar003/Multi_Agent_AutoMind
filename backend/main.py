from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from models.schemas import ProblemRequest
from graph import SwarmOrchestrator
from db import init_db, get_db, ActivityHistory
import auth
from auth import get_current_user
import os

app = FastAPI(title="AutoMind Local Exec API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    init_db()
    os.makedirs("uploads", exist_ok=True)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "local_backend"}

orchestrator = SwarmOrchestrator()
connected_clients = []

@app.websocket("/ws/status")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.append(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        if websocket in connected_clients:
            connected_clients.remove(websocket)

async def broadcast_status(message: dict):
    for client in list(connected_clients):
        try:
            await client.send_json(message)
        except Exception:
            if client in connected_clients:
                connected_clients.remove(client)

# Include local routers
from routers import code as code_routes, data as data_routes

app.include_router(code_routes.router)
app.include_router(data_routes.router)

@app.post("/api/chat/upload")
async def chat_upload_files(files: list[UploadFile] = File(...)):
    uploaded = []
    for f in files:
        content = await f.read()
        try:
            text = content.decode("utf-8")
        except UnicodeDecodeError:
            text = "[Binary or unsupported file]"
        
        preview = text[:2000] + ("..." if len(text) > 2000 else "")
        uploaded.append({"filename": f.filename, "preview": preview})
    return {"status": "ok", "files": uploaded}

@app.post("/solve")
async def solve_problem(req: ProblemRequest):
    try:
        res = await orchestrator.run_pipeline(
            problem=req.problem,
            state_mode=req.mode,
            history=req.history,
            ws_callback=broadcast_status,
            file_context=req.file_context
        )
        return {"status": "success", "data": res}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# Activity History
@app.get("/api/history")
def get_history(current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    history = db.query(ActivityHistory).filter(ActivityHistory.user_id == current_user.id).order_by(ActivityHistory.timestamp.desc()).all()
    res = []
    for h in history:
        res.append({
            "id": h.id,
            "title": h.title,
            "activity_type": h.activity_type,
            "subtitle": h.subtitle,
            "payload": h.payload,
            "timestamp": h.timestamp.isoformat() + "Z"
        })
    return res

@app.delete("/api/history")
def delete_history(current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(ActivityHistory).filter(ActivityHistory.user_id == current_user.id).delete()
    db.commit()
    return {"success": True}

@app.get("/api/system/health")
def get_system_health():
    import requests
    import time
    try:
        start = time.time()
        res = requests.get("http://127.0.0.1:11434/api/tags", timeout=3)
        latency = round((time.time() - start) * 1000)
        if res.status_code == 200:
            models = [m["name"] for m in res.json().get("models", [])]
            model_name = "Qwen" if any("qwen" in m for m in models) else (models[0].split(":")[0].capitalize() if models else "Unknown")
            return {"status": "connected", "model": model_name, "latency": latency}
        return {"status": "disconnected", "model": "Error", "latency": 0}
    except Exception:
        return {"status": "disconnected", "model": "Offline", "latency": 0}

@app.get("/api/system/status")
def get_system_status():
    import requests
    try:
        res = requests.get("http://127.0.0.1:11434/api/tags", timeout=3)
        if res.status_code == 200:
            models = [m["name"] for m in res.json().get("models", [])]
            return {
                "status": "online",
                "models": models,
                "has_llama3": "llama3:latest" in models or "llama3" in models,
                "has_mistral": "mistral:latest" in models or "mistral" in models,
                "has_qwen": "qwen2.5-coder:7b" in models
            }
        return {"status": "error", "message": f"Ollama returned {res.status_code}"}
    except Exception as e:
        return {"status": "offline", "message": "Ollama is not running locally on port 11434."}

@app.post("/api/settings/clear-cache")
def clear_system_cache(current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    import glob
    files = glob.glob("uploads/*.csv")
    for f in files:
        try:
            os.remove(f)
        except:
            pass
    db.add(ActivityHistory(user_id=current_user.id, title="Cleared System Cache", activity_type="settings", subtitle=f"Deleted {len(files)} temporary files."))
    db.commit()
    return {"success": True, "files_deleted": len(files)}
