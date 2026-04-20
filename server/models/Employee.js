const mongoose = require('mongoose');
const EmployeeSchema = new mongoose.Schema({
    id: { type: String, unique: true }, name: String, role: String, dept: String, salary: Number, checkin: String, weekoffs: [Number]
});
module.exports = mongoose.model('Employee', EmployeeSchema);
