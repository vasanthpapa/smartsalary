const mongoose = require('mongoose');
const EmployeeSchema = new mongoose.Schema({
    id: { type: String, unique: true },
    name: String,
    email: String,
    phone: String,
    dob: String,
    address: String,
    aadhaarNumber: String,
    bankName: String,
    bankAccount: String,
    bankIfsc: String,
    role: String,
    dept: String,
    employmentType: String,
    joinDate: String,
    salary: Number,
    checkin: String,
    weekoffs: [Number]
});
module.exports = mongoose.model('Employee', EmployeeSchema);
