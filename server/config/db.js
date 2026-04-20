const mongoose = require('mongoose');

const looksLikePlaceholder = (value = '') => {
    const normalized = String(value).toUpperCase();
    return (
        !normalized ||
        normalized.includes('REPLACE_WITH') ||
        normalized.includes('YOURNEWPASSWORD') ||
        normalized.includes('YOUR_PASSWORD') ||
        normalized.includes('PASSWORD_HERE') ||
        normalized.includes('YOUR_MONGODB_CONNECTION_STRING')
    );
};

const MONGO_URI = process.env.MONGO_URI;
const HAS_MONGO_URI = Boolean(MONGO_URI) && !looksLikePlaceholder(MONGO_URI);
const shouldUseMockStore = () => !HAS_MONGO_URI;

let mongoConnectPromise = null;
let lastMongoError = null;

const connectToMongo = async () => {
    if (!HAS_MONGO_URI) return false;
    if (mongoose.connection.readyState === 1) return true;
    if (mongoConnectPromise) return mongoConnectPromise;

    mongoConnectPromise = mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 })
        .then(() => {
            lastMongoError = null;
            console.log('Connected to MongoDB Atlas');
            return true;
        })
        .catch(err => {
            lastMongoError = err;
            console.error('MongoDB connection failed:', err.message);
            return false;
        })
        .finally(() => {
            mongoConnectPromise = null;
        });

    return mongoConnectPromise;
};

const ensurePersistentStore = async () => {
    if (shouldUseMockStore()) return false;
    if (mongoose.connection.readyState === 1) return true;
    return await connectToMongo();
};

const createStorageStatus = (overrides = {}) => ({
    mode: shouldUseMockStore() ? 'mock' : 'mongo',
    persistent: !shouldUseMockStore(),
    available: shouldUseMockStore() || mongoose.connection.readyState === 1,
    message: shouldUseMockStore()
        ? (
            looksLikePlaceholder(MONGO_URI)
                ? 'Live save is disabled because MONGO_URI is still using a placeholder value. Set the real MongoDB Atlas connection string in the backend environment.'
                : 'Demo mode is active. Configure MONGO_URI to keep data permanently.'
        )
        : (lastMongoError?.message || null),
    ...overrides
});

const getStorageStatus = async () => {
    if (shouldUseMockStore()) {
        return createStorageStatus();
    }

    const connected = await ensurePersistentStore();
    if (connected) {
        return createStorageStatus({ mode: 'mongo', persistent: true, available: true, message: null });
    }

    return createStorageStatus({
        mode: 'mongo_unavailable',
        persistent: true,
        available: false,
        message: 'MongoDB is configured but not reachable right now. Live saves are paused until the database reconnects.'
    });
};

const respondStorageUnavailable = async (res) => {
    const storage = await getStorageStatus();
    return res.status(503).json({
        error: storage.message || 'Persistent storage is temporarily unavailable.',
        code: 'STORAGE_UNAVAILABLE',
        storage
    });
};

const initDB = () => {
    if (HAS_MONGO_URI) {
        connectToMongo();
        mongoose.connection.on('disconnected', () => {
            console.warn('MongoDB disconnected. Live saves are paused until the connection returns.');
            setTimeout(() => {
                if (mongoose.connection.readyState === 0) {
                     console.log('Attempting to reconnect to MongoDB...');
                     connectToMongo();
                }
            }, 5000);
        });
    } else {
        console.warn('MONGO_URI not configured. Using in-memory mock data.');
    }
};

module.exports = {
    shouldUseMockStore,
    ensurePersistentStore,
    getStorageStatus,
    respondStorageUnavailable,
    initDB
};
