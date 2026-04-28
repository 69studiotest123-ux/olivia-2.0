// --- Global Functions for HTML calls ---
const CORRECT_KEY = "69studio"; // Modern Elite Access Key

// Dynamic API Base Detection (Global)
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || !window.location.hostname) 
    ? "http://localhost:8000" 
    : `http://${window.location.hostname}:8000`;

console.log("Olivia 2.0 System Online. API Base:", API_BASE);

window.triggerAction = async function(action) {
    console.log("Triggering Action:", action);
    const aiOrb = document.getElementById('aiOrb');
    const statusText = document.querySelector('.ai-status-text');
    
    if (aiOrb) aiOrb.classList.add('speaking-anim');
    if (statusText) statusText.innerText = "Initializing " + action.replace('_', ' ') + "...";

    // Call chat with the command
    try {
        const response = await fetch(`${API_BASE}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: `[SYSTEM_COMMAND] Trigger action: ${action}`, model_type: "gemini" })
        });
        const data = await response.json();
        // Move to Comms view to see the response
        window.appSwitchView('chat');
        if (window.addChatMessage) window.addChatMessage(data.response, 'bot');
        if (window.speakResponse) window.speakResponse(data.response);
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
        await fetch(`${API_BASE}/chat`, {
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
                
                // Trigger initial AI greeting
                console.log("System Initialized.");
                
                setTimeout(() => {
                    document.getElementById('loginScreen').style.display = 'none';
                }, 500);
            }, 1000);
            
            // Persist session
            localStorage.setItem('olivia_auth', 'true');
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

document.addEventListener('DOMContentLoaded', () => {
    console.log("Olivia 2.0 Dashboard Initializing...");

    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const chatSendBtn = document.getElementById('chatSendBtn');

    // --- Load History ---
    async function loadChatHistory() {
        if (!chatMessages) return;
        try {
            const response = await fetch(`${API_BASE}/chat/history`);
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
        loadChatHistory(); 
    }
    
    // --- Navigation Elements ---
    const navItems = document.querySelectorAll('.nav-item');
    const mobileNavItems = document.querySelectorAll('.mobile-nav-item');
    const views = document.querySelectorAll('.view');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    window.appSwitchView = (target) => {
        console.log(`Switching to view: ${target}`);
        views.forEach(v => v.classList.remove('active'));
        navItems.forEach(n => n.classList.remove('active'));
        mobileNavItems.forEach(n => n.classList.remove('active'));

        const targetView = document.getElementById(`${target}-view`);
        if (targetView) targetView.classList.add('active');

        navItems.forEach(n => {
            if (n.getAttribute('data-target') === target) n.classList.add('active');
        });

        const activeMobileItem = Array.from(mobileNavItems).find(n => n.getAttribute('data-target') === target);
        if (activeMobileItem) {
            activeMobileItem.classList.add('active');
        }

        if (sidebar && sidebar.classList.contains('mobile-open')) {
            sidebar.classList.remove('mobile-open');
            if (sidebarOverlay) {
                sidebarOverlay.classList.remove('open');
                sidebarOverlay.style.display = 'none';
            }
        }
    };

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            window.appSwitchView(item.getAttribute('data-target'));
        });
    });

    // --- Time & Date Logic ---
    const timeGreeting = document.getElementById('timeGreeting');
    const todayDateEl = document.getElementById('todayDate');
    const now = new Date();
    
    const hour = now.getHours();
    if (timeGreeting) {
        if (hour < 12) timeGreeting.innerText = "Good Morning, Sir.";
        else if (hour < 18) timeGreeting.innerText = "Good Afternoon, Sir.";
        else timeGreeting.innerText = "Good Evening, Sir.";
    }

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
            const response = await fetch(`${API_BASE}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: text, model_type: "gemini" })
            });
            const data = await response.json();
            const botText = data.response || "Error getting response";
            addMessage(botText, 'bot');
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
    
    window.addChatMessage = addMessage;

    if (chatSendBtn && chatInput) {
        chatSendBtn.addEventListener('click', sendMessage);
        chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
    }

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
            if (chatInput) {
                chatInput.value = transcript;
                sendMessage(); 
            }
        };

        recognition.onend = () => { stopListeningUI(); };
        recognition.onerror = () => { stopListeningUI(); };
    }

    function startListeningUI() {
        const statusText = document.querySelector('.ai-status-text');
        if (aiOrb) aiOrb.classList.add('speaking-anim');
        if (statusText) statusText.innerText = "Listening...";
        const globalMicBtn = document.getElementById('globalMicBtn');
        if (globalMicBtn) globalMicBtn.classList.add('active');
    }

    function stopListeningUI() {
        const statusText = document.querySelector('.ai-status-text');
        if (aiOrb) aiOrb.classList.remove('speaking-anim');
        if (statusText) statusText.innerText = "Standby";
        const globalMicBtn = document.getElementById('globalMicBtn');
        if (globalMicBtn) globalMicBtn.classList.remove('active');
    }

    window.speakResponse = async function(text) {
        console.log("Olivia Speaking:", text);
        try {
            const response = await fetch(`${API_BASE}/olivia/generate-voice`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: text })
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const audio = new Audio(url);
                audio.play();
                return;
            }
        } catch (e) {
            console.warn("ElevenLabs failed, falling back to native TTS:", e);
        }

        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.name.includes('Google UK English Female') || v.name.includes('Samantha'));
        if (preferredVoice) utterance.voice = preferredVoice;
        window.speechSynthesis.speak(utterance);
    };

    const globalMicBtn = document.getElementById('globalMicBtn');
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
                    } catch (e) { console.error(e); }
                } else {
                    alert("Speech recognition not supported.");
                }
            }
        });
    }

    // --- Wake Word Detection (Hey Olivia) ---
    let isWakeWordActive = false;
    function initWakeWord() {
        if (!('webkitSpeechRecognition' in window)) return;
        const wakeWordRecognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        wakeWordRecognition.continuous = true;
        wakeWordRecognition.interimResults = true;
        wakeWordRecognition.lang = 'en-US';

        wakeWordRecognition.onresult = (event) => {
            const transcript = Array.from(event.results).map(r => r[0].transcript).join('').toLowerCase();
            if (transcript.includes('hey olivia') || transcript.includes('olivia')) {
                wakeWordRecognition.stop(); 
                if (globalMicBtn) globalMicBtn.click(); 
            }
        };

        wakeWordRecognition.onend = () => { if (!isWakeWordActive) wakeWordRecognition.start(); };
        wakeWordRecognition.start();
    }
    
    document.addEventListener('click', () => {
        if (!isWakeWordActive) { initWakeWord(); isWakeWordActive = true; }
    }, { once: true });

    // --- IP CAMERA INTEGRATION ---
    let cameraMode = 'img';
    window.setCamMode = (mode) => {
        cameraMode = mode;
        document.getElementById('camModeImg').classList.toggle('active', mode === 'img');
        document.getElementById('camModeWeb').classList.toggle('active', mode === 'web');
        window.connectCamera();
    };

    window.onCamError = () => {
        document.getElementById('camErrorMessage').style.display = 'block';
        document.getElementById('liveCameraFeed').style.display = 'none';
    };

    window.connectCamera = () => {
        const ipInput = document.getElementById('cameraIpInput').value;
        const feedBox = document.getElementById('cameraFeedBox');
        const liveFeed = document.getElementById('liveCameraFeed');
        const liveFrame = document.getElementById('liveCameraFrame');
        const errorMsg = document.getElementById('camErrorMessage');
        
        if (ipInput) {
            feedBox.style.display = 'block';
            errorMsg.style.display = 'none';
            if (cameraMode === 'img') {
                liveFeed.src = ipInput;
                liveFeed.style.display = 'block';
                liveFrame.style.display = 'none';
            } else {
                liveFrame.src = ipInput;
                liveFrame.style.display = 'block';
                liveFeed.style.display = 'none';
            }
            window.speakResponse("Syncing with remote visual sensor.");
        }
    };
});
