import logging
import os
from datetime import datetime
from typing import Optional

from bson import ObjectId
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from pymongo.collection import Collection

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

MONGO_URI = os.environ["MONGODB_URI"]
ALLOWED_ORIGINS = os.environ.get("API_ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app = FastAPI(title="CommonGround Read API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET"],
    allow_headers=["*"],
)

client = MongoClient(MONGO_URI)
db = client["commonground"]


def serialize(value):
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, dict):
        return {k: serialize(v) for k, v in value.items()}
    if isinstance(value, list):
        return [serialize(v) for v in value]
    return value


def fetch(col: Collection, since: Optional[datetime], limit: int) -> list[dict]:
    query: dict = {}
    if since is not None:
        query["timestamp"] = {"$gte": since}
    cursor = col.find(query).sort("timestamp", -1).limit(limit)
    return [serialize(doc) for doc in cursor]


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/signals")
def get_signals(
    since: Optional[datetime] = None,
    limit: int = Query(100, ge=1, le=500),
) -> list[dict]:
    return fetch(db["signals"], since, limit)


@app.get("/reports")
def get_reports(
    since: Optional[datetime] = None,
    limit: int = Query(100, ge=1, le=500),
) -> list[dict]:
    return fetch(db["reports"], since, limit)
