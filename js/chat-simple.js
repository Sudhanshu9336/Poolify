// Simple Chat System for Poolify
console.log("💬 Simple Chat JS loaded");

let currentPoolId = null;
let currentUser = null;

// Open chat in modal
function openChatModal(poolId, poolName = "Pool Chat") {
    console.log("Opening chat for pool:", poolId);
    currentPoolId = poolId;
    
    // Set pool name
    document.getElementById('chatPoolName').textContent = poolName;
    
    // Load chat messages
    loadChatMessages(poolId);
    
    // Show modal
    document.getElementById('chatModal').style.display = 'block';
    
    // Focus on input
    setTimeout(() => {
        document.getElementById('chatMessageInput').focus();
    }, 100);
}

// Close chat modal
function closeChatModal() {
    document.getElementById('chatModal').style.display = 'none';
    currentPoolId = null;
}

// Load chat messages
function loadChatMessages(poolId) {
    const key = `poolify_chat_${poolId}`;
    const savedMessages = localStorage.getItem(key);
    
    let messages = [];
    
    if (savedMessages) {
        messages = JSON.parse(savedMessages);
    } else {
        // Demo messages
        messages = [
            {
                id: 'msg1',
                type: 'system',
                text: 'Welcome to the pool chat! Coordinate items, payment, and delivery here.',
                time: '2:30 PM'
            },
            {
                id: 'msg2',
                type: 'other',
                user: 'Rahul',
                text: 'Hi everyone! I need milk and bread urgently.',
                time: '2:32 PM'
            },
            {
                id: 'msg3',
                type: 'other',
                user: 'Priya',
                text: "I'll join! I need eggs and chips.",
                time: '2:35 PM'
            }
        ];
        
        localStorage.setItem(key, JSON.stringify(messages));
    }
    
    displayChatMessages(messages);
}

// Display chat messages
function displayChatMessages(messages) {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    
    let html = '';
    
    messages.forEach(msg => {
        if (msg.type === 'system') {
            html += `
                <div class="chat-message system">
                    <div class="message-content">
                        <p>${msg.text}</p>
                        <span class="message-time">${msg.time}</span>
                    </div>
                </div>
            `;
        } else if (msg.type === 'me') {
            html += `
                <div class="chat-message me">
                    <div class="message-header">
                        <strong>${msg.user || 'You'}</strong>
                        <span class="message-time">${msg.time}</span>
                    </div>
                    <div class="message-content">
                        <p>${msg.text}</p>
                    </div>
                </div>
            `;
        } else {
            html += `
                <div class="chat-message other">
                    <div class="message-header">
                        <strong>${msg.user}</strong>
                        <span class="message-time">${msg.time}</span>
                    </div>
                    <div class="message-content">
                        <p>${msg.text}</p>
                    </div>
                </div>
            `;
        }
    });
    
    container.innerHTML = html;
    
    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

// Send message
function sendChatMessage() {
    const input = document.getElementById('chatMessageInput');
    const text = input.value.trim();
    
    if (!text || !currentPoolId) return;
    
    // Get user
    const userData = localStorage.getItem('poolify_user');
    const userName = userData ? JSON.parse(userData).name || 'You' : 'You';
    
    // Create message
    const newMessage = {
        id: 'msg_' + Date.now(),
        type: 'me',
        user: userName,
        text: text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    // Save to localStorage
    const key = `poolify_chat_${currentPoolId}`;
    let messages = JSON.parse(localStorage.getItem(key) || '[]');
    messages.push(newMessage);
    localStorage.setItem(key, JSON.stringify(messages));
    
    // Display
    displayChatMessages(messages);
    
    // Clear input
    input.value = '';
    input.focus();
    
    // Auto reply (demo)
    setTimeout(() => sendAutoReply(messages), 1500);
}

// Auto reply
function sendAutoReply(currentMessages) {
    if (!currentPoolId) return;
    
    const replies = [
        { user: 'Rahul', text: 'Sounds good!' },
        { user: 'Priya', text: 'I agree!' },
        { user: 'Amit', text: 'Delivery at hostel gate?' },
        { user: 'Neha', text: 'Cash payment works for me' }
    ];
    
    const randomReply = replies[Math.floor(Math.random() * replies.length)];
    
    const autoMessage = {
        id: 'auto_' + Date.now(),
        type: 'other',
        user: randomReply.user,
        text: randomReply.text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    currentMessages.push(autoMessage);
    
    const key = `poolify_chat_${currentPoolId}`;
    localStorage.setItem(key, JSON.stringify(currentMessages));
    displayChatMessages(currentMessages);
}

// Quick message buttons
function sendQuickMessage(text) {
    document.getElementById('chatMessageInput').value = text;
    sendChatMessage();
}

// Make functions global
window.openChatModal = openChatModal;
window.closeChatModal = closeChatModal;
window.sendChatMessage = sendChatMessage;
window.sendQuickMessage = sendQuickMessage;

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('chatModal');
    if (event.target === modal) {
        closeChatModal();
    }
};