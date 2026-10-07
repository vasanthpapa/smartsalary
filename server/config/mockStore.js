let mockEmployees = [];
const mockEmployeeAssets = new Map();

let mockAttendance = {};
let mockRules = { grace: 10, lateN: 3, lateType: 'halfday', lateFixed: 500 };

module.exports = { mockEmployees, mockEmployeeAssets, mockAttendance, mockRules };
