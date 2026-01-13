// Chat functionality for Poolify

let chatMessages = [];
let chatListener = null;

// Initialize chat
function initChat() {
    if (!poolId || !currentUser) return;
    
    // Load chat messages
    loadChatMessages();
    
    // Set up real-time listener
    setupChatListener();
}

// Load chat messages from Firestore
function loadChatMessages() {
    if (!poolId) return;
    
    const chatContainer = document.getElementById('chatMessages');
    
    db.collection('chats')
        .where('poolId', '==', poolId)
        .orderBy('timestamp', 'asc')
        .limit(50)
        .get()
        .then((snapshot) => {
            chatContainer.innerHTML = '';
            
            if (snapshot.empty) {
                // Show welcome message
                showWelcomeMessage();
                return;
            }
            
            snapshot.forEach((doc) => {
                const message = doc.data();
                message.id = doc.id;
                addMessageToUI(message);
            });
            
            // Scroll to bottom
            scrollChatToBottom();
        })
        .catch((error) => {
            console.error('Error loading chat:', error);
            chatContainer.innerHTML = '<p class="error">Error loading chat</p>';
        });
}

// Set up real-time chat listener
function setupChatListener() {
    if (!poolId) return;
    
    chatListener = db.collection('chats')
        .where('poolId', '==', poolId)
        .orderBy('timestamp', 'asc')
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const message = change.doc.data();
                    message.id = change.doc.id;
                    
                    // Check if message is already displayed
                    if (!chatMessages.some(m => m.id === message.id)) {
                        addMessageToUI(message);
                        chatMessages.push(message);
                        
                        // Scroll to bottom for new messages
                        if (isNearBottom()) {
                            scrollChatToBottom();
                        }
                        
                        // Play notification sound for new messages (optional)
                        if (message.senderId !== currentUser.uid) {
                            playNotificationSound();
                        }
                    }
                }
            });
        }, (error) => {
            console.error('Chat listener error:', error);
        });
}

// Add message to UI
function addMessageToUI(message) {
    const chatContainer = document.getElementById('chatMessages');
    
    // Remove welcome message if it exists
    const welcomeMsg = chatContainer.querySelector('.welcome-message');
    if (welcomeMsg) {
        welcomeMsg.remove();
    }
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${getMessageClass(message)}`;
    
    // Format time
    const time = message.timestamp?.toDate();
    const timeString = time ? formatChatTime(time) : 'Just now';
    
    // Get sender name
    let senderName = 'Unknown';
    if (message.senderId === 'system') {
        senderName = 'System';
    } else if (message.senderId === currentUser.uid) {
        senderName = 'You';
    } else if (message.senderName) {
        senderName = message.senderName;
    }
    
    // Create message HTML based on type
    if (message.type === 'system') {
        messageElement.innerHTML = `
            <div class="message-content">
                ${message.text}
            </div>
            <div class="message-time">${timeString}</div>
        `;
        messageElement.classList.add('system');
    } else if (message.type === 'payment') {
        messageElement.innerHTML = `
            <div class="message-sender">${senderName}</div>
            <div class="message-content">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-rupee-sign" style="font-size: 1.2rem;"></i>
                    <div>
                        <strong>Payment Request: ₹${message.amount}</strong>
                        <div style="font-size: 0.9rem;">For: ${message.paymentFor}</div>
                        <div style="font-size: 0.8rem; color: #666;">UPI: ${message.upiId}</div>
                    </div>
                </div>
                ${message.text ? `<div style="margin-top: 8px;">${message.text}</div>` : ''}
            </div>
            <div class="message-time">${timeString}</div>
        `;
    } else {
        messageElement.innerHTML = `
            <div class="message-sender">${senderName}</div>
            <div class="message-content">${message.text}</div>
            <div class="message-time">${timeString}</div>
        `;
    }
    
    chatContainer.appendChild(messageElement);
}

// Get message CSS class
function getMessageClass(message) {
    if (message.type === 'system') return 'system';
    if (message.senderId === currentUser.uid) return 'sent';
    return 'received';
}

// Send message
function sendMessage() {
    if (!poolId || !currentUser) return;
    
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    
    if (!text) return;
    
    // Create message object
    const message = {
        poolId: poolId,
        senderId: currentUser.uid,
        senderName: currentUser.name || currentUser.email.split('@')[0],
        text: text,
        type: 'text',
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Save to Firestore
    db.collection('chats').add(message)
        .then(() => {
            // Clear input
            input.value = '';
            
            // Add to local array
            chatMessages.push(message);
            
            // Scroll to bottom
            scrollChatToBottom();
        })
        .catch((error) => {
            console.error('Error sending message:', error);
            alert('Error sending message');
        });
}

// Send quick message
function sendQuickMessage(text) {
    document.getElementById('chatInput').value = text;
    sendMessage();
}

// Send system message (for pool events)
function sendSystemMessage(text) {
    if (!poolId) return;
    
    const message = {
        poolId: poolId,
        senderId: 'system',
        text: text,
        type: 'system',
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    db.collection('chats').add(message);
}

// Handle Enter key in chat
function handleChatKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// Send payment request
function sendPaymentRequest() {
    document.getElementById('paymentModal').style.display = 'block';
}

function sendPayment() {
    const amount = document.getElementById('paymentAmount').value;
    const paymentFor = document.getElementById('paymentFor').value;
    const upiId = document.getElementById('upiId').value;
    
    if (!amount || !paymentFor || !upiId) {
        alert('Please fill all fields');
        return;
    }
    
    if (!poolId || !currentUser) return;
    
    const message = {
        poolId: poolId,
        senderId: currentUser.uid,
        senderName: currentUser.name || currentUser.email.split('@')[0],
        text: `Payment request sent for ₹${amount}`,
        type: 'payment',
        amount: amount,
        paymentFor: paymentFor,
        upiId: upiId,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    db.collection('chats').add(message)
        .then(() => {
            closeModal('paymentModal');
            alert('Payment request sent!');
        })
        .catch((error) => {
            console.error('Error sending payment request:', error);
            alert('Error sending payment request');
        });
}

// Scroll chat to bottom
function scrollChatToBottom() {
    const chatContainer = document.getElementById('chatMessages');
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Check if chat is near bottom
function isNearBottom() {
    const chatContainer = document.getElementById('chatMessages');
    const threshold = 100; // pixels from bottom
    return chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < threshold;
}

// Format chat time
function formatChatTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// Show welcome message
function showWelcomeMessage() {
    const chatContainer = document.getElementById('chatMessages');
    chatContainer.innerHTML = `
        <div class="welcome-message">
            <div class="welcome-icon">
                <i class="fas fa-users"></i>
            </div>
            <h4>Welcome to Pool Chat!</h4>
            <p>Coordinate items, split payments, and plan delivery here.</p>
            <div class="chat-tips">
                <p><strong>Tips:</strong></p>
                <ul>
                    <li>Share your UPI ID for payment</li>
                    <li>Confirm delivery location</li>
                    <li>Discuss who will place the order</li>
                    <li>Use quick buttons for common messages</li>
                </ul>
            </div>
        </div>
    `;
}

// Play notification sound
function playNotificationSound() {
    // Simple notification sound
    const audio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==');
    audio.volume = 0.3;
    audio.play().catch(() => {
        // Audio play failed, ignore
    });
}

// Update chat header with pool info
function updateChatHeader() {
    if (!poolData) return;
    
    const joinedUsers = poolData.joinedUsers?.length || 1;
    document.getElementById('onlineCount').textContent = `${joinedUsers} joined`;
}

// Toggle chat info
function toggleChatInfo() {
    alert(`Pool Chat Info\n\nPlatform: ${poolData.platform}\nMembers: ${poolData.joinedUsers?.length || 1}\nStatus: ${poolData.status}`);
}

// Toggle emoji picker (placeholder)
function toggleEmoji() {
    alert('Emoji picker coming soon!');
}

// Attach image (placeholder)
function attachImage() {
    alert('Image attachment coming soon!');
}

// Clean up chat listener
function cleanupChat() {
    if (chatListener) {
        chatListener();
        chatListener = null;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize chat after a short delay
    setTimeout(initChat, 1000);
});

// Clean up on page unload
window.addEventListener('beforeunload', cleanupChat);