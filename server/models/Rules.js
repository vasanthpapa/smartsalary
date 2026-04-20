const mongoose = require('mongoose');
const RulesSchema = new mongoose.Schema({ grace: Number, lateN: Number, lateType: String, lateFixed: Number });
module.exports = mongoose.model('Rules', RulesSchema);
