import { Schema, model } from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new Schema({
    name: {
        type: String,
        required: [true, "Please provide your name"],
        unique: true
    },
    password: {
        type: String,
        required: [true, "Please provide your password"]
    }
});

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    const salt = await bcrypt.genSalt();
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.correctPassword = async (candidatePassword, password) => {
    return await bcrypt.compare(candidatePassword, password);
};

export default model("User", userSchema);