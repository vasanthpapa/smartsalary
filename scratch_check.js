require('dotenv').config();
const mongoose = require('mongoose');
const { syncBiometricAttendance } = require('./server/services/biometricSync');

async function sync() {
    await mongoose.connect(process.env.MONGO_URI);
    
    console.log("Running manual full sync...");
    const result = await syncBiometricAttendance('2026-04-30', null, false);
    console.log("Sync count:", result.count);
    
    mongoose.disconnect();
}

sync();
