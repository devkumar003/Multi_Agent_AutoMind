from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from db import get_db, User, Challenge, TestCase, Contest, ContestChallenge, Submission
from auth import get_current_user
import uuid
import datetime

router = APIRouter(prefix="/api/admin", tags=["Admin"])

def get_admin_user(current_user: User = Depends(get_current_user)):
    if current_user.is_admin < 1:
        raise HTTPException(status_code=403, detail="Not authorized. Admin access required.")
    return current_user

def get_superuser(current_user: User = Depends(get_current_user)):
    if current_user.is_admin < 2:
        raise HTTPException(status_code=403, detail="Not authorized. Superuser access required.")
    return current_user

@router.get("/dashboard-stats")
def get_dashboard_stats(db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    import random
    total_users = db.query(User).count()
    total_submissions = db.query(Submission).count()
    
    now = datetime.datetime.utcnow()
    active_contests = db.query(Contest).filter(
        Contest.is_published == 1,
        Contest.start_time <= now,
        Contest.end_time >= now
    ).count()
    
    return {
        "total_users": total_users,
        "total_submissions": total_submissions,
        "active_contests": active_contests,
        "system_load": f"{random.randint(5, 30)}%" # Simulated load for now
    }

# ==========================================
# CHALLENGE MANAGEMENT
# ==========================================

class ChallengeCreateReq(BaseModel):
    id: str
    title: str
    description: str
    constraints: str
    input_format: str
    output_format: str
    difficulty: str
    time_estimate_mins: int
    memory_limit_mb: int
    tags: str
    xp_reward: int
    template_code: str
    is_published: int

@router.get("/challenges")
def get_all_challenges(db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    return db.query(Challenge).all()

@router.post("/challenges")
def create_challenge(req: ChallengeCreateReq, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    existing = db.query(Challenge).filter(Challenge.id == req.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Challenge ID already exists.")
    
    new_challenge = Challenge(
        id=req.id,
        title=req.title,
        description=req.description,
        constraints=req.constraints,
        input_format=req.input_format,
        output_format=req.output_format,
        difficulty=req.difficulty,
        time_estimate_mins=req.time_estimate_mins,
        memory_limit_mb=req.memory_limit_mb,
        tags=req.tags,
        xp_reward=req.xp_reward,
        template_code=req.template_code,
        is_published=req.is_published,
        creator_id=admin.id
    )
    db.add(new_challenge)
    db.commit()
    return {"success": True, "challenge_id": new_challenge.id}

@router.put("/challenges/{challenge_id}")
def update_challenge(challenge_id: str, req: ChallengeCreateReq, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    c = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Challenge not found")
        
    c.title = req.title
    c.description = req.description
    c.constraints = req.constraints
    c.input_format = req.input_format
    c.output_format = req.output_format
    c.difficulty = req.difficulty
    c.time_estimate_mins = req.time_estimate_mins
    c.memory_limit_mb = req.memory_limit_mb
    c.tags = req.tags
    c.xp_reward = req.xp_reward
    c.template_code = req.template_code
    c.is_published = req.is_published
    
    db.commit()
    return {"success": True}

@router.delete("/challenges/{challenge_id}")
def delete_challenge(challenge_id: str, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    c = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Challenge not found")
    # Delete associated test cases
    db.query(TestCase).filter(TestCase.challenge_id == challenge_id).delete()
    db.delete(c)
    db.commit()
    return {"success": True}

# ==========================================
# TEST CASE MANAGEMENT
# ==========================================

class TestCaseReq(BaseModel):
    input_data: str
    expected_output: str
    is_hidden: int
    weight: int

@router.get("/challenges/{challenge_id}/testcases")
def get_test_cases(challenge_id: str, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    return db.query(TestCase).filter(TestCase.challenge_id == challenge_id).all()

@router.post("/challenges/{challenge_id}/testcases")
def add_test_case(challenge_id: str, req: TestCaseReq, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    tc = TestCase(
        challenge_id=challenge_id,
        input_data=req.input_data,
        expected_output=req.expected_output,
        is_hidden=req.is_hidden,
        weight=req.weight,
        source="admin"
    )
    db.add(tc)
    db.commit()
    return {"success": True, "id": tc.id}

@router.delete("/testcases/{tc_id}")
def delete_test_case(tc_id: int, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    tc = db.query(TestCase).filter(TestCase.id == tc_id).first()
    if not tc:
        raise HTTPException(status_code=404, detail="TestCase not found")
    db.delete(tc)
    db.commit()
    return {"success": True}

from nodes import get_qwen
@router.post("/challenges/{challenge_id}/testcases/generate")
async def generate_ai_testcases(challenge_id: str, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    c = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Challenge not found")
        
    prompt = f"""You are an expert QA engineer.
Generate 3 edge-case test cases for the following coding challenge.
Title: {c.title}
Description: {c.description}
Constraints: {c.constraints}
Input Format: {c.input_format}
Output Format: {c.output_format}

Include boundary cases, large inputs, and invalid edge conditions.
Return a STRICT JSON array with this schema:
[
  {{
    "input_data": "raw string input",
    "expected_output": "raw string output",
    "is_hidden": 1,
    "weight": 20
  }}
]
DO NOT INCLUDE ANY EXPLANATIONS OR MARKDOWN OUTSIDE THE JSON ARRAY.
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
        cases = json.loads(json_str)
        return {"success": True, "preview_cases": cases}
    except Exception as e:
        return {"error": f"Failed to parse AI output: {str(e)}", "raw": res.content}

# ==========================================
# CONTEST MANAGEMENT
# ==========================================

class ContestReq(BaseModel):
    id: str
    title: str
    description: str
    start_time: str
    end_time: str
    is_published: int

@router.get("/contests")
def get_all_contests(db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    return db.query(Contest).all()

@router.post("/contests")
def create_contest(req: ContestReq, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    existing = db.query(Contest).filter(Contest.id == req.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Contest ID already exists.")
        
    st = datetime.datetime.fromisoformat(req.start_time.replace("Z", "+00:00"))
    et = datetime.datetime.fromisoformat(req.end_time.replace("Z", "+00:00"))
        
    new_contest = Contest(
        id=req.id,
        title=req.title,
        description=req.description,
        start_time=st,
        end_time=et,
        is_published=req.is_published
    )
    db.add(new_contest)
    db.commit()
    return {"success": True}

@router.put("/contests/{contest_id}")
def update_contest(contest_id: str, req: ContestReq, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    c = db.query(Contest).filter(Contest.id == contest_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Contest not found")
        
    st = datetime.datetime.fromisoformat(req.start_time.replace("Z", "+00:00"))
    et = datetime.datetime.fromisoformat(req.end_time.replace("Z", "+00:00"))
    
    c.title = req.title
    c.description = req.description
    c.start_time = st
    c.end_time = et
    c.is_published = req.is_published
    
    db.commit()
    return {"success": True}

@router.delete("/contests/{contest_id}")
def delete_contest(contest_id: str, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    c = db.query(Contest).filter(Contest.id == contest_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Contest not found")
        
    db.query(ContestChallenge).filter(ContestChallenge.contest_id == contest_id).delete()
    db.delete(c)
    db.commit()
    return {"success": True}

class AssignChallengeReq(BaseModel):
    challenge_id: str

@router.post("/contests/{contest_id}/challenges")
def assign_challenge_to_contest(contest_id: str, req: AssignChallengeReq, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    cc = ContestChallenge(contest_id=contest_id, challenge_id=req.challenge_id)
    db.merge(cc)
    db.commit()
    return {"success": True}

@router.get("/contests/{contest_id}/challenges")
def get_contest_challenges(contest_id: str, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    relations = db.query(ContestChallenge).filter(ContestChallenge.contest_id == contest_id).all()
    c_ids = [r.challenge_id for r in relations]
    challenges = db.query(Challenge).filter(Challenge.id.in_(c_ids)).all()
    return challenges

@router.delete("/contests/{contest_id}/challenges/{challenge_id}")
def remove_challenge_from_contest(contest_id: str, challenge_id: str, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    db.query(ContestChallenge).filter(ContestChallenge.contest_id == contest_id, ContestChallenge.challenge_id == challenge_id).delete()
    db.commit()
    return {"success": True}

# ==========================================
# USER MANAGEMENT
# ==========================================

class UserRoleUpdateReq(BaseModel):
    is_admin: int

@router.get("/users")
def get_all_users(db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    users = db.query(User).all()
    return [{"id": u.id, "username": u.username, "email": u.email, "is_admin": u.is_admin} for u in users]

@router.put("/users/{user_id}/role")
def update_user_role(user_id: int, req: UserRoleUpdateReq, db: Session = Depends(get_db), admin: User = Depends(get_superuser)):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent the admin from removing their own admin rights accidentally
    if u.id == admin.id and req.is_admin == 0:
        raise HTTPException(status_code=400, detail="Cannot revoke your own admin rights.")
        
    u.is_admin = req.is_admin
    db.commit()
    return {"success": True}
