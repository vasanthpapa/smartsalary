const mongoose = require('mongoose');
const AttendanceSchema = new mongoose.Schema({
    date: String, employeeId: String, status: String, time: String
});
AttendanceSchema.index({ date: 1, employeeId: 1 }, { unique: true });
module.exports = mongoose.model('Attendance', AttendanceSchema);
