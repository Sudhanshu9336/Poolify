// Pool Operations for Poolify Frontend

// ==================== POOL MANAGEMENT FUNCTIONS ====================

// Create a new pool
async function createPool(poolData) {
    try {
        const user = JSON.parse(localStorage.getItem('poolify_user'));
        if (!user) {
            throw new Error('Please login first');
        }

        // Get Firebase ID token
        const token = await auth.currentUser.getIdToken();
        
        // API call to backend
        const response = await fetch('/api/pools/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(poolData)
        });

        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Failed to create pool');
        }

        return result;
    } catch (error) {
        console.error('Create pool error:', error);
        throw error;
    }
}

// Get pool by ID
async function getPool(poolId) {
    try {
        const user = JSON.parse(localStorage.getItem('poolify_user'));
        if (!user) {
            throw new Error('Please login first');
        }

        const token = await auth.currentUser.getIdToken();
        
        const response = await fetch(`/api/pools/${poolId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Failed to fetch pool');
        }

        return result.data;
    } catch (error) {
        console.error('Get pool error:', error);
        throw error;
    }
}

// Join a pool
async function joinPool(poolId) {
    try {
        const user = JSON.parse(localStorage.getItem('poolify_user'));
        if (!user) {
            throw new Error('Please login first');
        }

        const token = await auth.currentUser.getIdToken();
        
        const response = await fetch(`/api/pools/${poolId}/join`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Failed to join pool');
        }

        // Update local storage stats
        updateLocalStats('joined');
        
        return result;
    } catch (error) {
        console.error('Join pool error:', error);
        throw error;
    }
}

// Leave a pool
async function leavePool(poolId) {
    try {
        const user = JSON.parse(localStorage.getItem('poolify_user'));
        if (!user) {
            throw new Error('Please login first');
        }

        const token = await auth.currentUser.getIdToken();
        
        const response = await fetch(`/api/pools/${poolId}/leave`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Failed to leave pool');
        }

        return result;
    } catch (error) {
        console.error('Leave pool error:', error);
        throw error;
    }
}

// Complete a pool (creator only)
async function completePool(poolId) {
    try {
        const user = JSON.parse(localStorage.getItem('poolify_user'));
        if (!user) {
            throw new Error('Please login first');
        }

        const token = await auth.currentUser.getIdToken();
        
        const response = await fetch(`/api/pools/${poolId}/complete`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Failed to complete pool');
        }

        // Update local storage stats
        updateLocalStats('completed');
        
        return result;
    } catch (error) {
        console.error('Complete pool error:', error);
        throw error;
    }
}

// Get nearby pools
async function getNearbyPools(location) {
    try {
        const user = JSON.parse(localStorage.getItem('poolify_user'));
        if (!user) {
            throw new Error('Please login first');
        }

        const token = await auth.currentUser.getIdToken();
        
        const response = await fetch('/api/pools/nearby', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(location)
        });

        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Failed to fetch nearby pools');
        }

        return result.data;
    } catch (error) {
        console.error('Nearby pools error:', error);
        throw error;
    }
}

// Get user's active pools
async function getUserActivePools() {
    try {
        const user = JSON.parse(localStorage.getItem('poolify_user'));
        if (!user) {
            return [];
        }

        // Get pools where user has joined
        const querySnapshot = await db.collection('pools')
            .where('joinedUsers', 'array-contains', user.uid)
            .where('status', '==', 'active')
            .orderBy('createdAt', 'desc')
            .get();

        const pools = [];
        querySnapshot.forEach(doc => {
            const pool = doc.data();
            pool.id = doc.id;
            pools.push(pool);
        });

        return pools;
    } catch (error) {
        console.error('Get user pools error:', error);
        return [];
    }
}

// Get user's created pools
async function getUserCreatedPools() {
    try {
        const user = JSON.parse(localStorage.getItem('poolify_user'));
        if (!user) {
            return [];
        }

        const querySnapshot = await db.collection('pools')
            .where('createdBy', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .get();

        const pools = [];
        querySnapshot.forEach(doc => {
            const pool = doc.data();
            pool.id = doc.id;
            pools.push(pool);
        });

        return pools;
    } catch (error) {
        console.error('Get created pools error:', error);
        return [];
    }
}

// Search pools by keyword
async function searchPools(keyword, platform = 'all') {
    try {
        let query = db.collection('pools')
            .where('status', '==', 'active')
            .where('expiresAt', '>', new Date());

        // Apply platform filter
        if (platform !== 'all') {
            query = query.where('platform', '==', platform);
        }

        const querySnapshot = await query.get();
        
        const pools = [];
        querySnapshot.forEach(doc => {
            const pool = doc.data();
            pool.id = doc.id;
            
            // Search in items and notes
            const searchText = (pool.items?.join(' ') + ' ' + (pool.notes || '')).toLowerCase();
            if (searchText.includes(keyword.toLowerCase())) {
                pools.push(pool);
            }
        });

        return pools;
    } catch (error) {
        console.error('Search pools error:', error);
        return [];
    }
}

// ==================== UI HELPER FUNCTIONS ====================

// Create pool card HTML
function createPoolCardHTML(pool) {
    const user = JSON.parse(localStorage.getItem('poolify_user'));
    const isCreator = pool.createdBy === user?.uid;
    const isJoined = pool.joinedUsers?.includes(user?.uid) || false;
    
    // Platform config
    const platformConfig = {
        blinkit: { icon: 'fas fa-bolt', color: '#F8B400', name: 'Blinkit' },
        zepto: { icon: 'fas fa-rocket', color: '#FF6B6B', name: 'Zepto' },
        instamart: { icon: 'fas fa-shopping-cart', color: '#4ECDC4', name: 'Instamart' },
        flipkart: { icon: 'fab fa-flipkart', color: '#2874F0', name: 'Flipkart' }
    };
    
    const config = platformConfig[pool.platform] || { icon: 'fas fa-store', color: '#4361ee', name: 'Pool' };
    
    // Time remaining
    const expiresAt = pool.expiresAt?.toDate() || new Date();
    const now = new Date();
    const minutesLeft = Math.max(0, Math.floor((expiresAt - now) / 60000));
    
    // Items preview
    const itemsPreview = Array.isArray(pool.items) 
        ? pool.items.slice(0, 3).join(', ') + (pool.items.length > 3 ? '...' : '')
        : pool.items || '';
    
    return `
        <div class="pool-card" data-pool-id="${pool.id}">
            <div class="pool-header" style="background: ${config.color}">
                <div class="pool-platform">
                    <i class="${config.icon}"></i>
                    <span>${config.name}</span>
                </div>
                <div class="pool-timer" id="timer-${pool.id}">
                    ${minutesLeft} min left
                </div>
            </div>
            
            <div class="pool-body">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <div>
                        <strong>${pool.creatorName || 'User'}</strong>
                        <small style="color: #666; display: block;">${pool.creatorHostel || ''}</small>
                    </div>
                    ${isCreator ? '<span style="color: #4361ee; font-weight: 600;">(Your Pool)</span>' : ''}
                </div>
                
                <p class="pool-items">
                    <i class="fas fa-shopping-basket"></i>
                    <strong>Items:</strong> ${itemsPreview}
                </p>
                
                ${pool.notes ? `
                    <p style="margin-top: 10px; color: #666; font-size: 0.9rem;">
                        <i class="fas fa-sticky-note"></i> ${pool.notes}
                    </p>
                ` : ''}
                
                <div style="margin-top: 15px; display: flex; justify-content: space-between;">
                    <div>
                        <i class="fas fa-users"></i>
                        <span>${pool.joinedUsers?.length || 1} joined</span>
                    </div>
                    <div>
                        <i class="fas fa-rupee-sign"></i>
                        <span>₹${pool.estimatedSave || 0} saved</span>
                    </div>
                </div>
            </div>
            
            <div class="pool-footer">
                <div class="pool-users">
                    ${isJoined ? 
                        '<span style="color: #4cc9f0;"><i class="fas fa-check-circle"></i> Joined</span>' : 
                        '<span><i class="fas fa-user-plus"></i> Join to save</span>'
                    }
                </div>
                <div>
                    ${!isJoined && !isCreator ? 
                        `<button onclick="handleJoinPool('${pool.id}')" class="join-btn">
                            <i class="fas fa-plus"></i> Join Pool
                        </button>` : ''
                    }
                    <button onclick="viewPoolDetail('${pool.id}')" class="btn-secondary" style="padding: 8px 15px; margin-left: 10px;">
                        <i class="fas fa-eye"></i> View
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Update pool timer
function updatePoolTimer(poolId, expiresAt) {
    const timerElement = document.getElementById(`timer-${poolId}`);
    if (!timerElement) return;
    
    const update = () => {
        const now = new Date();
        const diffMs = expiresAt - now;
        
        if (diffMs <= 0) {
            timerElement.textContent = 'Expired';
            timerElement.style.background = '#f94144';
            return;
        }
        
        const minutes = Math.floor(diffMs / 60000);
        const seconds = Math.floor((diffMs % 60000) / 1000);
        
        timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')} left`;
        
        if (minutes < 5) {
            timerElement.style.background = '#f94144';
        } else if (minutes < 10) {
            timerElement.style.background = '#f8961e';
        }
        
        setTimeout(update, 1000);
    };
    
    update();
}

// Display pools in container
function displayPools(pools, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    if (pools.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; grid-column: 1/-1;">
                <i class="fas fa-users-slash fa-3x" style="color: #6c757d; margin-bottom: 20px;"></i>
                <h3>No pools found</h3>
                <p>Be the first to create a pool!</p>
            </div>
        `;
        return;
    }
    
    pools.forEach(pool => {
        const poolCard = document.createElement('div');
        poolCard.innerHTML = createPoolCardHTML(pool);
        container.appendChild(poolCard);
        
        // Start timer
        if (pool.expiresAt) {
            updatePoolTimer(pool.id, pool.expiresAt.toDate());
        }
    });
}

// Load and display pools on dashboard
async function loadDashboardPools() {
    try {
        const user = JSON.parse(localStorage.getItem('poolify_user'));
        if (!user) return;
        
        // Get user's location (simulated for demo)
        const location = {
            latitude: 28.7041,
            longitude: 77.1025,
            radius: 1 // 1km radius
        };
        
        const nearbyPools = await getNearbyPools(location);
        displayPools(nearbyPools, 'poolsContainer');
        
        // Update stats
        updateDashboardStats(nearbyPools);
        
    } catch (error) {
        console.error('Load dashboard pools error:', error);
        document.getElementById('poolsContainer').innerHTML = `
            <div style="text-align: center; padding: 40px; color: #f94144;">
                <i class="fas fa-exclamation-triangle fa-3x"></i>
                <h3>Error loading pools</h3>
                <p>Please refresh the page</p>
            </div>
        `;
    }
}

// Update dashboard statistics
function updateDashboardStats(pools) {
    const user = JSON.parse(localStorage.getItem('poolify_user'));
    if (!user) return;
    
    // Active pools count
    document.getElementById('activePoolsCount').textContent = pools.length;
    
    // Calculate total savings
    const totalSavings = pools.reduce((sum, pool) => {
        return sum + (pool.estimatedSave || 0);
    }, 0);
    
    // Calculate items pooled
    const totalItems = pools.reduce((sum, pool) => {
        return sum + (Array.isArray(pool.items) ? pool.items.length : 1);
    }, 0);
    
    // Update UI
    document.getElementById('moneySaved').textContent = totalSavings;
    document.getElementById('itemsPooled').textContent = totalItems;
    document.getElementById('timeSaved').textContent = Math.floor(totalItems * 10); // Demo calculation
}

// ==================== EVENT HANDLERS ====================

// Handle join pool button click
async function handleJoinPool(poolId) {
    try {
        await joinPool(poolId);
        
        // Show success message
        showToast('Successfully joined the pool!', 'success');
        
        // Update UI
        const joinBtn = document.querySelector(`[onclick="handleJoinPool('${poolId}')"]`);
        if (joinBtn) {
            joinBtn.innerHTML = '<i class="fas fa-check-circle"></i> Joined';
            joinBtn.style.background = '#4cc9f0';
            joinBtn.disabled = true;
        }
        
        // Update stats
        updateLocalStats('joined');
        
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// View pool detail
function viewPoolDetail(poolId) {
    window.location.href = `pool-detail.html?id=${poolId}`;
}

// Quick create pool functions
function createQuickPool(platform) {
    const items = prompt(`What do you need from ${platform}? (comma separated)`);
    if (!items) return;
    
    const itemsArray = items.split(',').map(item => item.trim()).filter(item => item);
    
    const poolData = {
        platform: platform,
        items: itemsArray,
        timeLimit: 20,
        maxUsers: 3
    };
    
    createPool(poolData)
        .then(result => {
            showToast(`Pool created successfully!`, 'success');
            setTimeout(() => {
                window.location.href = `pool-detail.html?id=${result.poolId}`;
            }, 1500);
        })
        .catch(error => {
            showToast(error.message, 'error');
        });
}

// Filter pools by platform
function filterPools(platform) {
    const container = document.getElementById('poolsContainer');
    const poolCards = container.querySelectorAll('.pool-card');
    
    poolCards.forEach(card => {
        const poolPlatform = card.querySelector('.pool-platform span').textContent.toLowerCase();
        
        if (platform === 'all' || poolPlatform.includes(platform)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Search pools
function searchPoolsHandler() {
    const searchInput = document.getElementById('searchInput');
    const keyword = searchInput.value.trim();
    
    if (!keyword) {
        loadDashboardPools();
        return;
    }
    
    searchPools(keyword)
        .then(results => {
            displayPools(results, 'poolsContainer');
            
            if (results.length === 0) {
                showToast('No pools found for your search', 'info');
            }
        })
        .catch(error => {
            showToast('Search error', 'error');
        });
}

// ==================== UTILITY FUNCTIONS ====================

// Update local storage stats
function updateLocalStats(action) {
    const user = JSON.parse(localStorage.getItem('poolify_user'));
    if (!user) return;
    
    if (!user.stats) {
        user.stats = {
            poolsCreated: 0,
            poolsJoined: 0,
            poolsCompleted: 0,
            moneySaved: 0
        };
    }
    
    switch (action) {
        case 'created':
            user.stats.poolsCreated++;
            user.stats.moneySaved += 60; // ₹60 saved per pool
            break;
        case 'joined':
            user.stats.poolsJoined++;
            user.stats.moneySaved += 30; // ₹30 saved per join
            break;
        case 'completed':
            user.stats.poolsCompleted++;
            break;
    }
    
    localStorage.setItem('poolify_user', JSON.stringify(user));
    
    // Update UI if on dashboard
    if (document.getElementById('moneySaved')) {
        document.getElementById('moneySaved').textContent = user.stats.moneySaved;
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();
    
    // Create toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-${getToastIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    document.body.appendChild(toast);
    
    // Auto remove
    setTimeout(() => {
        if (toast.parentElement) toast.remove();
    }, 3000);
}

function getToastIcon(type) {
    switch(type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        default: return 'info-circle';
    }
}

// Add CSS for toast
const toastStyles = document.createElement('style');
toastStyles.textContent = `
    .toast {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        padding: 15px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 15px;
        z-index: 9999;
        animation: slideIn 0.3s ease;
        max-width: 350px;
    }
    
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    .toast-success { border-left: 4px solid #4cc9f0; }
    .toast-error { border-left: 4px solid #f94144; }
    .toast-warning { border-left: 4px solid #f8961e; }
    .toast-info { border-left: 4px solid #4361ee; }
    
    .toast-content {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .toast-content i {
        font-size: 1.2rem;
    }
    
    .toast-success .toast-content i { color: #4cc9f0; }
    .toast-error .toast-content i { color: #f94144; }
    .toast-warning .toast-content i { color: #f8961e; }
    .toast-info .toast-content i { color: #4361ee; }
    
    .toast-close {
        background: none;
        border: none;
        color: #666;
        cursor: pointer;
        font-size: 1rem;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
`;

document.head.appendChild(toastStyles);

// ==================== INITIALIZATION ====================

// Initialize pool functions when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on dashboard page
    if (document.getElementById('poolsContainer')) {
        // Load pools after a short delay
        setTimeout(loadDashboardPools, 1000);
        
        // Set up search input event listener
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    searchPoolsHandler();
                }
            });
        }
    }
    
    // Check if we're on pool detail page
    const urlParams = new URLSearchParams(window.location.search);
    const poolId = urlParams.get('id');
    
    if (poolId && document.getElementById('poolDetailContainer')) {
        // Load pool details
        loadPoolDetail(poolId);
    }
});

// Export functions to window object
window.poolFunctions = {
    createPool,
    getPool,
    joinPool,
    leavePool,
    completePool,
    getNearbyPools,
    getUserActivePools,
    getUserCreatedPools,
    searchPools,
    createPoolCardHTML,
    displayPools,
    handleJoinPool,
    viewPoolDetail,
    createQuickPool,
    filterPools,
    searchPoolsHandler,
    showToast
};