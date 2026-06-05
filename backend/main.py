from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from models.schemas import ProblemRequest
from graph import SwarmOrchestrator
from db import init_db, get_db, UserStats, ActivityHistory, Challenge, User, Submission, Contest
import auth
from jose import JWTError, jwt

import pandas as pd
import io
import subprocess
import tempfile
import json
from pydantic import BaseModel
import os
import uuid
from llm import get_qwen
import numpy as np
import re
import datetime

app = FastAPI()

# Include admin router
from admin import router as admin_router
app.include_router(admin_router)

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

class RegisterSchema(BaseModel):
    username: str
    email: str
    password: str

class LoginSchema(BaseModel):
    email: str
    password: str

@app.post("/api/auth/register")
async def register(req: RegisterSchema, db: Session = Depends(get_db)):
    try:
        # Validate email format
        email_regex = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
        if not re.match(email_regex, req.email):
            raise HTTPException(status_code=400, detail="Invalid email format")

        # Check if user exists
        if db.query(User).filter(User.email == req.email).first():
            raise HTTPException(status_code=400, detail="Email already registered")
        if db.query(User).filter(User.username == req.username).first():
            raise HTTPException(status_code=400, detail="Username already taken")
        
        hashed_pwd = auth.get_password_hash(req.password)
        new_user = User(username=req.username, email=req.email, hashed_password=hashed_pwd)
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Initialize stats for new user
        user_stats = UserStats(user_id=new_user.id, streak_days=1, xp_points=100)
        db.add(user_stats)
        db.commit()
        
        token = auth.create_access_token(data={"sub": new_user.email, "id": new_user.id})
        return {"access_token": token, "token_type": "bearer", "user": {"username": new_user.username, "email": new_user.email, "is_admin": new_user.is_admin}}
    except Exception as e:
        print(f"REGISTRATION_ERROR: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")

@app.post("/api/auth/login")
async def login(req: LoginSchema, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not auth.verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = auth.create_access_token(data={"sub": user.email, "id": user.id})
    return {"access_token": token, "token_type": "bearer", "user": {"username": user.username, "email": user.email, "is_admin": user.is_admin}}

from typing import Optional
from auth import get_current_user, get_current_user_optional

def get_rank_title(xp: int) -> str:
    if xp < 500: return "Novice Hacker"
    if xp < 2000: return "Quantum Operative"
    if xp < 5000: return "Neural Elite"
    return "AI Overlord"

@app.get("/api/user/profile")
async def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    stats = db.query(UserStats).filter(UserStats.user_id == current_user.id).first()
    activities = db.query(ActivityHistory).filter(ActivityHistory.user_id == current_user.id).order_by(ActivityHistory.timestamp.desc()).limit(10).all()
        
    activity_data = []
    for act in activities:
        activity_data.append({
            "id": act.id,
            "title": act.title,
            "type": act.activity_type,
            "subtitle": act.subtitle,
            "time": act.timestamp.strftime("%Y-%m-%d %H:%M:%S")
        })
        
    current_xp = stats.xp_points if stats else 0
        
    return {
        "user": {
            "id": current_user.id,
            "username": current_user.username,
            "email": current_user.email
        },
        "stats": {
            "xp": current_xp,
            "level": (current_xp // 100) + 1,
            "streak": stats.streak_days if stats else 0,
            "rank": get_rank_title(current_xp),
            "modulesCompleted": 0
        },
        "activities": activity_data
    }

@app.get("/api/leaderboard")
async def get_leaderboard(db: Session = Depends(get_db)):
    results = db.query(User.username, UserStats.xp_points, UserStats.streak_days).join(
        UserStats, User.id == UserStats.user_id
    ).order_by(UserStats.xp_points.desc()).limit(100).all()
    
    leaderboard = []
    for idx, row in enumerate(results):
        leaderboard.append({
            "rank": idx + 1,
            "username": row.username,
            "xp": row.xp_points,
            "streak": row.streak_days,
            "title": get_rank_title(row.xp_points)
        })
    return {"leaderboard": leaderboard}

@app.post("/solve")
async def solve_problem(req: ProblemRequest):
    result = await orchestrator.run_pipeline(req.problem, req.mode, req.history, broadcast_status, file_context=req.file_context)
    return {"status": "success", "data": result}

# --- CHAT FILE UPLOAD ---
from typing import List

TEXT_EXTENSIONS = {'.txt', '.py', '.js', '.jsx', '.ts', '.tsx', '.css', '.html', '.json', '.md', '.csv', '.sql', '.yaml', '.yml', '.xml', '.java', '.cpp', '.c', '.h', '.go', '.rs', '.rb', '.sh', '.bat', '.ps1', '.env', '.cfg', '.ini', '.toml', '.log'}

@app.post("/api/chat/upload")
async def chat_upload(files: List[UploadFile] = File(...)):
    os.makedirs("uploads/chat", exist_ok=True)
    results = []
    for file in files:
        file_id = str(uuid.uuid4())[:8]
        ext = os.path.splitext(file.filename)[1].lower()
        safe_name = f"{file_id}_{file.filename}"
        save_path = os.path.join("uploads", "chat", safe_name)
        
        content_bytes = await file.read()
        with open(save_path, "wb") as f:
            f.write(content_bytes)
        
        # Extract text preview for supported files
        preview = ""
        if ext in TEXT_EXTENSIONS:
            try:
                text = content_bytes.decode("utf-8", errors="replace")
                preview = text[:3000]  # First 3000 chars as context
            except:
                preview = "[Binary file — could not extract text]"
        elif ext == '.pdf':
            try:
                import pypdf
                pdf_reader = pypdf.PdfReader(io.BytesIO(content_bytes))
                pdf_text = ""
                for page in pdf_reader.pages[:5]: # Max 5 pages for preview
                    pdf_text += page.extract_text() + "\n"
                preview = pdf_text[:3000]
                if not preview.strip():
                    preview = "[PDF uploaded but no text could be extracted (might be an image-based PDF)]"
            except ImportError:
                preview = "[PDF uploaded. Install 'pypdf' on the server to enable text extraction]"
            except Exception as e:
                preview = f"[Error reading PDF: {str(e)}]"
        elif ext in {'.docx', '.xlsx', '.zip', '.png', '.jpg', '.jpeg', '.gif', '.mp4'}:
            preview = f"[{ext.upper()} file uploaded — {len(content_bytes)} bytes]"
        else:
            preview = f"[File uploaded — {len(content_bytes)} bytes]"
        
        results.append({
            "file_id": file_id,
            "filename": file.filename,
            "size": len(content_bytes),
            "ext": ext,
            "preview": preview,
            "path": save_path
        })
    
    return {"status": "ok", "files": results}

# --- AUTOTHINK PLATFORM ENDPOINTS ---

import urllib.request
import time

@app.get("/api/system/health")
def get_system_health():
    start = time.time()
    try:
        # First check which model is currently loaded in RAM
        req_ps = urllib.request.Request("http://127.0.0.1:11434/api/ps", method="GET")
        with urllib.request.urlopen(req_ps, timeout=2.0) as response:
            if response.status == 200:
                data = json.loads(response.read().decode())
                latency = int((time.time() - start) * 1000)
                models = data.get("models", [])
                
                if len(models) > 0:
                    model_name = models[0]["name"]
                else:
                    # If no model is currently in RAM, fallback to tags to see what's default/available
                    req_tags = urllib.request.Request("http://127.0.0.1:11434/api/tags", method="GET")
                    with urllib.request.urlopen(req_tags, timeout=2.0) as tag_resp:
                        if tag_resp.status == 200:
                            tag_data = json.loads(tag_resp.read().decode())
                            tag_models = tag_data.get("models", [])
                            model_name = tag_models[0]["name"] if tag_models else "Qwen2.5"
                        else:
                            model_name = "Qwen2.5"
                
                # Strip out the tag if it's too long
                if ":" in model_name:
                    model_name = model_name.split(":")[0]
                    
                return {"status": "connected", "latency": latency, "model": model_name.capitalize()}
    except Exception:
        pass
    return {"status": "disconnected", "latency": 0, "model": "Offline"}

@app.get("/api/user/stats")
def get_user_stats(current_user: Optional[User] = Depends(get_current_user_optional), db: Session = Depends(get_db)):
    if current_user:
        stats = db.query(UserStats).filter(UserStats.user_id == current_user.id).first()
    else:
        stats = None
    if not stats:
        return {"streak_days": 0, "xp_points": 0}
    return {"streak_days": stats.streak_days, "xp_points": stats.xp_points}

@app.get("/api/user/activity")
def get_activity(current_user: Optional[User] = Depends(get_current_user_optional), db: Session = Depends(get_db)):
    if current_user:
        acts = db.query(ActivityHistory).filter(ActivityHistory.user_id == current_user.id).order_by(ActivityHistory.timestamp.desc()).limit(10).all()
    else:
        acts = []
    res = []
    for a in acts:
        res.append({
            "title": a.title,
            "activity_type": a.activity_type,
            "subtitle": a.subtitle,
            "time_ago": "recently"
        })
    return res

# Code Lab
class CodeRunReq(BaseModel):
    code: str
    language: str = "python"

@app.post("/api/code/run")
def run_code(req: CodeRunReq, current_user: Optional[User] = Depends(get_current_user_optional), db: Session = Depends(get_db)):
    if req.language == "javascript":
        ext = ".js"
        cmd = ["node"]
    elif req.language == "c":
        ext = ".c"
        cmd = ["gcc"]
    elif req.language == "cpp":
        ext = ".cpp"
        cmd = ["g++"]
    else:
        ext = ".py"
        cmd = ["python"]
        
    with tempfile.NamedTemporaryFile("w+", suffix=ext, delete=False, encoding="utf-8") as f:
        f.write(req.code)
        temp_path = f.name
        
    exe_path = temp_path.replace(ext, ".exe")
    
    try:
        if req.language in ["c", "cpp"]:
            compile_res = subprocess.run([cmd[0], temp_path, "-o", exe_path], capture_output=True, text=True, timeout=10)
            if compile_res.returncode != 0:
                output = f"Compilation Error:\n{compile_res.stderr}"
                exit_code = compile_res.returncode
            else:
                run_res = subprocess.run([exe_path], capture_output=True, text=True, timeout=10)
                output = run_res.stdout
                if run_res.stderr:
                    output += f"\n[ERROR]\n{run_res.stderr}"
                exit_code = run_res.returncode
        else:
            res = subprocess.run([cmd[0], temp_path], capture_output=True, text=True, timeout=10)
            output = res.stdout
            if res.stderr:
                output += f"\n[ERROR]\n{res.stderr}"
            exit_code = res.returncode
    except subprocess.TimeoutExpired:
        output = "Timeout expired. Infinite loop detected?"
        exit_code = -1
    except Exception as e:
        output = f"Execution engine error: {str(e)}"
        exit_code = -1
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        if req.language in ["c", "cpp"] and os.path.exists(exe_path):
            os.remove(exe_path)

    # Note activity
    if current_user:
        db.add(ActivityHistory(
            user_id=current_user.id,
            title="Executed Script", 
            activity_type="code", 
            subtitle=f"CodeLab {req.language.capitalize()} Snippet",
            payload=json.dumps({"language": req.language, "code": req.code})
        ))
        db.commit()

    return {"output": output, "exit_code": exit_code}

class CodeFixReq(BaseModel):
    code: str
    error_output: str
    language: str

@app.post("/api/code/fix")
async def fix_code(req: CodeFixReq, current_user: Optional[User] = Depends(get_current_user_optional), db: Session = Depends(get_db)):
    prompt = f"""You are an expert {req.language} debugger.

The user wrote the following code:
```{req.language}
{req.code}
```

When they ran it, they got this error:
```
{req.error_output}
```

Please fix the code. Return ONLY the corrected code block. Do NOT include any explanations or markdown outside of the code block. Your entire response must be valid {req.language} code inside a markdown block.
"""
    qwen = get_qwen()
    res = await qwen.ainvoke(prompt)
    
    fixed_code = res.content
    match = re.search(r'```.*?\n(.*?)```', fixed_code, re.DOTALL)
    if match:
        fixed_code = match.group(1).strip()
    else:
        fixed_code = fixed_code.replace("```python", "").replace("```javascript", "").replace("```c", "").replace("```cpp", "").replace("```", "").strip()
        
    if current_user:
        db.add(ActivityHistory(user_id=current_user.id, title="AI Fixed Code", activity_type="code", subtitle="Qwen2.5-Coder Auto-Fix"))
        db.commit()
    
    return {"fixed_code": fixed_code}

# Data Lab
@app.post("/api/data/upload")
async def upload_data(file: UploadFile = File(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    contents = await file.read()
    
    file_id = str(uuid.uuid4())
    save_path = os.path.join("uploads", f"{file_id}.csv")
        
    try:
        if file.filename.endswith(".xlsx") or file.filename.endswith(".xls"):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            df = pd.read_csv(io.StringIO(contents.decode("utf-8")))
            
        # Standardize the saved format as CSV for the rest of the pipeline
        df.to_csv(save_path, index=False)
    except Exception as e:
        return {"error": f"Failed to parse file: {str(e)}. If Excel fails, run 'pip install openpyxl xlrd'."}

    db.add(ActivityHistory(user_id=current_user.id, title="Analyzed Dataset", activity_type="data", subtitle=file.filename))
    db.commit()

    total_rows = len(df)
    total_cols = len(df.columns)
    null_entropy = round((df.isnull().sum().sum() / (total_rows * total_cols)) * 100, 2)
    
    metrics = []
    for col in df.select_dtypes(include=['float64', 'int64']).columns:
        metrics.append({
            "colName": str(col),
            "avg": round(float(df[col].mean()), 2),
            "min": round(float(df[col].min()), 2),
            "max": round(float(df[col].max()), 2)
        })

    preview = df.head(100).fillna("").to_dict(orient="records")

    return {
        "file_id": file_id,
        "columns": list(df.columns),
        "data": preview,
        "integrity": {
            "total_rows": total_rows,
            "total_cols": total_cols,
            "null_entropy": null_entropy,
            "metrics": metrics[:4]
        }
    }

class DataCleanReq(BaseModel):
    file_id: str

@app.get("/api/data/export/{file_id}")
async def export_data(file_id: str):
    file_path = os.path.join("uploads", f"{file_id}.csv")
    if not os.path.exists(file_path):
        return {"error": "Dataset missing on server."}
    return FileResponse(path=file_path, filename="autothink_dataset.csv", media_type="text/csv")

@app.post("/api/data/clean")
async def clean_data(req: DataCleanReq, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    file_path = os.path.join("uploads", f"{req.file_id}.csv")
    if not os.path.exists(file_path):
        return {"error": "Dataset missing on server."}
        
    try:
        df = pd.read_csv(file_path)
        summary = []
        original_shape = df.shape
        
        # 1. Column snake_case
        old_cols = list(df.columns)
        df.columns = [str(c).strip().lower().replace(" ", "_") for c in df.columns]
        if old_cols != list(df.columns):
            summary.append("- **Consistency**: Converted all column names to lowercase snake_case.")
            
        # 2. Missing values (>40% drop)
        threshold = len(df) * 0.4
        dropped_cols = []
        for col in df.columns:
            if df[col].isnull().sum() > threshold:
                dropped_cols.append(col)
        if dropped_cols:
            df.drop(columns=dropped_cols, inplace=True)
            summary.append(f"- **Missing Data**: Dropped columns with >40% missing values: {', '.join(dropped_cols)}")

        # 3. Handle duplicates
        dupes = df.duplicated().sum()
        if dupes > 0:
            df.drop_duplicates(inplace=True)
            summary.append(f"- **Duplicates**: Removed {dupes} duplicate row(s).")
            
        # 4. Standardize text strings ("5k" -> 5000, normalize M/Male)
        def parse_numeric_text(val):
            if pd.isnull(val): return val
            val_str = str(val).lower().strip()
            # Handle K/M shorthands
            if re.match(r'^-?\d+(\.\d+)?[km]$', val_str):
                num = float(re.findall(r'-?\d+(?:\.\d+)?', val_str)[0])
                if 'k' in val_str: return num * 1000
                if 'm' in val_str: return num * 1000000
                
            # Handle explicit words mapping
            words = {
                "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
                "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
                "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14,
                "fifteen": 15, "sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19,
                "twenty": 20, "thirty": 30, "forty": 40, "fifty": 50,
                "sixty": 60, "seventy": 70, "eighty": 80, "ninety": 90
            }
            multipliers = {"hundred": 100, "thousand": 1000, "million": 1000000}
            
            if val_str in words: return words[val_str]
            if val_str in multipliers: return multipliers[val_str]
            
            # Handle compound words like "sixty thousand"
            parts = val_str.split()
            if len(parts) > 1 and all(p in words or p in multipliers for p in parts):
                total = 0
                current = 0
                for p in parts:
                    if p in words:
                        current += words[p]
                    elif p in multipliers:
                        if current == 0: current = 1
                        current *= multipliers[p]
                        if p in ["thousand", "million"]:
                            total += current
                            current = 0
                return total + current
                
            return val

        for col in df.columns:
            if df[col].dtype == 'object':
                # Attempt string number parsing
                df[col] = df[col].apply(parse_numeric_text)
                
                # Check if it should be numeric after parsing
                try:
                    df_temp = pd.to_numeric(df[col])
                    df[col] = df_temp
                    summary.append(f"- **Formatting**: Parsed numeric strings in column '{col}'.")
                    continue
                except:
                    pass
                
                # If still object, try date parsing
                if 'date' in col.lower() or 'time' in col.lower():
                    try:
                        df[col] = pd.to_datetime(df[col], errors='coerce').dt.strftime('%Y-%m-%d')
                        summary.append(f"- **Formatting**: Standardized '{col}' to YYYY-MM-DD date format.")
                        continue
                    except:
                        pass
                
                # Standard Text / Categorical Cleaning
                df[col] = df[col].astype(str).str.strip().str.title()
                df[col] = df[col].replace({'Nan': np.nan, 'None': np.nan, '': np.nan})
                
                # Isolate gender mapping strictly to gender/sex columns to avoid destroying grades (e.g. F in performance)
                if 'gender' in col.lower() or 'sex' in col.lower():
                    df[col] = df[col].replace({'M': 'Male', 'F': 'Female'})
                
        summary.append("- **Formatting**: Trimmed spaces, normalized text casing, and unified string mappings.")

        # 5. Missing values (Median / Mode fill) & Outliers
        for col in df.columns:
            if pd.api.types.is_numeric_dtype(df[col]):
                # Fill missing
                miss_cnt = df[col].isnull().sum()
                if miss_cnt > 0:
                    med = df[col].median()
                    df[col] = df[col].fillna(med)
                    summary.append(f"- **Missing Data**: Filled {miss_cnt} missing values in '{col}' with median ({med}).")
                
                # Outliers (IQR)
                Q1 = df[col].quantile(0.25)
                Q3 = df[col].quantile(0.75)
                IQR = Q3 - Q1
                lower_bound = Q1 - 1.5 * IQR
                upper_bound = Q3 + 1.5 * IQR
                outliers = ((df[col] < lower_bound) | (df[col] > upper_bound)).sum()
                if outliers > 0:
                    df[col] = np.clip(df[col], lower_bound, upper_bound)
                    summary.append(f"- **Validation**: Clipped {outliers} extreme outliers in '{col}' using IQR boundaries.")
                    
                # Negative validation (Age)
                if 'age' in col.lower():
                    neg_ages = (df[col] < 0).sum()
                    if neg_ages > 0:
                        df.loc[df[col] < 0, col] = np.nan
                        med = df[col].median()
                        df[col] = df[col].fillna(med)
                        summary.append(f"- **Validation**: Fixed {neg_ages} impossible negative values in '{col}'.")
                        
            else:
                # Categorical fill
                miss_cnt = df[col].isnull().sum()
                if miss_cnt > 0:
                    mode_vals = df[col].mode()
                    if not mode_vals.empty:
                        m_val = mode_vals[0]
                        df[col] = df[col].fillna(m_val)
                        summary.append(f"- **Missing Data**: Filled {miss_cnt} missing values in categorical '{col}' with mode ('{m_val}').")

        # Save cleaned file natively
        df.to_csv(file_path, index=False)
        
    except Exception as e:
        import traceback
        return {"error": f"Failed to clean dataset natively: {str(e)}\n{traceback.format_exc()}"}

    db.add(ActivityHistory(user_id=current_user.id, title="Cleaned Dataset", activity_type="data", subtitle="Automated Native Python Pipeline"))
    db.commit()

    total_rows = len(df)
    total_cols = len(df.columns)
    null_entropy = round((df.isnull().sum().sum() / (total_rows * total_cols)) * 100, 2) if total_rows > 0 else 0
    
    num_cols = df.select_dtypes(include=['float64', 'int64']).columns
    metrics = []
    for col in num_cols:
        metrics.append({
            "colName": str(col),
            "avg": round(float(df[col].mean()), 2),
            "min": round(float(df[col].min()), 2),
            "max": round(float(df[col].max()), 2)
        })

    preview = df.head(100).fillna("").to_dict(orient="records")

    return {
        "file_id": req.file_id,
        "columns": list(df.columns),
        "data": preview,
        "summary": "\n".join(summary) if summary else "No cleaning modifications were necessary.",
        "integrity": {
            "total_rows": total_rows,
            "total_cols": total_cols,
            "null_entropy": null_entropy,
            "metrics": metrics[:4]
        }
    }

class DataQueryReq(BaseModel):
    file_id: str
    query: str

@app.post("/api/data/query")
async def query_data(req: DataQueryReq, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        file_path = os.path.join("uploads", f"{req.file_id}.csv")
        file_path_unix = file_path.replace("\\", "/")
        if not os.path.exists(file_path):
            return {"error": "Dataset missing on server."}
            
        try:
            # Load briefly just to extract columns
            df_preview = pd.read_csv(file_path, nrows=5)
            columns = list(df_preview.columns)
        except:
            return {"error": "Failed to parse CSV headers."}

        prompt = f"Write pure Python Pandas code to execute the following request on a CSV file named '{file_path_unix}'. \n\nThe CSV has the following columns: {columns}\n\nRequest: {req.query}\n\nLoad the CSV natively, do the operation, and print the specific final output requested natively to stdout. CRITICAL: If you generate any plots (matplotlib/seaborn), you MUST save them to 'plot_output.png' using plt.savefig('plot_output.png') and NEVER use plt.show(). Return exactly only the python code block."
        
        qwen = get_qwen()
        res = await qwen.ainvoke(prompt)
        clean_code = res.content.replace("```python", "").replace("```", "").strip()
        
        with tempfile.NamedTemporaryFile("w+", suffix=".py", delete=False, encoding="utf-8") as f:
            f.write("import pandas as pd\nimport numpy as np\nimport scipy.stats as stats\nimport math\n\n")
            f.write(clean_code)
            temp_path = f.name
            
        try:
            execution = subprocess.run(["python", temp_path], capture_output=True, text=True, timeout=30)
            output = execution.stdout if execution.returncode == 0 else f"Error:\n{execution.stderr}"
        except Exception as e:
            output = f"Execution engine error: {str(e)}"
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)
                
        image_data = None
        if os.path.exists("plot_output.png"):
            import base64
            with open("plot_output.png", "rb") as img_file:
                image_data = base64.b64encode(img_file.read()).decode('utf-8')
            try:
                os.remove("plot_output.png")
            except:
                pass
            
        db.add(ActivityHistory(user_id=current_user.id, title="Queried Dataset via Qwen", activity_type="data", subtitle=req.query[:20]+"..."))
        db.commit()

        return {"output": output, "code_used": clean_code, "image_base64": image_data}
    except Exception as e:
        import traceback
        return {"error": f"Critical Backend Failure: {str(e)}"}



@app.post("/api/data/visualize")
async def visualize_data(req: DataQueryReq, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        file_path = os.path.join("uploads", f"{req.file_id}.csv")
        if not os.path.exists(file_path):
            return {"error": "Dataset missing on server."}
            
        try:
            df = pd.read_csv(file_path)
            columns = list(df.columns)
            sample_data = df.head(3).to_dict(orient="records")
        except:
            return {"error": "Failed to parse CSV."}

        prompt = f"""You are an advanced data intelligence and visualization engine inside a universal data analytics platform.

Your job is to analyze ANY structured tabular dataset and automatically generate the most meaningful visual insights without prior knowledge of the domain.

---

## INPUT

Dataset Schema:
{columns}

Sample Data (optional but highly recommended):
{sample_data}

User Intent (optional):
{req.query}

---

## STEP 1: UNDERSTAND DATA TYPES (MANDATORY)

First infer column roles:

- Numeric columns (quantitative values)
- Categorical columns (labels/groups)
- Date/time columns (temporal trends)
- ID columns (ignore unless useful)
- Text columns (usually ignore unless grouping is possible)

---

## STEP 2: DETECT INSIGHT OPPORTUNITIES

Automatically identify:

- Comparisons → category vs numeric
- Distributions → numeric spread
- Trends → time vs numeric/count
- Relationships → numeric vs numeric
- Composition → categorical proportions
- Rankings → top/bottom values
- Data imbalance or anomalies

---

## STEP 3: GENERATE INSIGHTS

Create 5–10 high-quality, non-redundant insights.

Prioritize:
1. Business/real-world usefulness
2. Statistical meaning
3. Variety of perspectives
4. Data coverage (use different columns)

---

## AVAILABLE CHART TYPES

- bar (categorical comparison / ranking)
- line (time-based trends)
- pie (composition / proportion)
- scatter (relationships between numeric variables)

---

## AGGREGATION RULES

Use automatically when needed:
- avg → for comparing typical values
- sum → for totals
- count → for frequency/distribution
- min/max → for extremes

---

## OUTPUT FORMAT (STRICT JSON ONLY)

Return ONLY a JSON array sorted by importance (highest priority first):

[
  {{
    "chart_type": "bar | line | pie | scatter",
    "title": "Clear human-readable insight title",
    "x": "column_name",
    "y": "column_name",
    "aggregation": "sum | avg | count | min | max | none",
    "group_by": "column_name | null",
    "insight": "One clear sentence explaining the finding",
    "priority": 1
  }}
]

---

## CRITICAL RULES

- DO NOT hallucinate column names
- DO NOT repeat similar charts
- DO NOT output explanations outside JSON
- ALWAYS diversify insights
- ALWAYS include at least:
  - 1 comparison insight
  - 1 distribution insight
  - 1 relationship insight (if possible)
  - 1 ranking insight (if possible)
  - 1 trend insight (if date exists)

---

## SMART BEHAVIOR RULES

- If dataset has no date → skip trend charts
- If dataset has no numeric columns → only categorical charts
- If dataset is small → reduce number of charts (min 3)
- If dataset is large → prioritize top patterns only
- Ignore irrelevant ID columns unless explicitly useful

---

## FINAL RULE

Return ONLY valid JSON array. No text. No markdown. No comments.
"""
        qwen = get_qwen()
        res = await qwen.ainvoke(prompt)
        import json
        import re
        
        json_str = res.content
        match = re.search(r'\[.*\]', json_str, re.DOTALL)
        if match:
            json_str = match.group(0)
            
        try:
            specs = json.loads(json_str)
            if isinstance(specs, dict):
                specs = [specs]
        except:
            return {"error": "LLM failed to return a valid JSON array specification."}
            
        results = []
        for spec in specs:
            x_col = spec.get("x")
            y_col = spec.get("y")
            agg = spec.get("aggregation", "none")
            group_by = spec.get("group_by")
            
            try:
                # Ensure x_col is present
                if not x_col or x_col not in df.columns:
                    raise ValueError(f"Missing or invalid x_col: {x_col}")

                # If aggregation is count, we usually just want the frequency of categories
                if agg == "count":
                    if not group_by or str(group_by).lower() == "null":
                        group_by = x_col
                    
                    chart_df = df.groupby(group_by).size().reset_index(name="count")
                    spec["y"] = "count"
                    spec["x"] = group_by
                
                # Other aggregations require a valid numeric y_col
                elif agg != "none":
                    if not group_by or str(group_by).lower() == "null":
                        group_by = x_col
                        
                    if not y_col or y_col not in df.columns or not pd.api.types.is_numeric_dtype(df[y_col]):
                        # Fallback to count if y_col is invalid for math
                        chart_df = df.groupby(group_by).size().reset_index(name="count")
                        spec["y"] = "count"
                        spec["x"] = group_by
                        spec["aggregation"] = "count"
                    else:
                        if agg == "sum": chart_df = df.groupby(group_by)[y_col].sum().reset_index()
                        elif agg == "avg": chart_df = df.groupby(group_by)[y_col].mean().reset_index()
                        elif agg == "min": chart_df = df.groupby(group_by)[y_col].min().reset_index()
                        elif agg == "max": chart_df = df.groupby(group_by)[y_col].max().reset_index()
                        else: chart_df = df.groupby(group_by)[y_col].mean().reset_index()
                
                # No aggregation, just raw data (usually for scatter plots)
                else:
                    if not y_col or y_col not in df.columns:
                        # Fallback to count
                        chart_df = df[x_col].value_counts().reset_index()
                        chart_df.columns = [x_col, "count"]
                        spec["y"] = "count"
                    else:
                        chart_df = df[[x_col, y_col]]
                    
                if len(chart_df) > 1000:
                    chart_df = chart_df.head(1000)
                    
                chart_data = chart_df.fillna(0).to_dict(orient="records")
                results.append({"spec": spec, "data": chart_data})
            except Exception as e:
                # Skip hallucinated columns or errors
                print("Chart generation error:", e)
                print("Qwen Raw Response:", json_str)
                continue
                
        db.add(ActivityHistory(user_id=current_user.id, title="Auto-Insights Dashboard Generated", activity_type="data", subtitle=f"Generated {len(results)} charts."))
        db.commit()

        return {"charts": results}
    except Exception as e:
        import traceback
        return {"error": f"Critical Backend Failure: {str(e)}"}
# Challenges
@app.post("/api/challenges/generate")
async def generate_challenge(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    import random
    
    # Get existing challenge titles to avoid duplicates
    existing_challenges = db.query(Challenge.title).all()
    existing_titles = [c.title for c in existing_challenges]
    avoid_list_str = ", ".join(existing_titles) if existing_titles else "None"

    topics = ["Strings", "Arrays", "Dynamic Programming", "Graphs", "Trees", "Math", "Bit Manipulation", "Sliding Window", "Two Pointers", "Binary Search", "Linked Lists", "Heaps", "Sorting", "Greedy", "Backtracking", "Matrix", "Design"]
    difficulty = random.choice(["Easy", "Medium", "Medium", "Hard"])
    topic1 = random.choice(topics)
    topic2 = random.choice(topics)
    seed = random.randint(10000, 99999)

    prompt = f"""You are an expert algorithm platform creator (like LeetCode).
Generate a completely new, unique, and creative coding challenge in Python.

CRITICAL INSTRUCTIONS FOR UNIQUENESS:
- Target Difficulty: {difficulty}
- Primary Topic: {topic1}
- Secondary Concept: {topic2}
- Random Context Seed: {seed}
- AVOID THESE EXISTING CHALLENGES: {avoid_list_str}

Do NOT generate standard classic problems like 'Two Sum' or 'Valid Palindrome'. Invent a creative, story-driven or highly specific variant based on the random context seed. You MUST NOT generate any challenge similar to the ones in the avoid list.

Return a STRICT JSON object with the following schema:
{{
  "id": "unique-kebab-case-id-like-matrix-bfs",
  "title": "Human Readable Title",
  "difficulty": "{difficulty}",
  "time_estimate_mins": 30,
  "tags": "{topic1},{topic2}",
  "xp_reward": 150,
  "template_code": "def function_name(args: types) -> ret_type:\\n    # Write your code here\\n    pass",
  "test_cases": "assert function_name(arg) == expected\\nassert function_name(arg2) == expected2"
}}

RULES:
- `template_code` MUST be valid Python. Include standard type hints.
- `test_cases` MUST be valid Python assertion statements that test edge cases and normal cases. Just write assert statements.
- Ensure the problem is interesting and solvable within 10-30 mins.
- DO NOT INCLUDE ANY MARKDOWN, EXPLANATIONS, OR ANYTHING EXCEPT THE JSON OBJECT.
"""
    qwen = get_qwen()
    res = await qwen.ainvoke(prompt)
    import json
    import re
    
    json_str = res.content
    match = re.search(r'\{.*\}', json_str, re.DOTALL)
    if match:
        json_str = match.group(0)
        
    try:
        data = json.loads(json_str)
        import uuid
        c = Challenge(
            id=data["id"] + "-" + str(uuid.uuid4())[:8],
            title=data["title"],
            difficulty=data["difficulty"],
            time_estimate_mins=int(data["time_estimate_mins"]),
            tags=data["tags"],
            xp_reward=int(data["xp_reward"]),
            status="pending",
            template_code=data["template_code"],
            test_cases=data["test_cases"]
        )
        db.add(c)
        db.add(ActivityHistory(user_id=current_user.id, title="AI Challenge Generated", activity_type="challenge", subtitle=c.title))
        db.commit()
        return {"success": True, "challenge_id": c.id}
    except Exception as e:
        import traceback
        return {"error": f"Failed to parse LLM JSON: {str(e)}\n{res.content}"}

from typing import Optional
from db import Submission, TestCase, ContestParticipant

@app.get("/api/challenges")
def get_challenges(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    chal = db.query(Challenge).all()
    # Find all challenges completed by the current user
    completed_titles = {
        act.subtitle for act in db.query(ActivityHistory).filter(
            ActivityHistory.user_id == current_user.id,
            ActivityHistory.activity_type == "challenge"
        ).all()
    }
    
    res = []
    for c in chal:
        status = "completed" if c.title in completed_titles else "pending"
        
        # Get structured public test cases
        structured_tcs = db.query(TestCase).filter(TestCase.challenge_id == c.id, TestCase.is_hidden == 0).all()
        structured_tc_list = [{"input_data": tc.input_data, "expected_output": tc.expected_output} for tc in structured_tcs]

        res.append({
            "id": c.id,
            "title": c.title,
            "description": c.description,
            "constraints": c.constraints,
            "difficulty": c.difficulty,
            "time_estimate_mins": c.time_estimate_mins,
            "tags": c.tags.split(",") if c.tags else [],
            "xp_reward": c.xp_reward,
            "status": status,
            "template_code": c.template_code,
            "legacy_test_cases": c.test_cases,
            "structured_test_cases": structured_tc_list
        })
    return res

class ChallengeSubmitReq(BaseModel):
    challenge_id: str
    code: str
    contest_id: Optional[str] = None

@app.post("/api/challenge/submit")
def submit_challenge(req: ChallengeSubmitReq, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    c = db.query(Challenge).filter(Challenge.id == req.challenge_id).first()
    if not c:
        return {"error": "Challenge not found"}

    # Prevent submitting if already successfully completed
    existing_success = db.query(Submission).filter(
        Submission.user_id == current_user.id,
        Submission.challenge_id == req.challenge_id,
        Submission.status == "accepted"
    ).first()
    if existing_success:
        return {"error": "You have already successfully completed this challenge and cannot submit again."}

    # Validate contest timing if submitted under a contest
    if req.contest_id:
        contest = db.query(Contest).filter(Contest.id == req.contest_id).first()
        if contest:
            now = datetime.datetime.utcnow()
            if now > contest.end_time:
                return {"error": "This contest has already ended."}
            if now < contest.start_time and current_user.is_admin < 1:
                return {"error": "This contest has not started yet."}

    # Create Submission Record
    sub = Submission(
        user_id=current_user.id,
        challenge_id=req.challenge_id,
        contest_id=req.contest_id,
        code=req.code,
        language="python",
        status="pending",
        score=0
    )
    db.add(sub)
    db.commit()

    test_cases = db.query(TestCase).filter(TestCase.challenge_id == req.challenge_id).all()
    
    passed_all = True
    output_log = ""
    total_score = 0
    max_score = sum(tc.weight for tc in test_cases) if test_cases else c.xp_reward
    
    if test_cases:
        # NEW STRUCTURED TEST CASE ENGINE
        for idx, tc in enumerate(test_cases):
            with tempfile.NamedTemporaryFile("w+", suffix=".py", delete=False) as f:
                f.write(req.code)
                temp_path = f.name
            
            try:
                # Provide input_data via stdin
                res = subprocess.run(["python", temp_path], input=tc.input_data, capture_output=True, text=True, timeout=5)
                os.remove(temp_path)
                
                if res.returncode != 0:
                    passed_all = False
                    output_log += f"Test {idx+1} Failed: Runtime Error\n{res.stderr}\n"
                    break
                    
                actual_out = res.stdout.strip()
                expected_out = tc.expected_output.strip()
                
                if actual_out == expected_out:
                    total_score += tc.weight
                    if not tc.is_hidden:
                        output_log += f"Test {idx+1} Passed!\n"
                else:
                    passed_all = False
                    if not tc.is_hidden:
                        output_log += f"Test {idx+1} Failed. Expected: {expected_out}, Got: {actual_out}\n"
                    else:
                        output_log += f"Test {idx+1} Failed (Hidden Case).\n"
                    break
            except subprocess.TimeoutExpired:
                os.remove(temp_path)
                passed_all = False
                output_log += f"Test {idx+1} Failed: Time Limit Exceeded\n"
                break
            except Exception as e:
                os.remove(temp_path)
                passed_all = False
                output_log += f"Test {idx+1} Failed: Execution Error\n"
                break
                
        if passed_all:
            sub.status = "accepted"
            sub.score = max_score
            output_log += "\nAll test cases passed!"
        else:
            sub.status = "wrong_answer"
            sub.score = total_score
    else:
        # LEGACY ASSERTION ENGINE
        comb_code = f"{req.code}\n\n{c.test_cases}"
        with tempfile.NamedTemporaryFile("w+", suffix=".py", delete=False) as f:
            f.write(comb_code)
            temp_path = f.name
        
        try:
            res = subprocess.run(["python", temp_path], capture_output=True, text=True, timeout=5)
            passed_all = (res.returncode == 0)
            output_log = res.stdout if passed_all else res.stderr
            sub.status = "accepted" if passed_all else "wrong_answer"
            sub.score = max_score if passed_all else 0
        except subprocess.TimeoutExpired:
            passed_all = False
            output_log = "Time Limit Exceeded"
            sub.status = "time_limit"
        except Exception:
            passed_all = False
            output_log = "Execution error."
            sub.status = "runtime_error"
        finally:
            os.remove(temp_path)

    db.commit()

    if passed_all:
        # Update User XP & Streak
        already_completed = db.query(ActivityHistory).filter(
            ActivityHistory.user_id == current_user.id,
            ActivityHistory.activity_type == "challenge",
            ActivityHistory.subtitle == c.title
        ).first()

        if not already_completed:
            u = db.query(UserStats).filter(UserStats.user_id == current_user.id).first()
            if u:
                u.xp_points += sub.score
                u.streak_days += 1
            db.add(ActivityHistory(user_id=current_user.id, title="Solved Challenge", activity_type="challenge", subtitle=c.title))
            
        # Update Contest Participant Score if in contest
        if req.contest_id:
            cp = db.query(ContestParticipant).filter(ContestParticipant.contest_id == req.contest_id, ContestParticipant.user_id == current_user.id).first()
            if not cp:
                cp = ContestParticipant(contest_id=req.contest_id, user_id=current_user.id, score=0)
                db.add(cp)
            
            # Check if this user already got points for THIS challenge in THIS contest
            # To be simple, we just add the score. In a real system, we track per-challenge contest score.
            # For prototype, we'll just increment.
            cp.score += sub.score
            
        db.commit()

    return {"passed": passed_all, "output": output_log, "score": sub.score}

# ==========================================
# PUBLIC CONTEST APIS
# ==========================================

from db import Contest

@app.get("/api/contests")
def get_public_contests(db: Session = Depends(get_db)):
    contests = db.query(Contest).filter(Contest.is_published == 1).order_by(Contest.start_time.desc()).all()
    return contests

@app.get("/api/contests/{contest_id}")
def get_contest_details(contest_id: str, db: Session = Depends(get_db)):
    c = db.query(Contest).filter(Contest.id == contest_id, Contest.is_published == 1).first()
    if not c:
        raise HTTPException(status_code=404, detail="Contest not found")
        
    from db import ContestChallenge
    relations = db.query(ContestChallenge).filter(ContestChallenge.contest_id == contest_id).all()
    c_ids = [r.challenge_id for r in relations]
    challenges = db.query(Challenge).filter(Challenge.id.in_(c_ids)).all()
    
    chal_data = []
    for c in challenges:
        structured_tcs = db.query(TestCase).filter(TestCase.challenge_id == c.id, TestCase.is_hidden == 0).all()
        structured_tc_list = [{"input_data": tc.input_data, "expected_output": tc.expected_output} for tc in structured_tcs]
        
        chal_dict = {
            "id": c.id,
            "title": c.title,
            "description": c.description,
            "constraints": c.constraints,
            "difficulty": c.difficulty,
            "time_estimate_mins": c.time_estimate_mins,
            "input_format": getattr(c, "input_format", ""),
            "output_format": getattr(c, "output_format", ""),
            "tags": c.tags,
            "xp_reward": c.xp_reward,
            "template_code": c.template_code,
            "legacy_test_cases": getattr(c, "test_cases", ""),
            "structured_test_cases": structured_tc_list
        }
        chal_data.append(chal_dict)
    
    return {
        "contest": c,
        "challenges": chal_data
    }

@app.get("/api/contests/{contest_id}/leaderboard")
def get_contest_leaderboard(contest_id: str, db: Session = Depends(get_db)):
    participants = db.query(ContestParticipant).filter(ContestParticipant.contest_id == contest_id).order_by(ContestParticipant.score.desc()).all()
    res = []
    for rank, p in enumerate(participants, 1):
        user = db.query(User).filter(User.id == p.user_id).first()
        res.append({
            "rank": rank,
            "username": user.username if user else "Unknown",
            "score": p.score,
            "joined_at": p.joined_at
        })
    return res

# Settings and History
@app.get("/api/history")
def get_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
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
def delete_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(ActivityHistory).filter(ActivityHistory.user_id == current_user.id).delete()
    db.commit()
    return {"success": True}

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
def clear_system_cache(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
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
