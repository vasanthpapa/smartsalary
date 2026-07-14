require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Attendance = require('./server/models/Attendance');

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/salary');
        console.log('Connected to DB');
        
        // Find some records with non-empty time
        const records = await Attendance.find({ time: { $ne: '' } }).limit(10).lean();
        console.log('Sample Attendance Records:');
        console.log(JSON.stringify(records, null, 2));
        
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

check();
