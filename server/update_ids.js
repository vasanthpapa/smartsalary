const mongoose = require('mongoose');
const Employee = require('./models/Employee');
const Attendance = require('./models/Attendance');
const dotenv = require('dotenv');

dotenv.config({ path: '../.env' });
const MONGO_URI = process.env.MONGO_URI;

const idMap = {
    '00001011': '1011',
    '00001013': '1013',
    'E5': '1014',
    'E6': '1015',
    'E7': '1017',
    'E8': '1018',
    'E9': '1019',
    'E10': '1021',
    'E11': '1023',
    'MBT1013': '0102',
    '00002011': '2011',
    'E13': '2012',
    'E14': '2014',
    'E15': '2015',
    '00002016': '2016',
    'E17': '2017',
    'E18': '2018',
    '00002024': '2024',
    'E20': '2025',
    '00002026': '2026',
    'E23': '2027',
};

const run = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB');

        for (const [oldId, newId] of Object.entries(idMap)) {
            // Check if employee with oldId exists
            const emp = await Employee.findOne({ id: oldId });
            if (emp) {
                // Check if newId already exists (to prevent unique constraint error)
                const existingNew = await Employee.findOne({ id: newId });
                if (existingNew) {
                    console.log(`Skipping ID update for ${emp.name} because new ID ${newId} is already in use.`);
                    continue;
                }
                
                await Employee.updateOne({ id: oldId }, { $set: { id: newId } });
                console.log(`Updated Employee ID for ${emp.name} from ${oldId} to ${newId}`);

                // Migrate attendance records
                const attRes = await Attendance.updateMany({ employeeId: oldId }, { $set: { employeeId: newId } });
                console.log(`Migrated ${attRes.modifiedCount} attendance records for ${emp.name}`);
            } else {
                console.log(`Employee with ID ${oldId} not found in DB. Skipping.`);
            }
        }
        console.log('Migration complete.');
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

run();
