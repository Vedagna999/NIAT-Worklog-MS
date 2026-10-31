import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
from app.routers import auth, categories, worklogs, manager, admin, users, skills

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create DB schema tables if they don't exist yet
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(
    title="NIAT Worklog Management System API",
    description="Full-stack enterprise worklog and mentor performance tracking system for 50+ mentors and managers.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration supporting wildcard and specific Vercel domains
cors_origins_env = os.getenv("CORS_ORIGINS", "*")
origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()] if cors_origins_env != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(categories.router)
app.include_router(worklogs.router)
app.include_router(manager.router)
app.include_router(admin.router)
app.include_router(skills.router)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "NIAT Worklog Management System API",
        "version": "1.0.0"
    }
