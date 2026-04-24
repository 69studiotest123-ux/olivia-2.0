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
            // Hide Login, Show App
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('appContainer').style.display = 'flex';
            document.getElementById('mobileTopBar').style.display = 'flex';
            document.getElementById('globalMicBtn').style.display = 'flex';
            
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
    if (localStorage.getItem('olivia_auth') === 'true') {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('appContainer').style.display = 'flex';
        document.getElementById('mobileTopBar').style.display = 'flex';
        document.getElementById('globalMicBtn').style.display = 'flex';
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
            addMessage(data.response || "Error getting response", 'bot');
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

    if (globalMicBtn) {
        globalMicBtn.addEventListener('click', () => {
            const statusText = document.querySelector('.ai-status-text');
            if (aiOrb && aiOrb.classList.contains('speaking-anim')) {
                aiOrb.classList.remove('speaking-anim');
                if (statusText) statusText.innerText = "Standby";
            } else {
                if (aiOrb) aiOrb.classList.add('speaking-anim');
                if (statusText) statusText.innerText = "Listening...";
            }
        });
    }

    console.log("Olivia 2.0 System Online.");
});
