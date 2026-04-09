require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = Number(process.env.PORT) || 3000;
const MONGO_URI = process.env.MONGO_URI;
const HAS_MONGO_URI = Boolean(MONGO_URI) && !MONGO_URI.includes("REPLACE_WITH");
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Middleware
app.use(cors());
app.use(express.json());

// Memory Store for Mock Mode
let mockEmployees = [
    { id: 'E1', name: 'Arunkumar', role: 'Web developer', dept: 'Operations', salary: 18200, checkin: '09:00', weekoffs: [0] },
    { id: 'E2', name: 'Sireesha', role: 'RM', dept: 'Operations', salary: 17010, checkin: '09:00', weekoffs: [0] },
    { id: 'E3', name: 'Vasanth', role: 'Data Admin', dept: 'Operations', salary: 12000, checkin: 'flexible', weekoffs: [0] },
    { id: 'E4', name: 'Devesh', role: 'Media Admin', dept: 'Operations', salary: 15348, checkin: '09:00', weekoffs: [0] },
    { id: 'E5', name: 'Naresh', role: 'Media', dept: 'Operations', salary: 12000, checkin: '09:00', weekoffs: [0] },
    { id: 'E6', name: 'Shruthi', role: 'Media', dept: 'Operations', salary: 11000, checkin: '09:00', weekoffs: [0] },
    { id: 'E7', name: 'Ragavi', role: 'Media', dept: 'Operations', salary: 10000, checkin: '09:00', weekoffs: [0] },
    { id: 'E8', name: 'Vishnukumar', role: 'Data', dept: 'Operations', salary: 12000, checkin: '09:00', weekoffs: [0] },
    { id: 'E9', name: 'Vishnupriya', role: 'HouseKeeping', dept: 'Operations', salary: 5500, checkin: '08:30', weekoffs: [0] },
    { id: 'E10', name: 'Gunasri', role: 'RM', dept: 'Operations', salary: 10000, checkin: '09:00', weekoffs: [0] },
    { id: 'E11', name: 'Shanmugapriya', role: 'Media', dept: 'Operations', salary: 9000, checkin: '09:00', weekoffs: [0] },
    { id: 'E12', name: 'Gokul', role: 'Cook & Field', dept: 'Operations', salary: 15000, checkin: '08:00', weekoffs: [0] },
    { id: 'E13', name: 'Sivasankari', role: 'Cook', dept: 'Operations', salary: 9000, checkin: '08:30', weekoffs: [0] },
    { id: 'E14', name: 'Meena', role: 'HouseKeeper', dept: 'Operations', salary: 8000, checkin: '08:00', weekoffs: [0] },
    { id: 'E15', name: 'Jayamala', role: 'HouseKeeper', dept: 'Operations', salary: 8000, checkin: '08:00', weekoffs: [0] },
    { id: 'E16', name: 'Girija', role: 'Helper', dept: 'Operations', salary: 5500, checkin: '08:00', weekoffs: [0] },
    { id: 'E17', name: 'Prathap', role: 'Driver', dept: 'Operations', salary: 12000, checkin: '08:00', weekoffs: [0] },
    { id: 'E18', name: 'Rajesh', role: 'Field Work', dept: 'Operations', salary: 12000, checkin: '08:00', weekoffs: [0] },
    { id: 'E19', name: 'Gopinath', role: 'Field Work', dept: 'Operations', salary: 10000, checkin: '08:00', weekoffs: [0] },
    { id: 'E20', name: 'Sarala', role: 'HouseKeeper', dept: 'Operations', salary: 7000, checkin: '08:00', weekoffs: [0] },
    { id: 'E21', name: 'Avinesh', role: 'Field Work', dept: 'Operations', salary: 10000, checkin: '08:00', weekoffs: [0] },
    { id: 'E22', name: 'Mohandass', role: 'Field Work', dept: 'Operations', salary: 9000, checkin: '08:00', weekoffs: [0] },
    { id: 'E23', name: 'Sanjay', role: 'Field Work', dept: 'Operations', salary: 10000, checkin: '08:00', weekoffs: [0] }
];

let mockAttendance = {};
let mockRules = { grace: 10, lateN: 3, lateType: 'halfday', lateFixed: 500 };

let mongoConnectPromise = null;
let lastMongoError = null;
const shouldUseMockStore = () => !HAS_MONGO_URI;

const createStorageStatus = (overrides = {}) => ({
    mode: shouldUseMockStore() ? 'mock' : 'mongo',
    persistent: !shouldUseMockStore(),
    available: shouldUseMockStore() || mongoose.connection.readyState === 1,
    message: shouldUseMockStore()
        ? 'Demo mode is active. Configure MONGO_URI to keep data permanently.'
        : (lastMongoError?.message || null),
    ...overrides
});

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

// MongoDB Connection
if (HAS_MONGO_URI) {
    connectToMongo();

    mongoose.connection.on('disconnected', () => {
        console.warn('MongoDB disconnected. Live saves are paused until the connection returns.');
    });
} else {
    console.warn('MONGO_URI not configured. Using in-memory mock data.');
}

// --- Schemas ---
const EmployeeSchema = new mongoose.Schema({
    id: { type: String, unique: true }, name: String, role: String, dept: String, salary: Number, checkin: String, weekoffs: [Number]
});
const Employee = mongoose.model('Employee', EmployeeSchema);

const AttendanceSchema = new mongoose.Schema({
    date: String, employeeId: String, status: String, time: String
});
AttendanceSchema.index({ date: 1, employeeId: 1 }, { unique: true });
const Attendance = mongoose.model('Attendance', AttendanceSchema);

const RulesSchema = new mongoose.Schema({ grace: Number, lateN: Number, lateType: String, lateFixed: Number });
const Rules = mongoose.model('Rules', RulesSchema);

const getEmployees = async () => {
    if (shouldUseMockStore()) return mockEmployees;

    const employees = await Employee.find().sort({ name: 1 }).lean();
    if (employees.length > 0) return employees;

    await Employee.insertMany(mockEmployees, { ordered: true });
    return await Employee.find().sort({ name: 1 }).lean();
};

// --- Routes ---
app.get('/health', async (req, res) => {
    const storage = await getStorageStatus();
    res.json({ ok: true, storage });
});

app.get('/api/system/status', async (req, res) => {
    const storage = await getStorageStatus();
    res.json({ storage, environment: IS_PRODUCTION ? 'production' : 'development' });
});

app.get('/api/employees', async (req, res) => {
    try {
        if (!shouldUseMockStore() && !(await ensurePersistentStore())) {
            return await respondStorageUnavailable(res);
        }
        res.json(await getEmployees());
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/employees/sync', async (req, res) => {
    try {
        const { employees } = req.body;
        if (shouldUseMockStore()) mockEmployees = employees;
        else {
            if (!(await ensurePersistentStore())) {
                return await respondStorageUnavailable(res);
            }
            await Employee.deleteMany({ id: { $nin: employees.map(emp => emp.id) } });
            for (let emp of employees) {
                await Employee.findOneAndUpdate({ id: emp.id }, emp, { upsert: true, new: true });
            }
        }
        io.emit('state_changed', { type: 'employees' });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/attendance', async (req, res) => {
    try {
        if (shouldUseMockStore()) return res.json(mockAttendance);
        if (!(await ensurePersistentStore())) {
            return await respondStorageUnavailable(res);
        }
        const data = await Attendance.find();
        const map = {};
        data.forEach(a => { if (!map[a.date]) map[a.date] = {}; map[a.date][a.employeeId] = { status: a.status, time: a.time }; });
        res.json(map);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/attendance', async (req, res) => {
    try {
        const record = req.body;
        if (shouldUseMockStore()) {
            if (!mockAttendance[record.date]) mockAttendance[record.date] = {};
            mockAttendance[record.date][record.employeeId] = { status: record.status, time: record.time };
        } else {
            if (!(await ensurePersistentStore())) {
                return await respondStorageUnavailable(res);
            }
            await Attendance.findOneAndUpdate(
                { date: record.date, employeeId: record.employeeId },
                record,
                { upsert: true, new: true }
            );
        }
        io.emit('state_changed', { type: 'attendance' });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/attendance/bulk', async (req, res) => {
    try {
        const { records } = req.body;
        if (shouldUseMockStore()) {
            records.forEach(rec => { if (!mockAttendance[rec.date]) mockAttendance[rec.date] = {}; mockAttendance[rec.date][rec.employeeId] = { status: rec.status, time: rec.time }; });
        } else {
            if (!(await ensurePersistentStore())) {
                return await respondStorageUnavailable(res);
            }
            for (let rec of records) await Attendance.findOneAndUpdate({ date: rec.date, employeeId: rec.employeeId }, rec, { upsert: true });
        }
        io.emit('state_changed', { type: 'attendance' });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/rules', async (req, res) => {
    try {
        if (shouldUseMockStore()) return res.json(mockRules);
        if (!(await ensurePersistentStore())) {
            return await respondStorageUnavailable(res);
        }
        const r = await Rules.findOne(); res.json(r || mockRules);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/rules', async (req, res) => {
    try {
        if (shouldUseMockStore()) Object.assign(mockRules, req.body);
        else {
            if (!(await ensurePersistentStore())) {
                return await respondStorageUnavailable(res);
            }
            await Rules.findOneAndUpdate({}, req.body, { upsert: true });
        }
        io.emit('state_changed', { type: 'rules' });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../client/dist')));
    app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../client/dist', 'index.html')));
}

server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use.`);
        console.error('Stop the process using that port or change PORT in .env, then restart the server.');
        process.exit(1);
    }

    console.error('Server failed to start:', error);
    process.exit(1);
});

server.listen(PORT, () => {
    console.log(`🚀 MERN Backend ACTIVE at http://localhost:${PORT}`);
});
