require('dotenv').config();
require('dns').setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const axios = require('axios');
const Employee = require('./server/models/Employee');

const getBiometricConfigs = () => {
    return [
        {
            corpId: process.env.ETIMEO_CORPORATE_ID || 'MICROBOTWARE',
            username: process.env.ETIMEO_USERNAME || 'DHAMODHARAN',
            password: process.env.ETIMEO_PASSWORD || 'sana@6789'
        },
        {
            corpId: process.env.ETIMEO_CORPORATE_ID_2 || 'SMARTHELP',
            username: process.env.ETIMEO_USERNAME_2 || 'DHAMODHARAN',
            password: process.env.ETIMEO_PASSWORD_2 || 'sana@6789'
        }
    ].filter(config => config.corpId && config.username && config.password);
};

const getBiometricCredentials = (config) => {
    const rawString = `${config.corpId}:${config.username}:${config.password}:true`;
    return `Basic ${Buffer.from(rawString).toString('base64')}`;
};

async function run() {
    try {
        await mongoose.connect("mongodb+srv://workspaceforva_db_user:Cocobebo17@lavanya.nanx4qp.mongodb.net/salarydb?retryWrites=true&w=majority&appName=lavanya");
        console.log("Connected to MongoDB Atlas");

        const date = new Date();
        const apiDateStr = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
        console.log("Fetching biometric employees for date:", apiDateStr);

        const configs = getBiometricConfigs();
        const biometricEmployees = [];
        const seenIds = new Set();

        for (const config of configs) {
            const credentials = getBiometricCredentials(config);
            const url = `https://api.etimeoffice.com/api/DownloadInOutPunchData?Empcode=ALL&FromDate=${apiDateStr}&ToDate=${apiDateStr}`;
            
            try {
                const response = await axios.get(url, { headers: { 'Authorization': credentials } });
                const data = response.data.InOutPunchData || [];
                console.log(`Fetched ${data.length} records from ${config.corpId}`);
                
                data.forEach(record => {
                    if (record.Empcode && !seenIds.has(record.Empcode)) {
                        seenIds.add(record.Empcode);
                        biometricEmployees.push({
                            id: record.Empcode,
                            name: record.Name || `Biometric Employee ${record.Empcode}`,
                            role: 'Employee',
                            dept: 'Biometric',
                            salary: 0,
                            checkin: '09:00',
                            weekoffs: []
                        });
                    }
                });
            } catch (err) {
                console.error(`Error fetching biometric IDs from ${config.corpId}:`, err.message);
            }
        }

        if (biometricEmployees.length === 0) {
            console.log("No biometric employees found active today. Trying a recent fallback date (30/04/2026) to retrieve all employees...");
            const fallbackDateStr = "30/04/2026";
            for (const config of configs) {
                const credentials = getBiometricCredentials(config);
                const url = `https://api.etimeoffice.com/api/DownloadInOutPunchData?Empcode=ALL&FromDate=${fallbackDateStr}&ToDate=${fallbackDateStr}`;
                
                try {
                    const response = await axios.get(url, { headers: { 'Authorization': credentials } });
                    const data = response.data.InOutPunchData || [];
                    console.log(`Fetched ${data.length} records from ${config.corpId} (fallback)`);
                    
                    data.forEach(record => {
                        if (record.Empcode && !seenIds.has(record.Empcode)) {
                            seenIds.add(record.Empcode);
                            biometricEmployees.push({
                                id: record.Empcode,
                                name: record.Name || `Biometric Employee ${record.Empcode}`,
                                role: 'Employee',
                                dept: 'Biometric',
                                salary: 0,
                                checkin: '09:00',
                                weekoffs: []
                            });
                        }
                    });
                } catch (err) {
                    console.error(`Error fetching biometric IDs from ${config.corpId} (fallback):`, err.message);
                }
            }
        }

        if (biometricEmployees.length === 0) {
            console.log("No employees found on either date.");
            mongoose.disconnect();
            return;
        }

        console.log(`Total unique biometric employees found: ${biometricEmployees.length}`);

        // Update database
        const operations = biometricEmployees.map(emp => ({
            updateOne: {
                filter: { id: emp.id },
                update: { $set: emp },
                upsert: true
            }
        }));

        await Employee.bulkWrite(operations, { ordered: false });
        console.log("Successfully synced employees in MongoDB!");

        const count = await Employee.countDocuments();
        console.log("Total Employees now in MongoDB:", count);

    } catch (e) {
        console.error("Error during manual employee sync:", e);
    } finally {
        mongoose.disconnect();
    }
}

run();
