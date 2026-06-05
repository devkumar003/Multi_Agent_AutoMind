from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from db import get_db, User, ActivityHistory
from auth import get_current_user_optional
from llm import get_qwen
import tempfile
import subprocess
import os
import json
import re

router = APIRouter(prefix="/api/code", tags=["code"])

class CodeRunReq(BaseModel):
    code: str
    language: str = "python"

@router.post("/run")
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
    
    output = ""
    exit_code = -1
    
    try:
        # NATIVE EXECUTION
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
        
        output = "[Executed locally]\n" + output
            
    except subprocess.TimeoutExpired:
        output += "\nTimeout expired. Infinite loop detected?"
        exit_code = -1
    except Exception as e:
        output += f"\nExecution engine error: {str(e)}"
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
            payload=json.dumps({"language": req.language, "code": req.code, "sandboxed": False})
        ))
        db.commit()

    return {"output": output, "exit_code": exit_code}

class CodeFixReq(BaseModel):
    code: str
    error_output: str
    language: str

@router.post("/fix")
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
