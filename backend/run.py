import uvicorn
import os
import sys

if __name__ == "__main__":
    # Ensure uploads directory exists since uvicorn might run in a different working directory context
    os.makedirs("uploads", exist_ok=True)
    
    is_frozen = getattr(sys, 'frozen', False)
    if is_frozen:
        from main import app
        uvicorn.run(app, host="127.0.0.1", port=1007)
    else:
        # Use reload=True in development mode
        uvicorn.run("main:app", host="127.0.0.1", port=1007, reload=True)
