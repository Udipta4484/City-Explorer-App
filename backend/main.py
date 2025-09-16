# In backend/main.py

import os
import time
import traceback
from datetime import datetime, timedelta, timezone
from typing import Optional, List

import requests
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db import SessionLocal, engine
from models import Base, Favorite, User

load_dotenv()
Base.metadata.create_all(bind=engine)

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "")
OPENTRIPMAP_API_KEY = os.getenv("OPENTRIPMAP_API_KEY", "")
TIMEZONEDB_API_KEY = os.getenv("TIMEZONEDB_API_KEY", "")
SECRET_KEY = os.getenv("SECRET_KEY", "a_very_secret_key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 43200

app = FastAPI(title="City Explorer API")

origins = ["http://localhost:300","https://city-explorer-app.vercel.app"]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def verify_password(plain_password, hashed_password): return pwd_context.verify(plain_password, hashed_password)
def get_password_hash(password): return pwd_context.hash(password)
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials", headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None: raise credentials_exception
    except JWTError: raise credentials_exception
    user = db.query(User).filter(User.email == email).first()
    if user is None: raise credentials_exception
    return user

class UserCreate(BaseModel):
    email: str
    password: str

# --- UPDATED Pydantic models for Favorites ---
class FavoriteBase(BaseModel):
    id: int
    place_id: str
    name: str
    city: Optional[str] = None
    country: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    class Config:
        orm_mode = True

class FavoriteCreate(BaseModel):
    place_id: str
    name: str
    city: Optional[str] = None
    country: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
# -----------------------------------------

@app.post("/auth/register", status_code=status.HTTP_201_CREATED)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    # ... (function is unchanged)
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user: raise HTTPException(status_code=400, detail="Email already registered")
    hashed_password = get_password_hash(user.password)
    new_user = User(email=user.email, password_hash=hashed_password)
    db.add(new_user); db.commit(); db.refresh(new_user)
    return {"message": "User created successfully"}

@app.post("/auth/login")
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # ... (function is unchanged)
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password", headers={"WWW-Authenticate": "Bearer"})
    access_token = create_access_token(data={"sub": user.email}, expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/favorites", response_model=FavoriteBase, status_code=status.HTTP_201_CREATED)
def create_favorite(favorite: FavoriteCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # ... (function is unchanged, already prevents duplicates)
    existing_favorite = db.query(Favorite).filter(Favorite.user_id == current_user.id, Favorite.place_id == favorite.place_id).first()
    if existing_favorite: raise HTTPException(status_code=409, detail="Favorite already exists")
    new_favorite = Favorite(user_id=current_user.id, **favorite.dict())
    db.add(new_favorite); db.commit(); db.refresh(new_favorite)
    return new_favorite

@app.get("/api/favorites", response_model=List[FavoriteBase])
def read_favorites(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # ... (function is unchanged)
    return db.query(Favorite).filter(Favorite.user_id == current_user.id).all()

@app.delete("/api/favorites/{favorite_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_favorite(favorite_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # ... (function is unchanged)
    favorite_to_delete = db.query(Favorite).filter(Favorite.id == favorite_id).first()
    if not favorite_to_delete: raise HTTPException(status_code=404, detail="Favorite not found")
    if favorite_to_delete.user_id != current_user.id: raise HTTPException(status_code=403, detail="Not authorized")
    db.delete(favorite_to_delete); db.commit()
    return

# --- Search endpoint and helpers (all unchanged) ---
CACHE = {}
# ... (rest of the file is identical to the last version)
CACHE_TTL_SECONDS = 15 * 60
def cache_get(key: str):
    rec = CACHE.get(key)
    if not rec: return None
    ts, val = rec
    if time.time() - ts > CACHE_TTL_SECONDS:
        CACHE.pop(key, None)
        return None
    return val
def cache_set(key: str, value):
    CACHE[key] = (time.time(), value)
def geocode_city(city: str):
    if not OPENWEATHER_API_KEY: raise HTTPException(status_code=500, detail="OPENWEATHER_API_KEY is not configured on the server.")
    url = "http://api.openweathermap.org/geo/1.0/direct"; params = {"q": city, "limit": 1, "appid": OPENWEATHER_API_KEY}
    try:
        r = requests.get(url, params=params, timeout=10); r.raise_for_status(); data = r.json()
    except requests.RequestException as e: raise HTTPException(status_code=502, detail=f"Geocoding service error: {e}")
    if not data: return None
    return {"name": data[0].get("name"), "lat": data[0].get("lat"), "lon": data[0].get("lon"), "country": data[0].get("country")}
def get_weather(lat: float, lon: float):
    if not OPENWEATHER_API_KEY: return {}
    url = "https://api.openweathermap.org/data/2.5/weather"; params = {"lat": lat, "lon": lon, "units": "metric", "appid": OPENWEATHER_API_KEY}
    r = requests.get(url, params=params, timeout=10); r.raise_for_status(); j = r.json()
    return {"temp": j.get("main", {}).get("temp"), "description": j.get("weather", [{}])[0].get("description"), "humidity": j.get("main", {}).get("humidity"), "wind_speed": j.get("wind", {}).get("speed"), "icon": j.get("weather", [{}])[0].get("icon")}
def get_local_time(lat: float, lon: float):
    if not TIMEZONEDB_API_KEY: return {"timezone": "UTC", "local_time": datetime.now(timezone.utc).isoformat()}
    url = "http://api.timezonedb.com/v2.1/get-time-zone"; params = {"key": TIMEZONEDB_API_KEY, "format": "json", "by": "position", "lat": lat, "lng": lon}
    try:
        r = requests.get(url, params=params, timeout=8); r.raise_for_status(); j = r.json()
        if j.get("status") != "OK": return {"timezone": None, "local_time": None}
        dt = datetime.strptime(j.get("formatted"), "%Y-%m-%d %H:%M:%S"); tz = timezone(timedelta(seconds=int(j.get("gmtOffset", 0)))); dt_tz = dt.replace(tzinfo=tz)
        return {"timezone": j.get("zoneName"), "local_time": dt_tz.isoformat()}
    except Exception: return {"timezone": None, "local_time": None}
def get_attractions(lat: float, lon: float, radius=10000, limit=10):
    GEO_KEY = os.getenv("OPENTRIPMAP_API_KEY", "")
    if not GEO_KEY: return []
    url = "https://api.geoapify.com/v2/places"; params = {"categories": "tourism.sights,heritage,entertainment", "filter": f"circle:{lon},{lat},{radius}", "limit": limit, "apiKey": GEO_KEY}
    try:
        resp = requests.get(url, params=params, timeout=10); resp.raise_for_status(); data = resp.json(); features = data.get("features", [])
        results = []
        for feat in features:
            props = feat.get("properties", {}); coords = feat.get("geometry", {}).get("coordinates", [None, None])
            results.append({ "xid": props.get("place_id"), "name": props.get("name") or props.get("formatted"), "distance": props.get("distance"), "kinds": props.get("categories"), "description": props.get("address_line2") or "", "point": {"lat": coords[1], "lon": coords[0]} if coords and len(coords) == 2 else None })
        return results
    except Exception: return []

@app.get("/api/search")
def search(q: str, db: Session = Depends(get_db)):
    try:
        key = f"search:{q.strip().lower()}"; cached = cache_get(key)
        if cached: return cached
        geo = geocode_city(q)
        if not geo: return JSONResponse(status_code=404, content={"detail": "City not found"})
        lat, lon = geo["lat"], geo["lon"]; weather = get_weather(lat, lon); local = get_local_time(lat, lon); attractions = get_attractions(lat, lon, radius=10000, limit=8)
        out = {"city": geo, "weather": weather, "local_time": local, "attractions": attractions}; cache_set(key, out)
        return out
    except Exception as e:
        traceback.print_exc()

        return JSONResponse(status_code=500, content={"detail": f"Server error: {str(e)}"})
