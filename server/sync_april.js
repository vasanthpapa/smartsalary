require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { initDB } = require('./config/db');
const { syncBiometricAttendance } = require('./services/biometricSync');

async function run() {
    await initDB();
    
    // Wait a bit for connection
    await new Promise(r => setTimeout(r, 2000));

    console.log("Starting batch sync for April 1st to April 29th...");
    for (let i = 1; i <= 29; i++) {
        const day = String(i).padStart(2, '0');
        const dateStr = `2026-04-${day}`;
        console.log(`\nSyncing for ${dateStr}...`);
        try {
            await syncBiometricAttendance(dateStr, null);
        } catch (e) {
            console.error(`Failed to sync for ${dateStr}:`, e);
        }
        await new Promise(r => setTimeout(r, 1000)); // Delay to prevent spamming the API
    }
    
    console.log("\nDone syncing all past dates.");
    process.exit(0);
}

run();
