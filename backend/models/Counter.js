// ======================================
// Sentinel SIEM - Counter Model
// models/Counter.js
// ======================================

const mongoose = require("mongoose");

// Atomic sequence generator, used to hand out gapless "INC-1001" style ids.
// findOneAndUpdate with $inc is atomic, so concurrent incident creation
// cannot collide the way a countDocuments()+1 approach would.

const counterSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
            unique: true
        },

        value: {
            type: Number,
            default: 0
        }
    }
);

const Counter = mongoose.model("Counter", counterSchema);

// Returns the next value for a key. A start of 1000 yields 1001, 1002, ...
//
// Expressed as an aggregation pipeline rather than a plain $inc/$setOnInsert
// pair. Both operators cannot target `value` in one classic update: MongoDB
// rejects that with "Updating the path 'value' would create a conflict at
// 'value'". Splitting the initialisation and the bump into two $set stages
// keeps it a single atomic round trip, so concurrent callers still cannot
// collide the way a countDocuments()+1 approach would.
//
// On upsert the field is missing, so the first stage stores `start` and the
// second turns it into start+1.
const nextValue = async (key, start = 1000) => {

    const counter = await Counter.findOneAndUpdate(
        { key },
        [
            { $set: { value: { $ifNull: ["$value", start] } } },
            { $set: { value: { $add: ["$value", 1] } } }
        ],
        { new: true, upsert: true }
    );

    return counter.value;

};

module.exports = Counter;
module.exports.nextValue = nextValue;
