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

# Include newly refactored routers
from routers import auth, user, code, data

app.include_router(auth.router)
app.include_router(user.router)
app.include_router(user.leaderboard_router)
app.include_router(code.router)
app.include_router(data.router)

from typing import Optional

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
