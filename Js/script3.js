/* =========================================================
   AI PORTFOLIO ASSISTANT
   ========================================================= */

const GEMINI_API_KEY = "AIzaSyAZvg7xt7gfyqv4YWy7vGGqwmlsodioTjU";
const OPENROUTER_API_KEY = "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";
const MODELS = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite"];

// UI Elements
const chatBtn = document.getElementById("ai-chat-btn");
const chatWindow = document.getElementById("ai-chat-window");
const chatClose = document.getElementById("ai-chat-close");
const chatMessages = document.getElementById("ai-chat-messages");
const chatInput = document.getElementById("ai-chat-input");
const chatSend = document.getElementById("ai-chat-send");
const statusDot = document.getElementById("ai-status-dot");

// State
let chatHistory = [];
const SYSTEM_PROMPT = "You are Aniket's personal AI assistant on his portfolio website. Aniket is a programmer who builds whatever feels fun. He knows Python, JavaScript, HTML/CSS, C++, Godot, Blender, and Three.js. He is currently building his portfolio and working on projects like 'Lecture Hub' (a study dashboard) and an 'AI Doubt Assistant'. Keep your answers brief, friendly, and professional. Do not break character.";

/* ---------- Online/Offline Status ---------- */
function updateOnlineStatus() {
    if (navigator.onLine) {
        statusDot.classList.remove("offline");
        statusDot.title = "Online & Ready";
    } else {
        statusDot.classList.add("offline");
        statusDot.title = "Offline - No Internet Connection";
    }
}
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus(); // Run on load

/* ---------- Toggle Window ---------- */
chatBtn.addEventListener("click", () => {
  chatWindow.classList.toggle("is-open");
  if (chatWindow.classList.contains("is-open") && chatInput.value === "") {
    setTimeout(() => chatInput.focus(), 300);
  }
});
chatClose.addEventListener("click", () => chatWindow.classList.remove("is-open"));

/* ---------- UI Helpers ---------- */
function addMessageToUI(text, sender) {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("ai-msg", sender);
  msgDiv.textContent = text;
  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return msgDiv;
}

function addTypingIndicator() {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("ai-msg", "ai", "typing");
  msgDiv.innerHTML = `<span class="dot"></span><span class="dot"></span><span class="dot"></span>`;
  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return msgDiv;
}

/* ---------- Send Message ---------- */
async function handleSend() {
  const text = chatInput.value.trim();
  if (!text) return;

  chatInput.value = "";
  addMessageToUI(text, "user");

  chatHistory.push({ role: "user", parts: [{ text }] });

  // Add bouncing dots
  const typingIndicator = addTypingIndicator();

  try {
    if (!navigator.onLine) {
      throw new Error("You are offline. Please check your internet connection.");
    }

    let responseText = "";
    
    // Try OpenRouter First (Usually faster and free)
    try {
        responseText = await fetchOpenRouterResponse();
    } catch (err) {
        console.warn("OpenRouter failed, trying Gemini...", err);
        responseText = await fetchFromGemini();
    }

    // Remove typing indicator and add real message
    typingIndicator.remove();
    addMessageToUI(responseText, "ai");
    
    chatHistory.push({ role: "model", parts: [{ text: responseText }] });

  } catch (error) {
    console.error(error);
    typingIndicator.remove();
    addMessageToUI("⚠️ " + error.message, "ai");
  }
}

/* ---------- API Calls ---------- */
async function fetchFromGemini() {
    const payload = {
        contents: [
            { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
            ...chatHistory
        ],
        generationConfig: { maxOutputTokens: 1024 }
    };

    let lastError = new Error("Unknown error");

    for (const model of MODELS) {
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
            
            const parts = data.candidates?.[0]?.content?.parts;
            if (!parts) throw new Error("Empty response");
            return parts.map(p => p.text || '').join('');
        } catch (e) {
            lastError = e;
            continue; // Try next model
        }
    }
    throw lastError;
}

async function fetchOpenRouterResponse() {
    const messages = [
        { role: "system", content: SYSTEM_PROMPT },
        ...chatHistory.map(turn => ({
            role: turn.role === "model" ? "assistant" : "user",
            content: turn.parts[0].text
        }))
    ];

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + OPENROUTER_API_KEY
        },
        body: JSON.stringify({ 
            model: "openrouter/free", 
            messages,
            max_tokens: 1024
        })
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error("Empty response");
    return text;
}

/* ---------- Event Listeners ---------- */
chatSend.addEventListener("click", handleSend);
chatInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") handleSend();
});