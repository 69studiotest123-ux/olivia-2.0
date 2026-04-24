// --- Global Functions for HTML calls ---
const CORRECT_KEY = "69studio"; // Modern Elite Access Key

window.triggerAction = async function(action) {
    console.log("Triggering Action:", action);
    const aiOrb = document.getElementById('aiOrb');
    const statusText = document.querySelector('.ai-status-text');
    
    if (aiOrb) aiOrb.classList.add('speaking-anim');
    if (statusText) statusText.innerText = "Initializing " + action.replace('_', ' ') + "...";

    // Call chat with the command
    try {
        const response = await fetch("http://84.235.242.22:8000/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: `[SYSTEM_COMMAND] Trigger action: ${action}`, model_type: "gemini" })
        });
        const data = await response.json();
        // Move to Comms view to see the response
        window.appSwitchView('chat');
        // The message will be added by the chat logic if we can hook it
        // For now, just alert or add a manual message
        if (window.addChatMessage) window.addChatMessage(data.response, 'bot');
    } catch (e) {
        console.error("Action error:", e);
    } finally {
        setTimeout(() => {
            if (aiOrb) aiOrb.classList.remove('speaking-anim');
            if (statusText) statusText.innerText = "Standby";
        }, 1500);
    }
};

window.toggleAutomation = async function(device, el) {
    const isActive = el.classList.contains('active');
    const newState = !isActive;
    el.classList.toggle('active');
    
    console.log(`Toggling ${device} to ${newState ? 'ON' : 'OFF'}`);
    
    try {
        await fetch("http://84.235.242.22:8000/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: `[SYSTEM_COMMAND] ${device} set to ${newState ? 'ON' : 'OFF'}`, model_type: "gemini" })
        });
    } catch (e) {
        console.error("Toggle error:", e);
    }
};

function handleLogin() {
    const accessKey = document.getElementById('accessKey').value;
    const btn = document.querySelector('.login-btn');
    const btnText = btn.querySelector('span');
    
    if (accessKey === CORRECT_KEY) {
        btnText.innerText = "Access Granted...";
        btn.style.background = "#10b981";
        
        setTimeout(() => {
            setTimeout(() => {
                document.getElementById('loginScreen').style.opacity = '0';
                document.getElementById('appContainer').style.display = 'flex';
                document.getElementById('mobileTopBar').style.display = 'flex';
                document.getElementById('globalMicBtn').style.display = 'grid';
                
                // Load sync'd chat
                if (typeof loadChatHistory === 'function') loadChatHistory();
                
                setTimeout(() => {
                    document.getElementById('loginScreen').style.display = 'none';
                }, 500);
            }, 1000);
            
            // Persist session
            localStorage.setItem('olivia_auth', 'true');
            
            // Trigger initial AI greeting
            console.log("System Initialized.");
        }, 1000);
    } else {
        btnText.innerText = "Invalid Key";
        btn.style.background = "#ff3344";
        setTimeout(() => {
            btnText.innerText = "Initialize System";
            btn.style.background = "";
        }, 2000);
    }
}

function switchToView(target) {
    if (window.appSwitchView) {
        window.appSwitchView(target);
    } else {
        console.error("appSwitchView not initialized yet.");
    }
}

async function triggerAction(actionName) {
    console.log(`Triggering action: ${actionName}`);
    try {
        await fetch(`http://84.235.242.22:8000/control/scene/${actionName}`);
    } catch(e) {
        console.warn("Failed to send command to backend.");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("Olivia 2.0 System Initializing...");

    // --- Check Auth ---
    async function loadChatHistory() {
        if (!chatMessages) return;
        try {
            const response = await fetch("http://84.235.242.22:8000/chat/history");
            const history = await response.json();
            chatMessages.innerHTML = ''; // Clear existing
            history.forEach(msg => {
                addMessage(msg.content, msg.sender);
            });
        } catch (e) {
            console.error("History error:", e);
        }
    }

    if (localStorage.getItem('olivia_auth') === 'true') {
        const appContainer = document.getElementById('appContainer');
        const loginScreen = document.getElementById('loginScreen');
        const globalMicBtn = document.getElementById('globalMicBtn');
        
        if (appContainer) appContainer.style.display = 'flex';
        if (loginScreen) loginScreen.style.display = 'none';
        if (globalMicBtn) globalMicBtn.style.display = 'grid';
        
        document.getElementById('mobileTopBar').style.display = 'flex';
        loadChatHistory(); // Load sync'd chat
    }
    
    // --- Navigation Elements ---
    const navItems = document.querySelectorAll('.nav-item');
    const mobileNavItems = document.querySelectorAll('.mobile-nav-item');
    const views = document.querySelectorAll('.view');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    // --- View Switching Core ---
    window.appSwitchView = (target) => {
        console.log(`Switching to view: ${target}`);
        // Deactivate all
        views.forEach(v => v.classList.remove('active'));
        navItems.forEach(n => n.classList.remove('active'));
        mobileNavItems.forEach(n => n.classList.remove('active'));

        // Activate target
        const targetView = document.getElementById(`${target}-view`);
        if (targetView) {
            targetView.classList.add('active');
        } else {
            console.warn(`View ID ${target}-view not found.`);
        }

        // Sync Sidebar
        navItems.forEach(n => {
            if (n.getAttribute('data-target') === target) n.classList.add('active');
        });

        // Sync Mobile Nav
        const activeMobileItem = Array.from(mobileNavItems).find(n => n.getAttribute('data-target') === target);
        if (activeMobileItem) {
            activeMobileItem.classList.add('active');
            activeMobileItem.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }

        // Mobile specific: Close sidebar if open
        if (sidebar && sidebar.classList.contains('mobile-open')) {
            sidebar.classList.remove('mobile-open');
            if (sidebarOverlay) sidebarOverlay.classList.remove('open');
        }
    };

    // Attach listeners to Sidebar (Fallback for desktop clicking)
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.getAttribute('data-target');
            window.appSwitchView(target);
        });
    });

    // --- Time & Date Logic ---
    const timeGreeting = document.getElementById('timeGreeting');
    const todayDateEl = document.getElementById('todayDate');
    const now = new Date();
    
    // Greeting
    const hour = now.getHours();
    if (timeGreeting) {
        if (hour < 12) timeGreeting.innerText = "Good Morning, Sir.";
        else if (hour < 18) timeGreeting.innerText = "Good Afternoon, Sir.";
        else timeGreeting.innerText = "Good Evening, Sir.";
    }

    // Schedule Date
    if (todayDateEl) {
        const options = { weekday: 'long', month: 'long', day: 'numeric' };
        todayDateEl.innerText = now.toLocaleDateString('en-US', options);
    }

    // --- Mobile Sidebar Toggle ---
    const mobileSidebarBtn = document.getElementById('mobileSidebarBtn');

    if (mobileSidebarBtn && sidebar) {
        mobileSidebarBtn.addEventListener('click', () => {
            sidebar.classList.add('mobile-open');
            if (sidebarOverlay) {
                sidebarOverlay.classList.add('open');
                sidebarOverlay.style.display = 'block';
            }
        });
    }
    if (sidebarOverlay && sidebar) {
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('mobile-open');
            sidebarOverlay.classList.remove('open');
            sidebarOverlay.style.display = 'none';
        });
    }

    // --- Chat Logic ---
    const chatInput = document.getElementById('chatInput');
    const chatSendBtn = document.getElementById('chatSendBtn');
    const chatMessages = document.getElementById('chatMessages');

    async function sendMessage() {
        if (!chatInput) return;
        const text = chatInput.value.trim();
        if (!text) return;

        addMessage(text, 'user');
        chatInput.value = '';

        const aiOrb = document.getElementById('aiOrb');
        const statusText = document.querySelector('.ai-status-text');
        
        if (aiOrb) aiOrb.classList.add('speaking-anim');
        if (statusText) statusText.innerText = "Processing...";

        try {
            const response = await fetch("http://84.235.242.22:8000/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: text, model_type: "gemini" })
            });
            const data = await response.json();
            const botText = data.response || "Error getting response";
            addMessage(botText, 'bot');
            
            // Speak the response aloud
            if (window.speakResponse) window.speakResponse(botText);
            
        } catch (error) {
            console.error("Backend error:", error);
            addMessage("Sir, I cannot reach the main server at the moment.", 'bot');
        } finally {
            if (aiOrb) aiOrb.classList.remove('speaking-anim');
            if (statusText) statusText.innerText = "Standby";
        }
    }

    function addMessage(text, sender) {
        if (!chatMessages) return;
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender}`;
        const avatar = sender === 'user' ? '<i class="fa-solid fa-user"></i>' : '<img src="olivia.png" alt="O">';
        msgDiv.innerHTML = `<div class="msg-avatar">${avatar}</div><div class="msg-bubble">${text}</div>`;
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Expose globally
    window.addChatMessage = addMessage;

    if (chatSendBtn && chatInput) {
        chatSendBtn.addEventListener('click', sendMessage);
        chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
    }

    // --- Global Mic Button ---
    const globalMicBtn = document.getElementById('globalMicBtn');
    const aiOrb = document.getElementById('aiOrb');

    // --- Voice AI Engine ---
    let recognition;
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            console.log("Speech recognized:", transcript);
            if (chatInput) {
                chatInput.value = transcript;
                sendMessage(); // Auto-send recognized text
            }
        };

        recognition.onend = () => {
            stopListeningUI();
        };

        recognition.onerror = (event) => {
            console.error("Speech error:", event.error);
            stopListeningUI();
        };
    }

    function startListeningUI() {
        const statusText = document.querySelector('.ai-status-text');
        if (aiOrb) aiOrb.classList.add('speaking-anim');
        if (statusText) statusText.innerText = "Listening...";
        if (globalMicBtn) globalMicBtn.classList.add('active');
    }

    function stopListeningUI() {
        const statusText = document.querySelector('.ai-status-text');
        if (aiOrb) aiOrb.classList.remove('speaking-anim');
        if (statusText) statusText.innerText = "Standby";
        if (globalMicBtn) globalMicBtn.classList.remove('active');
    }

    // Text-to-Speech Response
    window.speakResponse = function(text) {
        if (!('speechSynthesis' in window)) return;
        
        // Stop any current speaking
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 1.0;
        utterance.pitch = 1.1; // Slightly higher for more female tone
        
        // Try to find a premium female voice
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => 
            v.name.includes('Google UK English Female') || 
            v.name.includes('Samantha') || 
            v.name.includes('Female')
        );
        if (preferredVoice) utterance.voice = preferredVoice;

        window.speechSynthesis.speak(utterance);
    };

    if (globalMicBtn) {
        globalMicBtn.addEventListener('click', () => {
            if (aiOrb && aiOrb.classList.contains('speaking-anim')) {
                if (recognition) recognition.stop();
                stopListeningUI();
            } else {
                if (recognition) {
                    try {
                        recognition.start();
                        startListeningUI();
                    } catch (e) {
                        console.error("Mic start error:", e);
                    }
                } else {
                    alert("Speech recognition not supported in this browser.");
                }
            }
        });
    }

    // --- ADVANCED GEOFENCING ---
    const HOME_LOCATIONS = {
        dubai: { lat: 25.2048, lon: 55.2708, radius: 500 }, // Example Dubai coords
        sl: { lat: 6.9271, lon: 79.8612, radius: 500 }      // Example SL coords
    };

    function checkGeofencing(pos) {
        const { latitude, longitude } = pos.coords;
        for (const [name, loc] of Object.entries(HOME_LOCATIONS)) {
            const dist = calculateDistance(latitude, longitude, loc.lat, loc.lon);
            if (dist < loc.radius) {
                console.log(`Arrived at ${name}! Triggering welcome scene...`);
                window.triggerAction(`arrived_${name}`);
            }
        }
    }

    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // metres
        const φ1 = lat1 * Math.PI/180;
        const φ2 = lat2 * Math.PI/180;
        const Δφ = (lat2-lat1) * Math.PI/180;
        const Δλ = (lon2-lon1) * Math.PI/180;
        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    if ("geolocation" in navigator) {
        navigator.geolocation.watchPosition(checkGeofencing);
    }

    // --- WAKE WORD DETECTION (Hey Olivia) ---
    let isWakeWordActive = false;
    function initWakeWord() {
        if (!('webkitSpeechRecognition' in window)) return;
        const wakeWordRecognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        wakeWordRecognition.continuous = true;
        wakeWordRecognition.interimResults = true;
        wakeWordRecognition.lang = 'en-US';

        wakeWordRecognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0])
                .map(result => result.transcript)
                .join('').toLowerCase();

            if (transcript.includes('hey olivia') || transcript.includes('olivia')) {
                console.log("Wake word detected!");
                wakeWordRecognition.stop(); // Stop wake listener
                globalMicBtn.click(); // Trigger main mic
            }
        };

        wakeWordRecognition.onend = () => {
            if (!isWakeWordActive) wakeWordRecognition.start();
        };

        wakeWordRecognition.start();
    }
    
    // Start wake word after first user interaction (browser requirement)
    document.addEventListener('click', () => {
        if (!isWakeWordActive) {
            initWakeWord();
            isWakeWordActive = true;
        }
    }, { once: true });

    // --- IP CAMERA INTEGRATION ---
    window.connectCamera = () => {
        const ipInput = document.getElementById('cameraIpInput').value;
        const feedBox = document.getElementById('cameraFeedBox');
        const liveFeed = document.getElementById('liveCameraFeed');
        
        if (ipInput) {
            liveFeed.src = ipInput;
            feedBox.style.display = 'block';
            window.speakResponse("Connecting to remote camera feed sir.");
        } else {
            alert("Please enter a valid Camera IP URL.");
        }
    };

    console.log("Olivia 2.0 System Online.");
});
