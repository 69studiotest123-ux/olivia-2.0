import os
from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime

# PostgreSQL Database URL
# Format: postgresql://username:password@localhost/dbname
# You can also use SQLite for local testing: sqlite:///./olivia.db
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./olivia.db")

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    # connect_args={"check_same_thread": False} is only needed for SQLite
    connect_args={"check_same_thread": False} if "sqlite" in SQLALCHEMY_DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- User Preferences Table ---
class UserPreference(Base):
    __tablename__ = "user_preferences"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True)
    value = Column(String)

# --- 69 Studio Bookings Table ---
class BookingModel(Base):
    __tablename__ = "bookings"
    id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String, index=True)
    service = Column(String)
    date_time = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

# --- Chat History Table ---
class ChatMessage(Base):
    __tablename__ = "chat_history"
    id = Column(Integer, primary_key=True, index=True)
    sender = Column(String) # 'user' or 'bot'
    content = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)

# --- Inventory Table ---
class InventoryItem(Base):
    __tablename__ = "inventory"
    id = Column(Integer, primary_key=True, index=True)
    item_name = Column(String, index=True)
    stock_count = Column(Integer)
    min_threshold = Column(Integer, default=5) # Alert when below this

# --- Market Price Tracking ---
class MarketPrice(Base):
    __tablename__ = "market_prices"
    id = Column(Integer, primary_key=True, index=True)
    asset_name = Column(String) # Gold, Gem, etc.
    price = Column(String)
    updated_at = Column(DateTime, default=datetime.utcnow)

# --- Life Patterns & Memory ---
class UserPattern(Base):
    __tablename__ = "user_patterns"
    id = Column(Integer, primary_key=True, index=True)
    pattern_key = Column(String) # sleep_time, work_start, etc.
    pattern_val = Column(String)
    confidence = Column(Integer, default=0)

# Create all tables
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
