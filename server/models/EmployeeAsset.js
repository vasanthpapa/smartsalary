const mongoose = require('mongoose');

const EmployeeAssetSchema = new mongoose.Schema({
    employeeId: { type: String, required: true, index: true },
    type: {
        type: String,
        required: true,
        enum: ['photo', 'aadhaar', 'bank', 'voterId', 'drivingLicence']
    },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true, select: false }
}, { timestamps: true });

EmployeeAssetSchema.index({ employeeId: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('EmployeeAsset', EmployeeAssetSchema);
