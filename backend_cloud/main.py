from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from db import init_db, get_db, UserStats, Challenge, User, Submission, Contest, TestCase, ContestParticipant
import auth
from auth import get_current_user
import os
import datetime
from pydantic import BaseModel
from typing import Optional
import tempfile
import subprocess

app = FastAPI(title="AutoMind Cloud API")

# Include admin router
from routers.admin import router as admin_router
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

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "cloud_backend"}

# Include newly refactored routers
from routers import user as user_routes

app.include_router(user_routes.router)
app.include_router(user_routes.leaderboard_router)


# ==========================================
# CHALLENGES APIS
# ==========================================

@app.get("/api/challenges")
def get_challenges(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    chal = db.query(Challenge).all()
    
    # Find all challenges successfully completed by the current user
    completed_submissions = db.query(Submission.challenge_id).filter(
        Submission.user_id == current_user.id,
        Submission.status == "accepted"
    ).all()
    completed_ids = {sub[0] for sub in completed_submissions}
    
    res = []
    for c in chal:
        status_val = "completed" if c.id in completed_ids else "pending"
        
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
            "status": status_val,
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
        u = db.query(UserStats).filter(UserStats.user_id == current_user.id).first()
        if u:
            u.xp_points += sub.score
            u.streak_days += 1
            
        # Update Contest Participant Score if in contest
        if req.contest_id:
            cp = db.query(ContestParticipant).filter(ContestParticipant.contest_id == req.contest_id, ContestParticipant.user_id == current_user.id).first()
            if not cp:
                cp = ContestParticipant(contest_id=req.contest_id, user_id=current_user.id, score=0)
                db.add(cp)
            cp.score += sub.score
            
        db.commit()

    return {"passed": passed_all, "output": output_log, "score": sub.score}


# ==========================================
# PUBLIC CONTEST APIS
# ==========================================

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
