import os
from datetime import datetime
from fastapi import FastAPI, BackgroundTasks, Request, HTTPException
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
from database import get_db, ChatMessage

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

# --- 1. PROACTIVE BRIEFING LOGIC ---
def generate_daily_briefing():
    db = next(get_db())
    # In a real app, fetch weather, news, and calendar here
    prompt = "Generate a daily briefing for Subhash. You are Olivia, a luxury brand expert. Include a motivational quote, current top news in photography, and remind him of his elite status. Keep it professional and inspiring."
    try:
        llm = get_gemini_model()
        briefing = llm.invoke(prompt).content
        # Save to chat history as a bot message
        msg = ChatMessage(sender="bot", content=f"[PROACTIVE BRIEFING] {briefing}")
        db.add(msg)
        db.commit()
        print("Daily briefing generated.")
    except Exception as e:
        print(f"Briefing error: {e}")

scheduler = BackgroundScheduler()
scheduler.add_job(generate_daily_briefing, 'cron', hour=8, minute=0)
scheduler.start()

# --- 2. VISION CRITIQUE LOGIC ---
@app.post("/vision/analyze")
async def analyze_design(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        llm = get_gemini_model()
        # Using HumanMessage with image for LangChain Gemini
        image_part = {
            "type": "image_url",
            "image_url": {"url": f"data:image/jpeg;base64,{base64.b64encode(contents).decode()}"},
        }
        text_part = {"type": "text", "text": "Analyze this image as a luxury brand expert. Give Subhash creative advice for 69 Studio."}
        message = HumanMessage(content=[text_part, image_part])
        response = llm.invoke([message]).content
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- 3. AUTO-EXPENSE TRACKER ---
def check_for_expenses(text, db: Session):
    # Simple keyword check for demo, could use LLM for more precision
    if any(word in text.lower() for word in ["spent", "paid", "bought", "cost"]):
        prompt = f"Extract expense data from this text: '{text}'. Format as JSON: {{'amount': number, 'category': string, 'item': string}}. If not an expense, return null."
        try:
            llm = get_gemini_model()
            data = llm.invoke(prompt).content
            # Process and log to DB (logic to be added to FinanceModel)
            return data
        except:
            return None
    return None

# --- Chat Endpoint with Retry Logic ---
class ChatRequest(BaseModel):
    prompt: str
    model_type: str = "gemini"

# --- 4. SMART HOME HYPER-SYNC MODULE ---
async def control_smart_home(scene: str):
    ifttt_key = os.getenv("IFTTT_KEY", "YOUR_IFTTT_KEY")
    try:
        if scene == "studio_mode":
            # Trigger IFTTT Webhook
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

    # Save user message
    user_msg = ChatMessage(sender="user", content=request.prompt)
    db.add(user_msg)
    db.commit()

    # Smart Home Intent Check
    smart_reply = None
    if any(word in request.prompt.lower() for word in ["වැඩ කරන්න", "design mode", "studio mode"]):
        smart_reply = await control_smart_home("studio_mode")
    elif any(word in request.prompt.lower() for word in ["sleep mode", "නිදාගන්න", "lights off"]):
        smart_reply = await control_smart_home("sleep_mode")

    if smart_reply:
        # Save and return immediately if it's a direct command
        bot_msg = ChatMessage(sender="bot", content=smart_reply)
        db.add(bot_msg)
        db.commit()
        return {"response": smart_reply}

    # Auto-expense check
    check_for_expenses(request.prompt, db)

    # Enhance prompt if it's a system command
    prompt = request.prompt
    if "[SYSTEM_COMMAND]" in prompt:
        prompt = f"System Command received: {prompt}. Please acknowledge this action as Olivia, the elite assistant, and confirm it's being handled. Keep it brief."

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
    
    return {"response": "System busy. Please try again shortly."}

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
