from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional
from db import get_db, User, UserStats
from auth import get_current_user, get_current_user_optional

router = APIRouter(prefix="/api/user", tags=["user"])
leaderboard_router = APIRouter(tags=["leaderboard"])

def get_rank_title(xp: int) -> str:
    if xp < 500: return "Novice Hacker"
    if xp < 2000: return "Quantum Operative"
    if xp < 5000: return "Neural Elite"
    return "AI Overlord"

@router.get("/profile")
async def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    stats = db.query(UserStats).filter(UserStats.user_id == current_user.id).first()
        
    current_xp = stats.xp_points if stats else 0
        
    return {
        "user": {
            "id": current_user.id,
            "username": current_user.username,
            "email": current_user.email,
            "is_admin": getattr(current_user, 'is_admin', 0)
        },
        "stats": {
            "xp": current_xp,
            "level": (current_xp // 100) + 1,
            "streak": stats.streak_days if stats else 0,
            "rank": get_rank_title(current_xp),
            "modulesCompleted": 0
        }
    }

@leaderboard_router.get("/api/leaderboard")
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

@router.get("/stats")
def get_user_stats(current_user: Optional[User] = Depends(get_current_user_optional), db: Session = Depends(get_db)):
    if current_user:
        stats = db.query(UserStats).filter(UserStats.user_id == current_user.id).first()
    else:
        stats = None
    if not stats:
        return {"streak_days": 0, "xp_points": 0}
    return {"streak_days": stats.streak_days, "xp_points": stats.xp_points}
