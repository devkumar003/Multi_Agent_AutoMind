from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

# Mock admin user dependency
from db import User
from auth import get_current_user

def override_get_current_user():
    return User(id=1, username="admin", is_admin=1)

app.dependency_overrides[get_current_user] = override_get_current_user

# Test POST /api/admin/contests
payload = {
    "id": "test-contest-2",
    "title": "Test Contest",
    "description": "",
    "start_time": "2026-06-12T06:59:00.000Z",
    "end_time": "2026-06-13T06:59:00.000Z",
    "is_published": 1
}

res = client.post("/api/admin/contests", json=payload)
print("Create Contest Response:", res.status_code, res.text)

# Test POST /api/admin/contests/{id}/challenges
payload2 = {
    "challenge_id": "two-sum-ii"
}

res2 = client.post("/api/admin/contests/test-contest-2/challenges", json=payload2)
print("Assign Challenge Response:", res2.status_code, res2.text)
