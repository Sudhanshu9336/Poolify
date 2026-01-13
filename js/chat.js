// Chat System for Poolify
console.log("💬 Chat JS loaded");

// Global variables
let currentPoolId = null;
let currentUser = null;
let chatMessages = [];
let chatInterval = null;

// Initialize chat system
function initChat(poolId) {
    console.log("Initializing chat for pool:", poolId);
    currentPoolId = poolId;
    
    // Get current user
    const userData = localStorage.getItem('poolify_user');
    if (userData) {
        currentUser = JSON.parse(userData);
    } else {
        currentUser = { name: "Guest", email: "guest@poolify.com" };
    }
    
    // Load existing messages
    loadChatMessages();
    
    // Setup event listeners
    setupChatListeners();
    
    // Start real-time updates (simulated)
    startChatUpdates();
}

// Load chat messages from localStorage
function loadChatMessages() {
    if (!currentPoolId) return;
    
    // Try to load from localStorage
    const key = `poolify_chat_${currentPoolId}`;
    const savedMessages = localStorage.getItem(key);
    
    if (savedMessages) {
        chatMessages = JSON.parse(savedMessages);
    } else {
        // Create initial demo messages
        chatMessages = [
            {
                id: 'msg1',
                userId: 'system',
                userName: 'System',
                text: 'Welcome to the pool chat! Add your items and coordinate with others.',
                timestamp: new Date(Date.now() - 30 * 60000).toISOString(), // 30 mins ago
                type: 'system'
            },
            {
                id: 'msg2',
                userId: 'creator',
                userName: 'Rahul',
                text: 'Hi everyone! I need milk and bread urgently. Who wants to join?',
                timestamp: new Date(Date.now() - 25 * 60000).toISOString(), // 25 mins ago
                type: 'message'
            },
            {
                id: 'msg3',
                userId: 'user2',
                userName: 'Priya',
                text: 'I\'ll join! I need eggs and chips. Cash payment okay?',
                timestamp: new Date(Date.now() - 20 * 60000).toISOString(), // 20 mins ago
                type: 'message'
            },
            {
                id: 'msg4',
                userId: 'system',
                userName: 'System',
                text: 'Priya joined the pool',
                timestamp: new Date(Date.now() - 19 * 60000).toISOString(), // 19 mins ago
                type: 'system'
            }
        ];
        
        // Save to localStorage
        localStorage.setItem(key, JSON.stringify(chatMessages));
    }
    
    // Display messages
    displayMessages();
}

// Display messages in chat container
function displayMessages() {
    const chatContainer = document.getElementById('chatMessages');
    if (!chatContainer) return;
    
    // Clear container
    chatContainer.innerHTML = '';
    
    // Sort messages by timestamp
    chatMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Add each message
    chatMessages.forEach((msg, index) => {
        const messageElement = createMessageElement(msg, index);
        chatContainer.appendChild(messageElement);
    });
    
    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Create message element
function createMessageElement(msg, index) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';
    
    // Check if message is from current user
    const isCurrentUser = msg.userId === (currentUser?.uid || currentUser?.email);
    const isSystem = msg.type === 'system';
    
    if (isSystem) {
        // System message
        messageDiv.className = 'system-message';
        messageDiv.innerHTML = `
            <div class="message-content">
                <p>${msg.text}</p>
                <span class="message-time">${formatTime(msg.timestamp)}</span>
            </div>
        `;
    } else {
        // User message
        messageDiv.className = isCurrentUser ? 'my-message' : 'other-message';
        messageDiv.innerHTML = `
            <div class="message-header">
                <div class="message-sender">${msg.userName}</div>
                <div class="message-time">${formatTime(msg.timestamp)}</div>
            </div>
            <div class="message-content">
                <p>${msg.text}</p>
            </div>
        `;
    }
    
    return messageDiv;
}

// Format time for display
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    
    // Return date if older than 1 day
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// Setup chat event listeners
function setupChatListeners() {
    const chatInput = document.getElementById('chatInput');
    const sendButton = document.getElementById('sendMessageBtn');
    
    if (chatInput && sendButton) {
        // Send on button click
        sendButton.addEventListener('click', sendMessage);
        
        // Send on Enter key
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
    
    // Setup quick actions
    setupQuickActions();
}

// Send message
function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    if (!chatInput) return;
    
    const messageText = chatInput.value.trim();
    if (!messageText) return;
    
    // Create new message
    const newMessage = {
        id: 'msg_' + Date.now(),
        userId: currentUser?.uid || currentUser?.email,
        userName: currentUser?.name || currentUser?.email.split('@')[0],
        text: messageText,
        timestamp: new Date().toISOString(),
        type: 'message'
    };
    
    // Add to messages array
    chatMessages.push(newMessage);
    
    // Save to localStorage
    const key = `poolify_chat_${currentPoolId}`;
    localStorage.setItem(key, JSON.stringify(chatMessages));
    
    // Display message
    displayMessages();
    
    // Clear input
    chatInput.value = '';
    chatInput.focus();
    
    // Simulate auto-reply if it's a question
    if (messageText.includes('?')) {
        setTimeout(() => sendAutoReply(messageText), 1500);
    }
}

// Send auto-reply (demo feature)
function sendAutoReply(userMessage) {
    if (!currentPoolId) return;
    
    const replies = {
        'payment': ['Cash works for me!', 'I prefer UPI', 'We can split equally'],
        'delivery': ['Delivery at hostel gate?', 'My room number is 205', '15 minutes okay?'],
        'items': ['I\'ll add that too!', 'Can someone get cold drinks?', 'Need anything else?'],
        'time': ['Order in 10 minutes?', 'I need it urgently', 'Whenever everyone is ready']
    };
    
    // Determine reply type
    let replyType = 'general';
    if (userMessage.toLowerCase().includes('pay')) replyType = 'payment';
    else if (userMessage.toLowerCase().includes('deliver')) replyType = 'delivery';
    else if (userMessage.toLowerCase().includes('item')) replyType = 'items';
    else if (userMessage.toLowerCase().includes('when') || userMessage.toLowerCase().includes('time')) replyType = 'time';
    
    const replyOptions = replies[replyType] || ['Sounds good!', 'I agree', 'Let\'s do it!'];
    const randomReply = replyOptions[Math.floor(Math.random() * replyOptions.length)];
    
    // Get a random user from pool (not current user)
    const demoUsers = ['Rahul', 'Priya', 'Amit', 'Neha'];
    const randomUser = demoUsers[Math.floor(Math.random() * demoUsers.length)];
    
    // Create auto-reply
    const autoReply = {
        id: 'auto_' + Date.now(),
        userId: 'demo_' + randomUser.toLowerCase(),
        userName: randomUser,
        text: randomReply,
        timestamp: new Date().toISOString(),
        type: 'message'
    };
    
    // Add to messages
    chatMessages.push(autoReply);
    
    // Save and display
    const key = `poolify_chat_${currentPoolId}`;
    localStorage.setItem(key, JSON.stringify(chatMessages));
    displayMessages();
}

// Setup quick action buttons
function setupQuickActions() {
    const quickActions = document.querySelectorAll('.quick-action');
    quickActions.forEach(button => {
        button.addEventListener('click', function() {
            const action = this.dataset.action;
            sendQuickMessage(action);
        });
    });
}

// Send quick message
function sendQuickMessage(action) {
    const messages = {
        'join': 'I\'m joining the pool! What items do you need?',
        'items': 'Added my items. Can someone get cold drinks?',
        'payment': 'Cash payment works for me. How should we split?',
        'delivery': 'Delivery at hostel gate okay?',
        'ready': 'Ready to order whenever everyone is set!',
        'urgent': 'Need this urgently. Can we order soon?'
    };
    
    const messageText = messages[action] || action;
    
    // Set in input
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.value = messageText;
        chatInput.focus();
    }
}

// Start simulated real-time updates
function startChatUpdates() {
    if (chatInterval) clearInterval(chatInterval);
    
    // Simulate new messages every 30 seconds
    chatInterval = setInterval(() => {
        simulateNewMessage();
    }, 30000); // 30 seconds
}

// Simulate new message from other users
function simulateNewMessage() {
    if (!currentPoolId || Math.random() > 0.3) return; // 30% chance
    
    const demoMessages = [
        'Anyone else joining?',
        'What\'s the total cost looking like?',
        'Should we add some snacks?',
        'Delivery in how many minutes?',
        'I can pay via UPI',
        'My room is on the 3rd floor'
    ];
    
    const demoUsers = ['Rahul', 'Priya', 'Amit', 'Neha'];
    const randomUser = demoUsers[Math.floor(Math.random() * demoUsers.length)];
    const randomMessage = demoMessages[Math.floor(Math.random() * demoMessages.length)];
    
    // Don't simulate if last message was from same user recently
    if (chatMessages.length > 0) {
        const lastMsg = chatMessages[chatMessages.length - 1];
        if (lastMsg.userName === randomUser && 
            (new Date() - new Date(lastMsg.timestamp)) < 60000) {
            return; // Same user message within 1 minute
        }
    }
    
    // Create simulated message
    const simulatedMessage = {
        id: 'sim_' + Date.now(),
        userId: 'demo_' + randomUser.toLowerCase(),
        userName: randomUser,
        text: randomMessage,
        timestamp: new Date().toISOString(),
        type: 'message'
    };
    
    // Add to messages
    chatMessages.push(simulatedMessage);
    
    // Save to localStorage
    const key = `poolify_chat_${currentPoolId}`;
    localStorage.setItem(key, JSON.stringify(chatMessages));
    
    // Display if chat is active
    if (document.getElementById('chatMessages')) {
        displayMessages();
    }
}

// Send system message (user joined, item added, etc.)
function sendSystemMessage(text) {
    if (!currentPoolId) return;
    
    const systemMessage = {
        id: 'sys_' + Date.now(),
        userId: 'system',
        userName: 'System',
        text: text,
        timestamp: new Date().toISOString(),
        type: 'system'
    };
    
    // Add to messages
    chatMessages.push(systemMessage);
    
    // Save to localStorage
    const key = `poolify_chat_${currentPoolId}`;
    localStorage.setItem(key, JSON.stringify(chatMessages));
    
    // Display if chat is active
    if (document.getElementById('chatMessages')) {
        displayMessages();
    }
}

// Clean up chat
function cleanupChat() {
    if (chatInterval) {
        clearInterval(chatInterval);
        chatInterval = null;
    }
    currentPoolId = null;
}

// Export functions for global use
window.initChat = initChat;
window.sendMessage = sendMessage;
window.sendSystemMessage = sendSystemMessage;
window.cleanupChat = cleanupChat;