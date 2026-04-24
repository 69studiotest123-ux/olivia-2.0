import time
import requests
import os

# CLOUD_URL should be the URL of your deployed Olivia backend (e.g. Render/Heroku/Oracle URL)
CLOUD_URL = os.getenv("CLOUD_URL", "http://84.235.242.22:8000")

def poll_cloud_commands():
    print(f"📡 Olivia PC Bridge active. Polling {CLOUD_URL} for commands...")
    
    while True:
        try:
            # 1. Fetch commands from the Cloud Brain
            response = requests.get(f"{CLOUD_URL}/pc/commands")
            if response.status_code == 200:
                data = response.json()
                commands = data.get("commands", [])
                
                if commands:
                    print(f"📥 Received commands from Cloud: {commands}")
                    
                    # 2. Execute commands locally
                    for cmd in commands:
                        if cmd == "figma":
                            print("🎨 Opening Figma...")
                            os.system("start chrome https://figma.com")
                        elif cmd == "spotify":
                            print("🎵 Opening Spotify...")
                            os.system("start spotify")
                        elif cmd == "code" or cmd == "work_mode":
                            print("💻 Opening VS Code...")
                            os.system("start code")
                        elif cmd == "morning_brief":
                            print("🌅 Initiating Morning Protocol...")
                            # Speak a greeting using PowerShell
                            os.system('powershell -Command "Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak(\'Good morning Sir Subhash. Initiating morning protocol. Have a productive day.\');"')
                            # Open calendar and news
                            os.system("start chrome https://calendar.google.com")
                            os.system("start chrome https://news.google.com")
                        elif cmd == "deep_work":
                            print("🎧 Initiating Deep Work Mode...")
                            os.system('powershell -Command "Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak(\'Deep work mode activated. Muting notifications.\');"')
                            os.system("start spotify")
                            os.system("start code")
                        elif cmd == "night_lockdown":
                            print("🌙 Initiating Night Lockdown...")
                            os.system('powershell -Command "Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak(\'Night lockdown protocol initiated. Securing workstation.\');"')
                            # Lock the Windows PC
                            os.system("rundll32.exe user32.dll,LockWorkStation")
                        elif cmd == "pc_shutdown":
                            print("⚠️ WARNING: KILL SWITCH ACTIVATED. SHUTTING DOWN PC...")
                            os.system('powershell -Command "Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak(\'Warning. Kill switch activated. System will shutdown in 60 seconds.\');"')
                            # Shutdown in 60 seconds (can be aborted with 'shutdown /a')
                            os.system("shutdown /s /t 60")
                            
                    # 3. Clear the queue on the cloud so we don't run them again
                    requests.post(f"{CLOUD_URL}/pc/commands/clear")
                    print("✅ Commands executed and cleared from Cloud queue.")
                    
        except Exception as e:
            print(f"⚠️ Connection error: {e}")
            
        # Poll every 5 seconds
        time.sleep(5)

if __name__ == "__main__":
    poll_cloud_commands()
