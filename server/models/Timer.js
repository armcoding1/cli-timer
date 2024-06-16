import { Schema, model, Types } from "mongoose";

const timerSchema = Schema({
    timer_name: {
        type: String,
        required: [true, "Please provide timer name"]
    },
    user_id: {
        type: Types.ObjectId,
        ref: "Users",
        onDelete: "CASCADE",
    },
    start_time: Number,
    stoppedTime: {
        type: Number,
        default: 0
    }
});

export default model("Timer", timerSchema);
