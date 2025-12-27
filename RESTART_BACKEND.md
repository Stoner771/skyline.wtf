# Backend Server Restart Instructions

## The Issue
The backend server is still using old cached code. You need to manually restart it.

## Steps to Fix:

1. **Find the terminal window where the backend is running**
   - Look for a terminal showing: `INFO: Uvicorn running on http://0.0.0.0:8000`

2. **Stop the server:**
   - Press `Ctrl + C` in that terminal

3. **Restart the server:**
   ```bash
   cd backend
   python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

4. **Wait for it to start:**
   - You should see: `INFO: Application startup complete.`

5. **Try logging in again:**
   - Go to http://localhost:5173/login
   - Username: `admin`
   - Password: `password123`

The code fix is already in place - you just need to restart the server to load it!

