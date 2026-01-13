// Dashboard JavaScript
console.log("📊 Dashboard JS loaded");

// Global variables
let currentUser = null;
let poolsData = [];

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log("Dashboard initialized");
    
    // Check if user is logged in
    const userData = localStorage.getItem('poolify_user');
    if (!userData) {
        alert('Please login first');
        window.location.href = 'login.html';
        return;
    }
    
    currentUser = JSON.parse(userData);
    console.log("Current user:", currentUser);
    
    // Initialize dashboard
    initDashboard();
});

// Initialize Dashboard Functions
function initDashboard() {
    loadUserProfile();
    loadActivePools();
    updateStats();
    setupEventListeners();
}

// Load user profile
function loadUserProfile() {
    if (!currentUser) return;
    
    const userName = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');
    const userLocation = document.getElementById('userLocation');
    
    if (userName) {
        userName.textContent = currentUser.name || currentUser.email.split('@')[0];
    }
    
    if (userAvatar) {
        const name = currentUser.name || currentUser.email;
        userAvatar.textContent = name.charAt(0).toUpperCase();
    }
    
    if (userLocation) {
        userLocation.textContent = `Hostel: ${currentUser.hostel || 'Not set'}`;
    }
}

// Load active pools with timers
function loadActivePools() {
    console.log("Loading active pools...");
    const poolsContainer = document.getElementById('poolsContainer');
    const noPoolsMessage = document.getElementById('noPoolsMessage');
    
    if (!poolsContainer) {
        console.error("Pools container not found");
        return;
    }
    
    // Show loading state
    poolsContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; grid-column: 1/-1;">
            <div class="spinner"></div>
            <p>Loading active pools near you...</p>
        </div>
    `;
    
    // Try to load from localStorage first
    let pools = JSON.parse(localStorage.getItem('poolify_pools') || '[]');
    
    // Filter active pools (not expired)
    const now = new Date();
    poolsData = pools.filter(pool => {
        if (!pool.expiresAt) return false;
        const expiresAt = new Date(pool.expiresAt);
        return expiresAt > now;
    });
    
    // If no pools in localStorage, use demo data
    if (poolsData.length === 0) {
        console.log("No pools found, loading demo data");
        loadDemoPools();
        return;
    }
    
    // Clear container
    poolsContainer.innerHTML = '';
    
    if (poolsData.length === 0) {
        if (noPoolsMessage) {
            noPoolsMessage.style.display = 'block';
        }
        return;
    }
    
    // Create pool cards
    poolsData.forEach(pool => {
        createPoolCard(pool);
    });
    
    if (noPoolsMessage) {
        noPoolsMessage.style.display = 'none';
    }
    
    // Start countdown timers
    startPoolTimers();
}

// Create pool card HTML
function createPoolCard(pool) {
    const poolsContainer = document.getElementById('poolsContainer');
    if (!poolsContainer) return;
    
    const expiresAt = new Date(pool.expiresAt);
    const timeLeft = getTimeLeft(expiresAt);
    
    // Skip if pool has expired
    if (timeLeft.minutes < 0 && timeLeft.seconds < 0) {
        return;
    }
    
    const poolCard = document.createElement('div');
    poolCard.className = 'pool-card';
    poolCard.dataset.poolId = pool.id;
    poolCard.dataset.expiresAt = expiresAt.getTime();
    
    // Format items for display
    const itemsHtml = pool.items.slice(0, 3).map(item => 
        `<span class="item-tag">${item}</span>`
    ).join('');
    
    const moreItems = pool.items.length > 3 ? 
        `<span class="item-tag">+${pool.items.length - 3} more</span>` : 
        '';
    
    poolCard.innerHTML = `
        <div class="pool-header">
            <div class="pool-platform ${pool.platform}">
                <i class="${getPlatformIcon(pool.platform)}"></i>
                <span>${getPlatformName(pool.platform)}</span>
            </div>
            <div class="pool-timer ${timeLeft.minutes < 5 ? 'urgent' : ''}" 
                 data-timer="${expiresAt.getTime()}">
                <i class="fas fa-clock"></i>
                ${timeLeft.minutes}:${timeLeft.seconds.toString().padStart(2, '0')} min
            </div>
        </div>
        
        <div class="pool-creator">
            <i class="fas fa-user"></i>
            Created by ${pool.creatorName || 'Unknown'}
        </div>
        
        <div class="pool-items">
            <strong>Items:</strong>
            <div class="item-tags">
                ${itemsHtml}
                ${moreItems}
            </div>
        </div>
        
        <div class="pool-stats">
            <span><i class="fas fa-users"></i> ${pool.joinedUsers ? pool.joinedUsers.length : 1}/${pool.maxUsers || 3} users</span>
            <span><i class="fas fa-rupee-sign"></i> Save ₹${pool.estimatedSave || 60}</span>
        </div>
        
        <div class="pool-actions">
            <button onclick="joinPool('${pool.id}')" class="btn-primary btn-sm">
                <i class="fas fa-plus"></i> Join Pool
            </button>
            <button onclick="viewPool('${pool.id}')" class="btn-secondary btn-sm">
                <i class="fas fa-eye"></i> View
            </button>
            <button onclick="openChat('${pool.id}')" class="btn-chat">
                <i class="fas fa-comment"></i> Chat
            </button>
        </div>
    `;
    
    poolsContainer.appendChild(poolCard);
}

// Timer function for pools
function startPoolTimers() {
    const timerElements = document.querySelectorAll('.pool-timer');
    
    timerElements.forEach(timer => {
        const expiresAt = parseInt(timer.dataset.timer);
        updateTimerDisplay(timer, expiresAt);
        
        // Update every second
        const interval = setInterval(() => {
            updateTimerDisplay(timer, expiresAt, interval);
        }, 1000);
    });
}

// Update timer display
function updateTimerDisplay(timer, expiresAt, interval = null) {
    const now = new Date().getTime();
    const timeLeft = expiresAt - now;
    
    if (timeLeft <= 0) {
        // Time's up
        timer.innerHTML = `<i class="fas fa-clock"></i> 0:00 min`;
        timer.classList.add('urgent');
        
        // Remove pool card after 5 seconds
        setTimeout(() => {
            const poolCard = timer.closest('.pool-card');
            if (poolCard) {
                poolCard.style.transition = 'opacity 0.5s';
                poolCard.style.opacity = '0';
                
                setTimeout(() => {
                    poolCard.remove();
                    
                    // Check if any pools left
                    const remainingPools = document.querySelectorAll('.pool-card').length;
                    const noPoolsMessage = document.getElementById('noPoolsMessage');
                    
                    if (remainingPools === 0 && noPoolsMessage) {
                        noPoolsMessage.style.display = 'block';
                    }
                }, 500);
            }
        }, 5000);
        
        // Clear interval
        if (interval) {
            clearInterval(interval);
        }
        return;
    }
    
    // Calculate minutes and seconds
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
    
    // Update display
    timer.innerHTML = `<i class="fas fa-clock"></i> 
        ${minutes}:${seconds.toString().padStart(2, '0')} min`;
    
    // Add urgent class if less than 5 minutes
    if (minutes < 5) {
        timer.classList.add('urgent');
    } else {
        timer.classList.remove('urgent');
    }
}

// Calculate time left
function getTimeLeft(expiresAt) {
    const now = new Date();
    const diffMs = expiresAt - now;
    
    if (diffMs <= 0) {
        return { minutes: 0, seconds: 0 };
    }
    
    const minutes = Math.floor(diffMs / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    
    return {
        minutes: minutes,
        seconds: seconds
    };
}

// Update dashboard stats
function updateStats() {
    console.log("Updating stats...");
    
    // Get active pools count
    let pools = JSON.parse(localStorage.getItem('poolify_pools') || '[]');
    const now = new Date();
    const activePools = pools.filter(pool => {
        if (!pool.expiresAt) return false;
        return new Date(pool.expiresAt) > now;
    });
    
    document.getElementById('activePoolsCount').textContent = activePools.length;
    
    // Set other stats
    document.getElementById('moneySaved').textContent = "450";
    document.getElementById('itemsPooled').textContent = "28";
    document.getElementById('timeSaved').textContent = "12";
}

// Setup event listeners
function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.querySelector('.search-bar button');
    
    if (searchInput && searchButton) {
        searchButton.addEventListener('click', searchPools);
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchPools();
            }
        });
    }
    
    // Filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach((button, index) => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            
            const platform = index === 0 ? 'all' : 
                           index === 1 ? 'blinkit' :
                           index === 2 ? 'zepto' : 'instamart';
            filterPools(platform);
        });
    });
}

// Search pools - FIXED VERSION
function searchPools() {
    console.log("Search function called");
    const query = document.getElementById('searchInput').value.toLowerCase().trim();
    console.log("Searching for:", query);
    
    if (!query) {
        // Reload all pools if search is empty
        console.log("Empty search, reloading all pools");
        loadActivePools();
        return;
    }
    
    const poolCards = document.querySelectorAll('.pool-card');
    console.log("Total pool cards:", poolCards.length);
    
    let foundAny = false;
    
    poolCards.forEach(card => {
        try {
            const itemsElement = card.querySelector('.item-tags');
            const creatorElement = card.querySelector('.pool-creator');
            const platformElement = card.querySelector('.pool-platform span');
            
            if (!itemsElement || !creatorElement || !platformElement) {
                console.log("Elements not found in card");
                return;
            }
            
            const items = itemsElement.textContent.toLowerCase();
            const creator = creatorElement.textContent.toLowerCase();
            const platform = platformElement.textContent.toLowerCase();
            
            console.log("Checking:", {items, creator, platform});
            
            if (items.includes(query) || creator.includes(query) || platform.includes(query)) {
                card.style.display = 'block';
                foundAny = true;
                console.log("Match found!");
            } else {
                card.style.display = 'none';
            }
        } catch (error) {
            console.error("Error in search:", error);
        }
    });
    
    console.log("Found any:", foundAny);
    
    // Show no results message
    const noPoolsMessage = document.getElementById('noPoolsMessage');
    if (noPoolsMessage) {
        if (!foundAny) {
            noPoolsMessage.style.display = 'block';
            noPoolsMessage.innerHTML = `
                <i class="fas fa-search fa-3x" style="color: var(--gray); margin-bottom: 20px;"></i>
                <h3>No pools found for "${query}"</h3>
                <p>Try a different search term</p>
            `;
        } else {
            noPoolsMessage.style.display = 'none';
        }
    }
}

// Filter pools by platform - FIXED VERSION
function filterPools(platform) {
    console.log("Filtering by platform:", platform);
    
    const poolCards = document.querySelectorAll('.pool-card');
    
    if (platform === 'all') {
        // Show all pools
        poolCards.forEach(card => {
            card.style.display = 'block';
        });
        return;
    }
    
    let foundAny = false;
    
    poolCards.forEach(card => {
        try {
            const platformElement = card.querySelector('.pool-platform');
            if (!platformElement) {
                console.log("Platform element not found");
                return;
            }
            
            // Get platform class (second class)
            const classList = platformElement.classList;
            const cardPlatform = classList[1]; // First class is 'pool-platform', second is platform name
            
            console.log("Card platform:", cardPlatform);
            
            if (cardPlatform === platform) {
                card.style.display = 'block';
                foundAny = true;
            } else {
                card.style.display = 'none';
            }
        } catch (error) {
            console.error("Error in filter:", error);
        }
    });
    
    // Show no results message
    const noPoolsMessage = document.getElementById('noPoolsMessage');
    if (noPoolsMessage) {
        if (!foundAny) {
            noPoolsMessage.style.display = 'block';
            noPoolsMessage.innerHTML = `
                <i class="fas fa-filter fa-3x" style="color: var(--gray); margin-bottom: 20px;"></i>
                <h3>No ${platform} pools found</h3>
                <p>Create the first ${platform} pool in your area!</p>
                <button onclick="createQuickPool('${platform}')" class="btn-primary" style="margin-top: 20px;">
                    <i class="fas fa-plus"></i> Create ${platform} Pool
                </button>
            `;
        } else {
            noPoolsMessage.style.display = 'none';
        }
    }
}

// Load demo pools for testing
function loadDemoPools() {
    console.log("Loading demo pools...");
    
    const poolsContainer = document.getElementById('poolsContainer');
    const noPoolsMessage = document.getElementById('noPoolsMessage');
    
    if (!poolsContainer) return;
    
    // Demo pools data
    const demoPools = [
        {
            id: 'demo-pool-1',
            platform: 'blinkit',
            creatorName: 'Rahul',
            items: ['Milk', 'Bread', 'Eggs', 'Chips'],
            joinedUsers: ['user1', 'user2'],
            maxUsers: 4,
            estimatedSave: 120,
            expiresAt: new Date(Date.now() + 15 * 60000).toISOString(),
            status: 'active'
        },
        {
            id: 'demo-pool-2',
            platform: 'zepto',
            creatorName: 'Priya',
            items: ['Maggi', 'Cold Drinks', 'Biscuits'],
            joinedUsers: ['user1'],
            maxUsers: 3,
            estimatedSave: 90,
            expiresAt: new Date(Date.now() + 8 * 60000).toISOString(),
            status: 'active'
        },
        {
            id: 'demo-pool-3',
            platform: 'instamart',
            creatorName: 'Amit',
            items: ['Fruits', 'Juice', 'Snacks', 'Tea', 'Coffee'],
            joinedUsers: ['user1', 'user2', 'user3'],
            maxUsers: 5,
            estimatedSave: 150,
            expiresAt: new Date(Date.now() + 25 * 60000).toISOString(),
            status: 'active'
        }
    ];
    
    // Save demo pools to localStorage
    localStorage.setItem('poolify_pools', JSON.stringify(demoPools));
    poolsData = demoPools;
    
    // Clear container
    poolsContainer.innerHTML = '';
    
    // Create pool cards
    demoPools.forEach(pool => {
        createPoolCard(pool);
    });
    
    if (demoPools.length === 0 && noPoolsMessage) {
        noPoolsMessage.style.display = 'block';
    } else if (noPoolsMessage) {
        noPoolsMessage.style.display = 'none';
    }
    
    // Start timers
    startPoolTimers();
}

// Helper functions
function getPlatformIcon(platform) {
    const icons = {
        'blinkit': 'fas fa-bolt',
        'zepto': 'fas fa-rocket',
        'instamart': 'fas fa-shopping-cart',
        'flipkart': 'fab fa-flipkart'
    };
    return icons[platform] || 'fas fa-store';
}

function getPlatformName(platform) {
    const names = {
        'blinkit': 'Blinkit',
        'zepto': 'Zepto',
        'instamart': 'Instamart',
        'flipkart': 'Flipkart Minutes'
    };
    return names[platform] || 'Unknown';
}

// Join pool function
function joinPool(poolId) {
    console.log("Joining pool:", poolId);
    
    if (!currentUser) {
        alert('Please login first');
        window.location.href = 'login.html';
        return;
    }
    
    // Find the pool
    const poolIndex = poolsData.findIndex(p => p.id === poolId);
    if (poolIndex === -1) {
        alert('Pool not found!');
        return;
    }
    
    const pool = poolsData[poolIndex];
    
    // Check if already joined
    if (pool.joinedUsers && pool.joinedUsers.includes(currentUser.uid || currentUser.email)) {
        alert('You have already joined this pool!');
        return;
    }
    
    // Check if pool is full
    if (pool.joinedUsers && pool.joinedUsers.length >= pool.maxUsers) {
        alert('This pool is already full!');
        return;
    }
    
    // Add user to pool
    if (!pool.joinedUsers) pool.joinedUsers = [];
    pool.joinedUsers.push(currentUser.uid || currentUser.email);
    
    // Update estimated savings
    pool.estimatedSave = (pool.estimatedSave || 60) + 30;
    
    // Update localStorage
    let allPools = JSON.parse(localStorage.getItem('poolify_pools') || '[]');
    const allPoolIndex = allPools.findIndex(p => p.id === poolId);
    if (allPoolIndex !== -1) {
        allPools[allPoolIndex] = pool;
        localStorage.setItem('poolify_pools', JSON.stringify(allPools));
    }
    
    // Update UI
    alert('Successfully joined the pool!');
    
    // Refresh the specific pool card
    const poolCard = document.querySelector(`[data-pool-id="${poolId}"]`);
    if (poolCard) {
        const stats = poolCard.querySelector('.pool-stats span:first-child');
        if (stats) {
            stats.innerHTML = `<i class="fas fa-users"></i> ${pool.joinedUsers.length}/${pool.maxUsers} users`;
        }
        
        const savings = poolCard.querySelector('.pool-stats span:last-child');
        if (savings) {
            savings.innerHTML = `<i class="fas fa-rupee-sign"></i> Save ₹${pool.estimatedSave}`;
        }
        
        // Disable join button
        const joinBtn = poolCard.querySelector('.btn-primary');
        if (joinBtn) {
            joinBtn.disabled = true;
            joinBtn.innerHTML = '<i class="fas fa-check"></i> Joined';
            joinBtn.classList.remove('btn-primary');
            joinBtn.classList.add('btn-secondary');
        }
    }
    
    // Update stats
    updateStats();
}

// View pool function
// View pool function - MODIFIED TO REDIRECT TO POOL-DETAILS.HTML
// View pool function - MODIFIED WITH MULTIPLE PATH OPTIONS
function viewPool(poolId){
    console.log("Viewing pool:", poolId);
    localStorage.setItem('current_viewing_pool', poolId);
    
    // Check current URL
    const currentUrl = window.location.href;
    
    if (currentUrl.includes('github.io')) {
        // GitHub Pages - use relative path from public folder
        window.location.href = 'pool-details.html';
    } else if (currentUrl.includes('localhost')) {
        // Local development
        window.location.href = 'pool-details.html';
    } else {
        // Fallback
        window.location.href = 'pool-details.html';
    }
}
// ==================== CHAT FUNCTIONS ====================
function openChat(poolId) {
    console.log("Opening chat for pool:", poolId);
    document.getElementById('chatModal').style.display = 'block';
    
    // Get pool details
    const pool = poolsData.find(p => p.id === poolId);
    if (pool) {
        document.getElementById('chatPoolName').textContent = 
            `${getPlatformName(pool.platform)} Pool Chat`;
    }
}

function closeChatModal() {
    document.getElementById('chatModal').style.display = 'none';
}

function sendChatMessage() {
    const input = document.getElementById('chatMessageInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add message to chat
    const chatContainer = document.getElementById('chatMessages');
    const newMessage = document.createElement('div');
    newMessage.className = 'chat-message me';
    newMessage.innerHTML = `
        <div class="message-header">
            <strong>You</strong>
            <span class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div class="message-content">
            <p>${message}</p>
        </div>
    `;
    
    chatContainer.appendChild(newMessage);
    input.value = '';
    
    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    // Auto-reply after 1 second
    setTimeout(() => {
        const autoReply = document.createElement('div');
        autoReply.className = 'chat-message other';
        autoReply.innerHTML = `
            <div class="message-header">
                <strong>Rahul</strong>
                <span class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div class="message-content">
                <p>Sounds good! I'll add that too.</p>
            </div>
        `;
        chatContainer.appendChild(autoReply);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }, 1000);
}

function sendQuickMessage(text) {
    document.getElementById('chatMessageInput').value = text;
    sendChatMessage();
}

// ==================== INVITE FUNCTIONS ====================
function inviteFriends() {
    console.log("Opening invite modal...");
    document.getElementById('inviteModal').style.display = 'block';
}

function closeInviteModal() {
    document.getElementById('inviteModal').style.display = 'none';
}

function copyInviteLink() {
    const linkInput = document.getElementById('inviteLink');
    linkInput.select();
    document.execCommand('copy');
    alert('Link copied to clipboard!');
}

function shareOnWhatsApp() {
    const text = "Hey! Join me on Poolify to save on delivery fees. Let's pool our orders! https://poolify.com";
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}

function shareTelegram() {
    const text = "Hey! Join me on Poolify to save on delivery fees. Let's pool our orders! https://poolify.com";
    window.open(`https://t.me/share/url?url=https://poolify.com&text=${encodeURIComponent(text)}`, '_blank');
}

// ==================== PROFILE FUNCTION ====================
function goToProfile() {
    window.location.href = 'profile.html';
}

// ==================== GLOBAL FUNCTIONS ====================
window.createPool = function() {
    window.location.href = 'create-pool.html';
};

window.createQuickPool = function(platform) {
    console.log("Creating quick pool for:", platform);
    window.location.href = `create-pool.html?platform=${platform}`;
};

window.inviteFriends = inviteFriends;
window.closeInviteModal = closeInviteModal;
window.copyInviteLink = copyInviteLink;
window.shareOnWhatsApp = shareOnWhatsApp;
window.shareTelegram = shareTelegram;

window.openChat = openChat;
window.closeChatModal = closeChatModal;
window.sendChatMessage = sendChatMessage;
window.sendQuickMessage = sendQuickMessage;

window.searchPools = searchPools;
window.joinPool = joinPool;
window.viewPool = viewPool;
window.filterPools = filterPools;

window.logout = function() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.clear();
        window.location.href = 'index.html';
    }
};