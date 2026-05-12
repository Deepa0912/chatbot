// ===== DOM Elements =====
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const welcomeScreen = document.getElementById('welcomeScreen');
const newChatBtn = document.getElementById('newChatBtn');
const clearChatBtn = document.getElementById('clearChatBtn');
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const bgParticles = document.getElementById('bgParticles');
const micBtn = document.getElementById('micBtn');
const voiceToggleBtn = document.getElementById('voiceToggleBtn');

// ===== State =====
let isLoading = false;
let isRecording = false;
let voiceOutputEnabled = true;
let recognition = null;
let currentUtterance = null;

// ===== Background Particles =====
function createParticles() {
    const colors = ['rgba(108, 99, 255, 0.15)', 'rgba(0, 210, 255, 0.1)', 'rgba(139, 131, 255, 0.08)'];
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        const size = Math.random() * 4 + 2;
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];
        particle.style.animationDuration = (Math.random() * 20 + 15) + 's';
        particle.style.animationDelay = (Math.random() * 10) + 's';
        bgParticles.appendChild(particle);
    }
}
createParticles();

// ===== Speech Recognition Setup =====
function setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        micBtn.style.display = 'none';
        console.warn('Speech Recognition not supported in this browser.');
        return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        isRecording = true;
        micBtn.classList.add('recording');
        messageInput.placeholder = '🎤 Listening...';
    };

    recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }
        messageInput.value = transcript;
        sendBtn.disabled = !transcript.trim();

        // Auto-resize textarea
        messageInput.style.height = 'auto';
        messageInput.style.height = Math.min(messageInput.scrollHeight, 200) + 'px';
    };

    recognition.onend = () => {
        isRecording = false;
        micBtn.classList.remove('recording');
        messageInput.placeholder = 'Message ChatBot...';

        // Auto-send if we have text
        if (messageInput.value.trim()) {
            sendMessage();
        }
    };

    recognition.onerror = (event) => {
        isRecording = false;
        micBtn.classList.remove('recording');
        messageInput.placeholder = 'Message ChatBot...';

        if (event.error === 'no-speech') {
            // Silently ignore no-speech
        } else if (event.error === 'not-allowed') {
            alert('Microphone access denied. Please allow microphone permissions in your browser.');
        } else {
            console.error('Speech recognition error:', event.error);
        }
    };
}

setupSpeechRecognition();

// ===== Mic Button =====
micBtn.addEventListener('click', () => {
    if (!recognition) {
        alert('Speech recognition is not supported in your browser. Try Chrome or Edge.');
        return;
    }

    if (isRecording) {
        recognition.stop();
    } else {
        // Stop any ongoing speech output
        speechSynthesis.cancel();
        recognition.start();
    }
});

// ===== Voice Output Toggle =====
voiceToggleBtn.classList.add('voice-active');

voiceToggleBtn.addEventListener('click', () => {
    voiceOutputEnabled = !voiceOutputEnabled;

    if (voiceOutputEnabled) {
        voiceToggleBtn.classList.add('voice-active');
        voiceToggleBtn.classList.remove('voice-muted');
        voiceToggleBtn.title = 'Voice output ON (click to mute)';
    } else {
        voiceToggleBtn.classList.remove('voice-active');
        voiceToggleBtn.classList.add('voice-muted');
        voiceToggleBtn.title = 'Voice output OFF (click to enable)';
        speechSynthesis.cancel();
    }
});

// ===== Text-to-Speech =====
function speakText(text, btn) {
    // Strip markdown for cleaner speech
    const cleanText = text
        .replace(/```[\s\S]*?```/g, 'code block omitted')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/^#{1,3}\s/gm, '')
        .replace(/^[>\-\*]\s/gm, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .trim();

    if (!cleanText) return;

    // Cancel any ongoing speech
    speechSynthesis.cancel();

    // Remove speaking class from all buttons
    document.querySelectorAll('.speak-btn.speaking').forEach(b => b.classList.remove('speaking'));

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    // Try to pick a good voice
    const voices = speechSynthesis.getVoices();
    const preferred = voices.find(v =>
        v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Natural')
    ) || voices.find(v => v.lang.startsWith('en')) || voices[0];
    if (preferred) utterance.voice = preferred;

    if (btn) {
        btn.classList.add('speaking');
        btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg> Stop`;
    }

    utterance.onend = () => {
        if (btn) {
            btn.classList.remove('speaking');
            btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg> Listen`;
        }
        currentUtterance = null;
    };

    currentUtterance = utterance;
    speechSynthesis.speak(utterance);
}

// Load voices (they load async in some browsers)
speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();

// ===== Auto-resize textarea =====
messageInput.addEventListener('input', () => {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 200) + 'px';
    sendBtn.disabled = !messageInput.value.trim();
});

// ===== Send on Enter (Shift+Enter for newline) =====
messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!sendBtn.disabled && !isLoading) {
            sendMessage();
        }
    }
});

sendBtn.addEventListener('click', () => {
    if (!isLoading) sendMessage();
});

// ===== Suggestion Cards =====
document.querySelectorAll('.suggestion-card').forEach(card => {
    card.addEventListener('click', () => {
        const message = card.getAttribute('data-message');
        messageInput.value = message;
        sendBtn.disabled = false;
        sendMessage();
    });
});

// ===== New Chat / Clear =====
newChatBtn.addEventListener('click', clearChat);
clearChatBtn.addEventListener('click', clearChat);

async function clearChat() {
    speechSynthesis.cancel();

    try {
        await fetch('/clear', { method: 'POST' });
    } catch (e) { /* ignore */ }

    const messages = messagesContainer.querySelectorAll('.message');
    messages.forEach(msg => msg.remove());

    if (welcomeScreen) {
        welcomeScreen.style.display = 'flex';
    }

    sidebar.classList.remove('open');
    removeOverlay();
}

// ===== Mobile Sidebar =====
menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    if (sidebar.classList.contains('open')) {
        createOverlay();
    } else {
        removeOverlay();
    }
});

function createOverlay() {
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.classList.add('sidebar-overlay');
        document.body.appendChild(overlay);
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            removeOverlay();
        });
    }
    setTimeout(() => overlay.classList.add('active'), 10);
}

function removeOverlay() {
    const overlay = document.querySelector('.sidebar-overlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

// ===== Send Message =====
async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || isLoading) return;

    isLoading = true;

    if (welcomeScreen) {
        welcomeScreen.style.display = 'none';
    }

    appendMessage('user', text);

    messageInput.value = '';
    messageInput.style.height = 'auto';
    sendBtn.disabled = true;

    const typingEl = appendTypingIndicator();

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });

        const data = await response.json();
        typingEl.remove();

        if (data.error) {
            appendMessage('assistant', '⚠️ Error: ' + data.error);
        } else {
            appendMessage('assistant', data.reply);

            // Auto speak if voice output is enabled
            if (voiceOutputEnabled) {
                speakText(data.reply, null);
            }
        }
    } catch (error) {
        typingEl.remove();
        appendMessage('assistant', '⚠️ Connection error. Please try again.');
    }

    isLoading = false;
    scrollToBottom();
}

// ===== Append Message =====
function appendMessage(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', role);

    const avatarContent = role === 'user'
        ? 'You'
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="url(#grad3)" opacity="0.9"/>
            <path d="M2 17L12 22L22 17" stroke="url(#grad3)" stroke-width="2" stroke-linecap="round"/>
            <path d="M2 12L12 17L22 12" stroke="url(#grad3)" stroke-width="2" stroke-linecap="round"/>
            <defs><linearGradient id="grad3" x1="2" y1="2" x2="22" y2="22">
            <stop offset="0%" stop-color="#6C63FF"/><stop offset="100%" stop-color="#00D2FF"/>
            </linearGradient></defs></svg>`;

    const formattedContent = role === 'assistant' ? formatMarkdown(content) : escapeHtml(content);

    // Add speaker button for assistant messages
    const actionsHtml = role === 'assistant'
        ? `<div class="message-actions">
            <button class="speak-btn" onclick="handleSpeakClick(this, ${JSON.stringify(content).replace(/"/g, '&quot;')})">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                </svg> Listen
            </button>
           </div>`
        : '';

    messageDiv.innerHTML = `
        <div class="message-inner">
            <div class="message-avatar">${avatarContent}</div>
            <div class="message-content">
                ${formattedContent}
                ${actionsHtml}
            </div>
        </div>
    `;

    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
    return messageDiv;
}

// ===== Handle Speak Click =====
function handleSpeakClick(btn, text) {
    if (btn.classList.contains('speaking')) {
        speechSynthesis.cancel();
        btn.classList.remove('speaking');
        btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg> Listen`;
    } else {
        speakText(text, btn);
    }
}

// ===== Typing Indicator =====
function appendTypingIndicator() {
    const div = document.createElement('div');
    div.classList.add('message', 'assistant');
    div.innerHTML = `
        <div class="message-inner">
            <div class="message-avatar">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="url(#grad4)" opacity="0.9"/>
                    <path d="M2 17L12 22L22 17" stroke="url(#grad4)" stroke-width="2" stroke-linecap="round"/>
                    <path d="M2 12L12 17L22 12" stroke="url(#grad4)" stroke-width="2" stroke-linecap="round"/>
                    <defs><linearGradient id="grad4" x1="2" y1="2" x2="22" y2="22">
                    <stop offset="0%" stop-color="#6C63FF"/><stop offset="100%" stop-color="#00D2FF"/>
                    </linearGradient></defs>
                </svg>
            </div>
            <div class="message-content">
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        </div>
    `;
    messagesContainer.appendChild(div);
    scrollToBottom();
    return div;
}

// ===== Markdown Formatter =====
function formatMarkdown(text) {
    let html = escapeHtml(text);

    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
        return `<pre><code>${code.trim()}</code></pre>`;
    });

    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

    html = html.replace(/^[•\-\*] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
    html = html.replace(/<\/ul>\s*<ul>/g, '');

    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');
    html = '<p>' + html + '</p>';

    html = html.replace(/<p>\s*<\/p>/g, '');
    html = html.replace(/<p>\s*(<h[1-3]>)/g, '$1');
    html = html.replace(/(<\/h[1-3]>)\s*<\/p>/g, '$1');
    html = html.replace(/<p>\s*(<pre>)/g, '$1');
    html = html.replace(/(<\/pre>)\s*<\/p>/g, '$1');
    html = html.replace(/<p>\s*(<ul>)/g, '$1');
    html = html.replace(/(<\/ul>)\s*<\/p>/g, '$1');
    html = html.replace(/<p>\s*(<blockquote>)/g, '$1');
    html = html.replace(/(<\/blockquote>)\s*<\/p>/g, '$1');

    return html;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== Scroll =====
function scrollToBottom() {
    requestAnimationFrame(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
}
