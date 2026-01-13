// Firebase Cloud Functions
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Express app
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Database reference
const db = admin.firestore();

// ==================== HELPER FUNCTIONS ====================

// Check if user is authenticated
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized - No token provided' });
        }
        
        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }
};

// ==================== API ENDPOINTS ====================

// 1. HEALTH CHECK
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Poolify Backend is running',
        timestamp: new Date().toISOString()
    });
});

// 2. GET USER PROFILE
app.get('/user/profile', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        const userDoc = await db.collection('users').doc(userId).get();
        
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const userData = userDoc.data();
        // Remove sensitive data
        delete userData.email;
        
        res.json({
            success: true,
            data: userData
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 3. UPDATE USER PROFILE
app.put('/user/profile', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        const { name, hostel, phone } = req.body;
        
        const updateData = {};
        if (name) updateData.name = name;
        if (hostel) updateData.hostel = hostel;
        if (phone) updateData.phone = phone;
        
        await db.collection('users').doc(userId).update({
            ...updateData,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        res.json({
            success: true,
            message: 'Profile updated successfully'
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 4. GET NEARBY POOLS (Location based)
app.post('/pools/nearby', authenticate, async (req, res) => {
    try {
        const { latitude, longitude, radius = 1 } = req.body; // radius in km
        
        // Get all active pools
        const poolsSnapshot = await db.collection('pools')
            .where('status', '==', 'active')
            .where('expiresAt', '>', new Date())
            .limit(20)
            .get();
        
        const pools = [];
        poolsSnapshot.forEach(doc => {
            const pool = doc.data();
            pool.id = doc.id;
            
            // In production, calculate actual distance
            // For now, return all pools
            pools.push(pool);
        });
        
        res.json({
            success: true,
            count: pools.length,
            data: pools
        });
    } catch (error) {
        console.error('Nearby pools error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 5. CREATE NEW POOL
app.post('/pools/create', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        const {
            platform,
            items,
            timeLimit = 20,
            maxUsers = 4,
            notes,
            location
        } = req.body;
        
        // Validation
        if (!platform || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Platform and items are required' });
        }
        
        // Get user data
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.exists ? userDoc.data() : {};
        
        // Calculate expiration time
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + timeLimit);
        
        // Create pool object
        const poolData = {
            platform,
            items,
            timeLimit,
            maxUsers,
            notes: notes || '',
            location: location || userData.hostel || 'Unknown',
            createdBy: userId,
            creatorName: userData.name || 'Anonymous',
            creatorHostel: userData.hostel || 'Unknown',
            joinedUsers: [userId],
            status: 'active',
            estimatedSave: maxUsers * 30, // Demo calculation
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: expiresAt
        };
        
        // Save to Firestore
        const poolRef = await db.collection('pools').add(poolData);
        
        // Update user stats
        await db.collection('users').doc(userId).update({
            'stats.poolsCreated': admin.firestore.FieldValue.increment(1),
            'stats.moneySaved': admin.firestore.FieldValue.increment(poolData.estimatedSave)
        });
        
        res.json({
            success: true,
            message: 'Pool created successfully',
            poolId: poolRef.id,
            data: poolData
        });
    } catch (error) {
        console.error('Create pool error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 6. JOIN POOL
app.post('/pools/:poolId/join', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        const { poolId } = req.params;
        
        // Check if pool exists
        const poolRef = db.collection('pools').doc(poolId);
        const poolDoc = await poolRef.get();
        
        if (!poolDoc.exists) {
            return res.status(404).json({ error: 'Pool not found' });
        }
        
        const pool = poolDoc.data();
        
        // Check if pool is active
        if (pool.status !== 'active') {
            return res.status(400).json({ error: 'Pool is not active' });
        }
        
        // Check if expired
        if (pool.expiresAt && pool.expiresAt.toDate() < new Date()) {
            return res.status(400).json({ error: 'Pool has expired' });
        }
        
        // Check if user already joined
        if (pool.joinedUsers && pool.joinedUsers.includes(userId)) {
            return res.status(400).json({ error: 'Already joined this pool' });
        }
        
        // Check if pool is full
        if (pool.joinedUsers && pool.joinedUsers.length >= pool.maxUsers) {
            return res.status(400).json({ error: 'Pool is full' });
        }
        
        // Join the pool
        await poolRef.update({
            joinedUsers: admin.firestore.FieldValue.arrayUnion(userId),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Update user stats
        await db.collection('users').doc(userId).update({
            'stats.poolsJoined': admin.firestore.FieldValue.increment(1),
            'stats.moneySaved': admin.firestore.FieldValue.increment(30) // ₹30 saved per join
        });
        
        res.json({
            success: true,
            message: 'Successfully joined the pool'
        });
    } catch (error) {
        console.error('Join pool error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 7. LEAVE POOL
app.post('/pools/:poolId/leave', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        const { poolId } = req.params;
        
        // Remove user from pool
        await db.collection('pools').doc(poolId).update({
            joinedUsers: admin.firestore.FieldValue.arrayRemove(userId),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        res.json({
            success: true,
            message: 'Successfully left the pool'
        });
    } catch (error) {
        console.error('Leave pool error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 8. GET POOL DETAILS
app.get('/pools/:poolId', authenticate, async (req, res) => {
    try {
        const { poolId } = req.params;
        
        const poolDoc = await db.collection('pools').doc(poolId).get();
        
        if (!poolDoc.exists) {
            return res.status(404).json({ error: 'Pool not found' });
        }
        
        const pool = poolDoc.data();
        pool.id = poolDoc.id;
        
        // Get user details for joined users
        if (pool.joinedUsers && pool.joinedUsers.length > 0) {
            const usersData = [];
            for (const userId of pool.joinedUsers) {
                const userDoc = await db.collection('users').doc(userId).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    usersData.push({
                        id: userId,
                        name: userData.name,
                        hostel: userData.hostel,
                        isOnline: userData.isOnline || false
                    });
                }
            }
            pool.joinedUsersData = usersData;
        }
        
        res.json({
            success: true,
            data: pool
        });
    } catch (error) {
        console.error('Get pool error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 9. GET POOL CHAT MESSAGES
app.get('/pools/:poolId/chat', authenticate, async (req, res) => {
    try {
        const { poolId } = req.params;
        
        const messagesSnapshot = await db.collection('chats')
            .where('poolId', '==', poolId)
            .orderBy('timestamp', 'asc')
            .limit(50)
            .get();
        
        const messages = [];
        messagesSnapshot.forEach(doc => {
            const message = doc.data();
            message.id = doc.id;
            messages.push(message);
        });
        
        res.json({
            success: true,
            count: messages.length,
            data: messages
        });
    } catch (error) {
        console.error('Get chat error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 10. SEND CHAT MESSAGE
app.post('/pools/:poolId/chat', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        const { poolId } = req.params;
        const { text, type = 'text' } = req.body;
        
        if (!text || text.trim() === '') {
            return res.status(400).json({ error: 'Message text is required' });
        }
        
        // Get user data
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.exists ? userDoc.data() : {};
        
        // Create message
        const messageData = {
            poolId,
            senderId: userId,
            senderName: userData.name || 'Anonymous',
            text: text.trim(),
            type,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        };
        
        // Save message
        const messageRef = await db.collection('chats').add(messageData);
        
        // Update pool's last activity
        await db.collection('pools').doc(poolId).update({
            lastActivity: admin.firestore.FieldValue.serverTimestamp()
        });
        
        res.json({
            success: true,
            message: 'Message sent successfully',
            messageId: messageRef.id,
            data: messageData
        });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 11. COMPLETE POOL (Creator only)
app.post('/pools/:poolId/complete', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        const { poolId } = req.params;
        
        // Check if user is pool creator
        const poolDoc = await db.collection('pools').doc(poolId).get();
        
        if (!poolDoc.exists) {
            return res.status(404).json({ error: 'Pool not found' });
        }
        
        const pool = poolDoc.data();
        
        if (pool.createdBy !== userId) {
            return res.status(403).json({ error: 'Only pool creator can complete the pool' });
        }
        
        // Update pool status
        await db.collection('pools').doc(poolId).update({
            status: 'completed',
            completedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Update stats for all joined users
        if (pool.joinedUsers && pool.joinedUsers.length > 0) {
            const batch = db.batch();
            
            pool.joinedUsers.forEach(userId => {
                const userRef = db.collection('users').doc(userId);
                batch.update(userRef, {
                    'stats.poolsCompleted': admin.firestore.FieldValue.increment(1)
                });
            });
            
            await batch.commit();
        }
        
        res.json({
            success: true,
            message: 'Pool marked as completed'
        });
    } catch (error) {
        console.error('Complete pool error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 12. GET USER STATISTICS
app.get('/user/stats', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        
        const userDoc = await db.collection('users').doc(userId).get();
        
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const userData = userDoc.data();
        const stats = userData.stats || {
            poolsCreated: 0,
            poolsJoined: 0,
            poolsCompleted: 0,
            moneySaved: 0
        };
        
        // Get active pools count
        const activePools = await db.collection('pools')
            .where('joinedUsers', 'array-contains', userId)
            .where('status', '==', 'active')
            .get();
        
        res.json({
            success: true,
            data: {
                ...stats,
                activePools: activePools.size
            }
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ==================== EXPORT FUNCTIONS ====================

// API Routes
exports.api = functions.https.onRequest(app);

// Scheduled Functions (Cron Jobs)

// Auto-expire pools every minute
exports.autoExpirePools = functions.pubsub.schedule('every 1 minutes').onRun(async (context) => {
    try {
        const now = new Date();
        
        const expiredPools = await db.collection('pools')
            .where('status', '==', 'active')
            .where('expiresAt', '<', now)
            .get();
        
        const batch = db.batch();
        let expiredCount = 0;
        
        expiredPools.forEach(doc => {
            batch.update(doc.ref, {
                status: 'expired',
                expiredAt: admin.firestore.FieldValue.serverTimestamp()
            });
            expiredCount++;
        });
        
        if (expiredCount > 0) {
            await batch.commit();
            console.log(`Auto-expired ${expiredCount} pools`);
        }
        
        return null;
    } catch (error) {
        console.error('Auto-expire error:', error);
        return null;
    }
});

// Cleanup old chats (older than 7 days)
exports.cleanupOldChats = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const oldChats = await db.collection('chats')
            .where('timestamp', '<', sevenDaysAgo)
            .limit(100) // Limit to avoid timeout
            .get();
        
        const batch = db.batch();
        let deletedCount = 0;
        
        oldChats.forEach(doc => {
            batch.delete(doc.ref);
            deletedCount++;
        });
        
        if (deletedCount > 0) {
            await batch.commit();
            console.log(`Cleaned up ${deletedCount} old chat messages`);
        }
        
        return null;
    } catch (error) {
        console.error('Cleanup error:', error);
        return null;
    }
});

// Firestore Triggers

// When a new user signs up
exports.onUserCreated = functions.auth.user().onCreate(async (user) => {
    try {
        const userData = {
            name: user.displayName || user.email.split('@')[0],
            email: user.email,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            stats: {
                poolsCreated: 0,
                poolsJoined: 0,
                poolsCompleted: 0,
                moneySaved: 0
            }
        };
        
        await db.collection('users').doc(user.uid).set(userData);
        
        console.log(`New user created: ${user.uid}`);
        return null;
    } catch (error) {
        console.error('User creation error:', error);
        return null;
    }
});

// When a pool is created
exports.onPoolCreated = functions.firestore
    .document('pools/{poolId}')
    .onCreate(async (snap, context) => {
        try {
            const pool = snap.data();
            const poolId = context.params.poolId;
            
            // Send notification to nearby users (in production)
            console.log(`New pool created: ${poolId} by ${pool.createdBy}`);
            
            return null;
        } catch (error) {
            console.error('Pool creation trigger error:', error);
            return null;
        }
    });
    