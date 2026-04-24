document.addEventListener('DOMContentLoaded', () => {
    
    // --- Navigation Logic ---
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active classes
            navItems.forEach(n => n.classList.remove('active'));
            views.forEach(v => v.classList.remove('active'));
            
            // Add active class to clicked item
            item.classList.add('active');
            
            // Show corresponding view
            const target = item.getAttribute('data-target');
            document.getElementById(`${target}-view`).classList.add('active');
        });
    });

    // --- Time Greeting Logic ---
    const timeGreeting = document.getElementById('timeGreeting');
    const hour = new Date().getHours();
    if (hour < 12) timeGreeting.innerText = "Good Morning, Sir.";
    else if (hour < 18) timeGreeting.innerText = "Good Afternoon, Sir.";
    else timeGreeting.innerText = "Good Evening, Sir.";

    // --- Chat Logic ---
    const chatInput = document.getElementById('chatInput');
    const chatSendBtn = document.getElementById('chatSendBtn');
    const chatMessages = document.getElementById('chatMessages');

    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        // Add user message to UI
        addMessage(text, 'user');
        chatInput.value = '';

        // Show typing indicator or orb animation
        const aiOrb = document.getElementById('aiOrb');
        aiOrb.classList.add('speaking-anim');
        document.querySelector('.ai-status-text').innerText = "Processing...";

        try {
            // Call Python Backend
            const response = await fetch("http://84.235.242.22:8000/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: text, model_type: "gemini" })
            });
            const data = await response.json();
            
            // Add bot response to UI
            addMessage(data.response || "Error getting response", 'bot');
        } catch (error) {
            console.error("Backend error:", error);
            addMessage("Sir, I cannot reach the main server at the moment.", 'bot');
        } finally {
            aiOrb.classList.remove('speaking-anim');
            document.querySelector('.ai-status-text').innerText = "Standby";
        }
    }

    function addMessage(text, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender}`;
        
        const avatar = sender === 'user' ? '<i class="fa-solid fa-user"></i>' : '<img src="olivia.png" alt="O">';
        
        msgDiv.innerHTML = `
            <div class="msg-avatar">${avatar}</div>
            <div class="msg-bubble">${text}</div>
        `;
        
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll
    }

    chatSendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // --- Voice Action Logic (Mock) ---
    const globalMicBtn = document.getElementById('globalMicBtn');
    const aiOrb = document.getElementById('aiOrb');

    globalMicBtn.addEventListener('click', () => {
        const statusText = document.querySelector('.ai-status-text');
        
        if (aiOrb.classList.contains('speaking-anim')) {
            aiOrb.classList.remove('speaking-anim');
            statusText.innerText = "Standby";
        } else {
            aiOrb.classList.add('speaking-anim');
            statusText.innerText = "Listening...";
            // Here you would integrate Web Speech API or ElevenLabs / Whisper
        }
    });

});

// --- Quick Actions ---
async function triggerAction(actionName) {
    console.log(`Triggering action: ${actionName}`);
    try {
        await fetch(`http://84.235.242.22:8000/control/scene/${actionName}`);
        alert(`${actionName} command sent to Cloud Brain.`);
    } catch(e) {
        alert("Failed to send command. Ensure backend is running.");
    }
}
