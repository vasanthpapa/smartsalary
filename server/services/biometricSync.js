const axios = require('axios');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');

const getBiometricConfigs = () => {
    // Array of machine configs
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

// Helper to add minutes to a HH:mm string
const addMinutesToTime = (timeStr, minsToAdd) => {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':').map(Number);
    const date = new Date(2000, 0, 1, h, m);
    date.setMinutes(date.getMinutes() + minsToAdd);
    const newH = String(date.getHours()).padStart(2, '0');
    const newM = String(date.getMinutes()).padStart(2, '0');
    return `${newH}:${newM}`;
};

const syncBiometricAttendance = async (dateStr, io, previewOnly = false) => {
    try {
        console.log(`[BiometricSync] Starting sync for date: ${dateStr}`);

        // Convert YYYY-MM-DD to DD/MM/YYYY for the API
        const [year, month, day] = dateStr.split('-');
        const apiDateStr = `${day}/${month}/${year}`;

        const configs = getBiometricConfigs();
        let allPunchData = [];

        for (const config of configs) {
            const credentials = getBiometricCredentials(config);
            const url = `https://api.etimeoffice.com/api/DownloadInOutPunchData?Empcode=ALL&FromDate=${apiDateStr}&ToDate=${apiDateStr}`;

            try {
                const response = await axios.get(url, {
                    headers: { 'Authorization': credentials }
                });

                if (response.data.Error || !response.data.InOutPunchData) {
                    console.error(`[BiometricSync] API returned error or no data for CorpID ${config.corpId}:`, response.data);
                } else {
                    allPunchData = allPunchData.concat(response.data.InOutPunchData);
                    console.log(`[BiometricSync] Fetched ${response.data.InOutPunchData.length} records from ${config.corpId}`);
                }
            } catch (err) {
                console.error(`[BiometricSync] Request failed for CorpID ${config.corpId}:`, err.message);
            }
        }

        if (allPunchData.length === 0) {
            console.error(`[BiometricSync] No data retrieved from any biometric machines.`);
            return { success: false, message: 'No data retrieved from any machine.' };
        }

        const punchData = allPunchData;
        const employees = await Employee.find().lean();
        const empMap = {};
        const nameMap = {};

        employees.forEach(emp => {
            empMap[emp.id] = emp;
            // Create a normalized version of the name for fallback matching (lowercase, no spaces/special chars)
            if (emp.name) {
                const normalizedName = emp.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                nameMap[normalizedName] = emp;
            }
        });

        const recordsToUpdate = [];

        for (const emp of employees) {
            // Find their punch record from the biometric data
            let record = punchData.find(p => p.Empcode === emp.id);
            
            // Fallback: Try to match by name if ID doesn't match
            if (!record && emp.name) {
                const localName = emp.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                record = punchData.find(p => p.Name && p.Name.toLowerCase().replace(/[^a-z0-9]/g, '') === localName);
                if (record) {
                    console.log(`[BiometricSync] Mapped Biometric ID ${record.Empcode} (${record.Name}) to Local Employee ${emp.id} (${emp.name}) via Name Match`);
                }
            }

            const inTime = record?.INTime && record.INTime !== '--:--' ? record.INTime : '';
            const outTime = record?.OUTTime && record.OUTTime !== '--:--' ? record.OUTTime : '';
            const workTime = record?.WorkTime && record.WorkTime !== '--:--' ? record.WorkTime : '';

            let finalStatus = '';

            if (inTime) {
                finalStatus = 'present';
                
                // Apply late logic (10 mins grace)
                const checkInTime = emp.checkin || '09:00';
                const limitTime = addMinutesToTime(checkInTime, 10);

                if (inTime > limitTime) {
                    finalStatus = 'late';
                }

                // Apply half-day logic
                if (outTime && outTime < '13:00') {
                    finalStatus = 'half-day';
                }
            } else {
                // If there is NO punch in, mark them as weekoff automatically
                finalStatus = 'weekoff';
            }

            recordsToUpdate.push({
                date: dateStr,
                employeeId: emp.id,
                status: finalStatus,
                time: inTime,
                outTime: outTime,
                workTime: workTime,
                isBiometric: true
            });
        }

        if (recordsToUpdate.length > 0 && !previewOnly) {
            await Attendance.bulkWrite(
                recordsToUpdate.map(rec => ({
                    updateOne: {
                        filter: { date: rec.date, employeeId: rec.employeeId },
                        update: { $set: rec },
                        upsert: true
                    }
                })),
                { ordered: false }
            );
            console.log(`[BiometricSync] Synced ${recordsToUpdate.length} records to DB.`);
            if (io) {
                io.emit('state_changed', { type: 'attendance' });
            }
        } else if (previewOnly) {
            console.log(`[BiometricSync] Preview mode: Fetched ${recordsToUpdate.length} records without updating DB.`);
        }

        return { success: true, count: recordsToUpdate.length, records: recordsToUpdate };
    } catch (error) {
        console.error('[BiometricSync] Error syncing:', error.message);
        return { success: false, message: error.message };
    }
};

module.exports = { syncBiometricAttendance, getBiometricConfigs, getBiometricCredentials };
