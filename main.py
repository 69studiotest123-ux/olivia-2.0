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
# Gemini 2.0 Flash for Speed, GPT-4o for Complex Logic
def get_gemini_model():
    api_key = os.getenv("GOOGLE_API_KEY", "YOUR_GEMINI_KEY")
    return ChatGoogleGenerativeAI(model="gemini-2.0-flash", api_key=api_key)

# --- Chat Endpoint (Required for Frontend UI) ---
class ChatRequest(BaseModel):
    prompt: str
    model_type: str = "gemini"

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        if request.model_type == "gemini":
            llm = get_gemini_model()
            response = llm.invoke(request.prompt).content
            return {"response": response}
    except Exception as e:
        return {"response": f"Error: {str(e)}"}

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
