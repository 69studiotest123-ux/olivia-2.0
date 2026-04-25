import os
from datetime import datetime
from fastapi import FastAPI, BackgroundTasks, Request, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
from dotenv import load_dotenv

load_dotenv()

# AI Models & Logic
import json
import base64
from langchain_core.messages import HumanMessage
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from sqlalchemy.orm import Session
from fastapi import Depends
from database import get_db, ChatMessage, MarketPrice, UserPattern, BookingModel
from duckduckgo_search import DDGS
import psutil
from apscheduler.schedulers.background import BackgroundScheduler

class ChatRequest(BaseModel):
    prompt: str
    model_type: str = "gemini"

app = FastAPI(title="Olivia Elite Core")

# --- PC COMMAND QUEUE ---
# In production, use Redis or a Database. For now, in-memory list.
pc_command_queue = []

# Add CORS middleware to allow the PWA frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],  
)

# --- AI Models Initialization ---
def get_gemini_model():
    api_key = os.getenv("GOOGLE_API_KEY", "YOUR_GEMINI_KEY")
    return ChatGoogleGenerativeAI(model="gemini-2.0-flash", api_key=api_key)

# --- 1. PROACTIVE BRIEFING & MARKET SCANNER ---
def scan_market_prices():
    db = next(get_db())
    # Mock price fetch - in real app use an API like GoldAPI.io
    prices = {"Gold (24K)": "LKR 185,000", "Blue Sapphire": "LKR 450,000+"}
    for asset, price in prices.items():
        p = MarketPrice(asset_name=asset, price=price)
        db.add(p)
    db.commit()
    print("Market prices scanned.")

def generate_daily_briefing():
    db = next(get_db())
    # Business Forecasting: Fetch bookings
    from database import BookingModel
    bookings = db.query(BookingModel).all()
    booking_data = [{"customer": b.customer_name, "service": b.service, "date": b.date_time} for b in bookings]
    
    # Fetch market prices for briefing
    market = db.query(MarketPrice).order_by(MarketPrice.updated_at.desc()).limit(2).all()
    market_str = ", ".join([f"{m.asset_name}: {m.price}" for m in market])
    
    prompt = f"Act as a Business Forecaster and Luxury Brand Expert. Context: Market is {market_str}. Recent bookings: {booking_data}. Predict next month's workload for 69 Studio and generate a daily briefing for Subhash. Be inspiring and professional."
    try:
        llm = get_gemini_model()
        briefing = llm.invoke(prompt).content
        msg = ChatMessage(sender="bot", content=f"[BUSINESS FORECAST & BRIEFING]\n{briefing}")
        db.add(msg)
        db.commit()
    except Exception as e:
        print(f"Briefing error: {e}")

# --- CLOUD MONITORING MODULE ---
def check_server_health():
    db = next(get_db())
    cpu_usage = psutil.cpu_percent(interval=1)
    ram_usage = psutil.virtual_memory().percent
    
    if cpu_usage > 85 or ram_usage > 85:
        alert_msg = f"⚠️ [CLOUD ALERT] Oracle Server Load High: CPU {cpu_usage}%, RAM {ram_usage}%"
        msg = ChatMessage(sender="bot", content=alert_msg)
        db.add(msg)
        db.commit()
        print(alert_msg)

scheduler = BackgroundScheduler()
scheduler.add_job(generate_daily_briefing, 'cron', hour=8, minute=0)
scheduler.add_job(scan_market_prices, 'interval', hours=6) # Scan every 6 hours
scheduler.add_job(check_server_health, 'interval', minutes=30) # Monitor every 30 mins
scheduler.start()

# --- 2. THE DESIGNER'S EYE (VISION CRITIQUE) ---
@app.post("/vision/analyze")
async def analyze_design(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        llm = get_gemini_model()
        prompt_text = "Act as a Senior Creative Director. Critique Subhash's design for balance, typography, and luxury feel."
        image_part = {
            "type": "image_url",
            "image_url": {"url": f"data:image/jpeg;base64,{base64.b64encode(contents).decode()}"},
        }
        message = HumanMessage(content=[{"type": "text", "text": prompt_text}, image_part])
        response = llm.invoke([message]).content
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- 3. PATTERN LEARNING LOGIC ---
def learn_user_pattern(text, db: Session):
    # Detect patterns like "I am going to sleep" or "Starting work"
    if "sleep" in text.lower() or "නිදාගන්න" in text:
        p = UserPattern(pattern_key="last_sleep_time", pattern_val=datetime.utcnow().isoformat())
        db.add(p)
        db.commit()

@app.post("/chat")
async def chat_endpoint(request: ChatRequest, db: Session = Depends(get_db)):
    # ... previous logic ...
    learn_user_pattern(request.prompt, db)

# --- 3. AUTO-EXPENSE TRACKER ---
def check_for_expenses(text, db: Session):
    if any(word in text.lower() for word in ["spent", "paid", "bought", "cost", "ගියා", "වියදම්"]):
        prompt = f"Extract expense data from this text: '{text}'. Format strictly as JSON: {{'amount': number, 'category': string, 'item': string}}. If not an expense, return null."
        try:
            llm = get_gemini_model()
            data = llm.invoke(prompt).content
            print(f"Expense Logged: {data}")
            return data
        except:
            return None
    return None

# --- 4. SMART HOME HYPER-SYNC MODULE ---
async def control_smart_home(scene: str):
    ifttt_key = os.getenv("IFTTT_KEY", "YOUR_IFTTT_KEY")
    try:
        if scene == "studio_mode":
            requests.post(f"https://maker.ifttt.com/trigger/studio_lights_on/with/key/{ifttt_key}")
            return "සර්, Studio Mode එක active කළා. ලොකු design එකක් කරමු!"
        elif scene == "sleep_mode":
            requests.post(f"https://maker.ifttt.com/trigger/all_lights_off/with/key/{ifttt_key}")
            return "Good night Sir! ඔක්කොම lights off කළා."
    except Exception as e:
        print(f"Smart Home error: {e}")
    return None

@app.post("/chat")
async def chat_endpoint(request: ChatRequest, db: Session = Depends(get_db)):
    import time
    max_retries = 3
    retry_delay = 2 # seconds

    # 1. Save user message
    user_msg = ChatMessage(sender="user", content=request.prompt)
    db.add(user_msg)
    db.commit()

    # 2. Learn User Patterns
    learn_user_pattern(request.prompt, db)

    # 3. Smart Home Intent Check
    smart_reply = None
    if any(word in request.prompt.lower() for word in ["වැඩ කරන්න", "design mode", "studio mode"]):
        smart_reply = await control_smart_home("studio_mode")
    elif any(word in request.prompt.lower() for word in ["sleep mode", "නිදාගන්න", "lights off"]):
        smart_reply = await control_smart_home("sleep_mode")

    if smart_reply:
        bot_msg = ChatMessage(sender="bot", content=smart_reply)
        db.add(bot_msg)
        db.commit()
        return {"response": smart_reply}

    # 4. Auto-expense check
    check_for_expenses(request.prompt, db)

    # 5. NEXT LEVEL WEB RESEARCH AGENT
    prompt = request.prompt
    if "search" in prompt.lower() or "news" in prompt.lower() or "හොයන්න" in prompt:
        try:
            print(f"🔍 Olivia is searching for: {prompt}")
            with DDGS() as ddgs:
                results = list(ddgs.text(prompt, max_results=3))
            search_context = "\n".join([f"- {r['title']}: {r['body']}" for r in results])
            prompt = f"User asked: {prompt}\nWeb Search Results:\n{search_context}\nProvide a concise and luxurious summary as Olivia."
        except Exception as e:
            print(f"Web search error: {e}")

    # 6. Process with AI (Gemini)
    if "[SYSTEM_COMMAND]" in prompt:

        prompt = f"System Command received: {prompt}. Please acknowledge as Olivia."

    for attempt in range(max_retries):
        try:
            if request.model_type == "gemini":
                llm = get_gemini_model()
                response = llm.invoke(prompt).content
                
                # Save bot response
                bot_msg = ChatMessage(sender="bot", content=response)
                db.add(bot_msg)
                db.commit()
                
                return {"response": response}
        except Exception as e:
            error_str = str(e)
            if "429" in error_str and attempt < max_retries - 1:
                time.sleep(retry_delay * (attempt + 1))
                continue
            return {"response": "Sir, මගේ Quota එක මේ වෙලාවේ ඉවරයි. කරුණාකර විනාඩියකින් ආයේ උත්සාහ කරන්න."}
    
    return {"response": "System busy."}


@app.get("/chat/history")
async def get_chat_history(db: Session = Depends(get_db)):
    messages = db.query(ChatMessage).order_by(ChatMessage.timestamp.asc()).all()
    return [{"sender": m.sender, "content": m.content, "timestamp": m.timestamp} for m in messages]

# --- 1. PROACTIVE MEMORY SYSTEM ---
def save_to_memory(user_id, key, value):
    # logic to save in Firebase or Local JSON
    # memories.json එකට preference එකක් විදිහට save වේ
    pass

# --- 2. BUSINESS INTEL (69 STUDIO) ---
@app.post("/studio/auto-booking")
async def handle_booking(customer_name: str, service: str, date: str):
    # 1. Check Calendar for conflicts
    # 2. Add to Google Calendar
    # 3. Send WhatsApp confirmation via Baileys/Twilio
    return {"status": "confirmed", "message": f"Booking secured for {customer_name}"}

@app.get("/studio/check-status")
def check_business_status():
    try:
        with open('appointments.json', 'r') as f:
            appointments = json.load(f)
            
        today = datetime.now().strftime("%Y-%m-%d")
        today_tasks = [app for app in appointments if app.get('date') == today]
        
        if today_tasks:
            first_task_time = today_tasks[0].get('time', 'TBA')
            message = f"Sir, අදට bookings {len(today_tasks)}ක් තියෙනවා. පළවෙනි එක තියෙන්නේ {first_task_time} ට."
            return {"status": "success", "message": message, "tasks": today_tasks}
        else:
            return {"status": "success", "message": "අදට bookings මුකුත් නැහැ සර්."}
    except FileNotFoundError:
        return {"status": "error", "message": "appointments.json file not found."}

# --- 3. SMART HOME & PC SYNC (CLOUD VERSION) ---
@app.get("/control/scene/{scene_name}")
def activate_scene(scene_name: str):
    if scene_name == "studio_mode":
        pc_command_queue.append("figma")
        pc_command_queue.append("spotify")
        return {"status": "Studio Mode Activated", "queued": ["figma", "spotify"]}
    
    elif scene_name in ["dev_mode", "work_mode"]:
        pc_command_queue.append("work_mode")
        return {"status": "Dev Mode Activated", "queued": ["work_mode"]}
    
    elif scene_name == "spotify":
        pc_command_queue.append("spotify")
        return {"status": "Spotify queued for PC Bridge"}
    
    elif scene_name == "morning_brief":
        pc_command_queue.append("morning_brief")
        return {"status": "☀️ Morning Protocol queued! PC will speak and open Calendar + News."}
    
    elif scene_name == "deep_work":
        pc_command_queue.append("deep_work")
        return {"status": "🎧 Deep Work Mode queued! Spotify + VS Code opening."}
    
    elif scene_name == "night_lockdown":
        pc_command_queue.append("night_lockdown")
        return {"status": "🌙 Night Lockdown queued! PC will lock itself."}
    
    elif scene_name == "pc_shutdown":
        pc_command_queue.append("pc_shutdown")
        return {"status": "⚠️ KILL SWITCH activated! PC shutting down in 60 seconds."}
    
    else:
        # Generic fallback - queue any unknown scene as a command
        pc_command_queue.append(scene_name)
        return {"status": f"Command '{scene_name}' queued for PC Bridge."}

# Endpoints for the Local PC Bridge to poll
@app.get("/pc/commands")
def get_pc_commands():
    return {"commands": pc_command_queue}

@app.post("/pc/commands/clear")
def clear_pc_commands():
    pc_command_queue.clear()
    return {"status": "cleared"}

# --- 4. DAILY INTELLIGENCE BRIEFING ---
@app.get("/olivia/morning-report")
def get_morning_report():
    # Weather + Stocks (69 Gems relevant) + News + Tasks
    report = {
        "weather": "30°C Colombo - Sunny",
        "crypto": "BTC is up 2%",
        "tasks": "3 Studio Bookings today",
        "reminders": "Dubai Flight check-in in 2 days"
    }
    return report

    return report

# --- 5. VISION ANALYSIS LOGIC ---
class VisionRequest(BaseModel):
    base64_image: str

@app.post("/vision/analyze")
async def analyze_design(request: VisionRequest):
    try:
        llm = get_gemini_model()
        message = HumanMessage(
            content=[
                {"type": "text", "text": "Analyze this design and suggest improvements based on luxury branding rules. Answer like an elite AI assistant."},
                {"type": "image_url", "image_url": f"data:image/jpeg;base64,{request.base64_image}"}
            ]
        )
        response = llm.invoke([message]).content
        return {"analysis": response}
    except Exception as e:
        return {"error": str(e)}

# --- 6. VOICE ENGINE (ELEVENLABS) ---
class VoiceRequest(BaseModel):
    text: str

@app.post("/olivia/generate-voice")
def text_to_voice(request: VoiceRequest):
    # Connect to ElevenLabs API
    # Return audio stream to HomePod or PWA
    return {"status": "Voice generated for", "text": request.text}

if __name__ == "__main__":
    import uvicorn
    # Render assigns a port dynamically via the PORT environment variable
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
