from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import uvicorn

from database import engine, Base
from routes import auth, admin, api, licenses, users, apps, logs, files, vars, resellers, tickets
from routes import websocket
from middleware.rate_limit import RateLimitMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="SkyLineentication API",
    description="Complete authentication platform with license management",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(RateLimitMiddleware)

# Include auth router first (more specific routes)
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
# Include admin router
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
# Include API router last (less specific routes)
app.include_router(api.router, prefix="/api", tags=["Client API"])
app.include_router(licenses.router, prefix="/api/admin/licenses", tags=["Licenses"])
app.include_router(users.router, prefix="/api/admin/users", tags=["Users"])
app.include_router(apps.router, prefix="/api/admin/apps", tags=["Applications"])
app.include_router(logs.router, prefix="/api/admin/logs", tags=["Logs"])
app.include_router(files.router, prefix="/api/admin/files", tags=["Files"])
app.include_router(vars.router, prefix="/api/admin/vars", tags=["Variables"])
app.include_router(resellers.router, prefix="/api/admin/resellers", tags=["Resellers"])
app.include_router(tickets.router, prefix="/api/admin/tickets", tags=["Tickets"])
from routes import reseller_api
app.include_router(reseller_api.router, prefix="/api/reseller", tags=["Reseller API"])

# WebSocket routes
app.include_router(websocket.router, prefix="/ws", tags=["WebSocket"])


@app.get("/")
async def root():
    return {"message": "SkyLineentication API", "version": "1.0.0"}


@app.get("/api/time")
async def server_time():
    from datetime import datetime
    return {"timestamp": int(datetime.utcnow().timestamp())}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)