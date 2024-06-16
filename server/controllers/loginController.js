import User from "../models/User.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export const login = async (req, res) => {
    const { name, password } = req.body;

    try {
        const user = await User.findOne({ name });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (!(await user.correctPassword(password, user.password))) {
            return res.status(401).json({ message: "Incorrect password" });
        }
        const id = user._id;
        const token = jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES });

        res.send({ userId: id, token });
    } catch (error) {
        console.error("Authorization error:", error);
        res.status(500).json({ message: "Authorization error" });
    }
};
