import User from "../models/User.js";

export const signup = async (req, res) => {
    const { name, password } = req.body;

    try {
        const user = await User.create({ name, password });
        const id = user._id;
        res.send({ userId: id });
    } catch (error) {
        if (error.code === 11000 && error.keyPattern && error.keyPattern.name === 1) {
            return res.status(400).json({ message: "User with this username already exists" });
        }
        return res.status(500).json({ message: "Error signing up" });
    }
};
