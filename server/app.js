import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";
import Timer from "./models/Timer.js";
import jwt from "jsonwebtoken";
import fs from "fs";
import os from "os";
import path from "path";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const homeDir = os.homedir();
const isWindows = os.type().match(/windows/i);
const sessionFileName = path.join(homeDir, `${isWindows ? "_" : "."}sb-timers-session`);

app.use(bodyParser.json());
app.use(cookieParser());

io.on("connection", (socket) => {
    console.log("Client connected");

    const formatTime = (time) => {
        const hours = Math.floor(time / (1000 * 60 * 60));
        const minutes = Math.floor((time % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((time % (1000 * 60)) / 1000);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };
    
    const timerUpdateInterval = setInterval(async () => {
        const users = await User.find();
        const timersData = await Promise.all(users.map(async (user) => {
            const timers = await Timer.find({ user_id: user._id });
            const currentTime = new Date().getTime();
    
            return timers.map(timer => {
                const elapsedTime = currentTime - timer.start_time;
                const formattedTime = formatTime(elapsedTime);
    
                if (timer.stoppedTime !== 0) {
                    const formattedStoppedTime = formatTime(timer.stoppedTime);
                    return {
                        id: timer._id,
                        task: timer.timer_name,
                        formattedTime,
                        stopped: formattedStoppedTime,
                        userId: user._id
                    };
                } else {
                    return {
                        id: timer._id,
                        task: timer.timer_name,
                        formattedTime,
                        userId: user._id
                    };
                }
            });
        }));
    
        io.emit("timer_update", { timers: timersData.flat() });
    }, 1000);
    

    socket.on("signup", async (data, callback) => {
        const { name, password } = data;
        try {
            const user = await User.create({ name, password });
            const id = user._id;
            callback({ userId: id });
        } catch (error) {
            if (error.code === 11000 && error.keyPattern && error.keyPattern.name === 1) {
                return callback({ error: "User with this username already exists" });
            }
            return callback({ error: "Error signing up" });
        }
    });

    socket.on("login", async (data, callback) => {
        const { name, password } = data;
        try {
            const user = await User.findOne({ name });
            if (!user) {
                return callback({ error: "User not found" });
            }

            if (!(await user.correctPassword(password, user.password))) {
                return callback({ error: "Incorrect password" });
            }

            const id = user._id;
            const token = jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES });

            callback({ userId: id, token });
        } catch (error) {
            console.error("Authorization error:", error);
            callback({ error: "Authorization error" });
        }
    });

    socket.on("start_timer", async (data, callback) => {
        const { timerName, userId } = data;
        try {
            const existingTimer = await Timer.findOne({ timer_name: timerName, user_id: userId });

            if (existingTimer) {
                return callback({ error: 'Timer with this name already exists.' });
            }
            const startTime = new Date().getTime();

            const result = await Timer.create({
                timer_name: timerName,
                user_id: userId,
                start_time: startTime
            });

            callback({ message: 'Timer started successfully.' });
        } catch (error) {
            console.error('Error starting timer:', error);
            callback({ error: 'Internal server error.' });
        }
    });

    socket.on("stop_timer", async (data, callback) => {
        const { timerId } = data;
        try {
            const timer = await Timer.findById(timerId);

            if (!timer) {
                return callback({ error: 'Timer not found.' });
            }

            const currentTime = new Date().getTime();
            const stoppedTime = currentTime - timer.start_time;

            await Timer.findByIdAndUpdate(timerId, { stoppedTime: stoppedTime });
            callback({ message: "Timer stopped successfully!" });
        } catch (error) {
            console.error('Error stopping timer:', error);
            callback({ error: 'Internal server error.' });
        }
    });

    socket.on("get_status", async (data, callback) => {
        try {
            const sessionFileData = JSON.parse(fs.readFileSync(sessionFileName, "utf-8"));
            const { userId } = sessionFileData;

            if (!userId) {
                callback({ error: "User is not logged in." });
                console.log("User is not logged in.");
                return;
            }

            const user = await User.findById(userId);

            if (!user) {
                return callback({ error: 'User not found' });
            }

            const timers = await Timer.find({ user_id: userId });

            if (!timers || timers.length === 0) {
                return callback({ error: "No timers found" });
            }

            const currentTime = new Date().getTime();

            const timerData = timers.map(timer => {
                const elapsedTime = currentTime - timer.start_time;
                const hours = Math.floor(elapsedTime / (1000 * 60 * 60));
                const minutes = Math.floor((elapsedTime % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((elapsedTime % (1000 * 60)) / 1000);
                const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

                if (timer.stoppedTime !== 0) {
                    const hoursStop = Math.floor(timer.stoppedTime / (1000 * 60 * 60));
                    const minutesStop = Math.floor((timer.stoppedTime % (1000 * 60 * 60)) / (1000 * 60));
                    const secondsStop = Math.floor((timer.stoppedTime % (1000 * 60)) / 1000);
                    const formattedStoppedTime = `${hoursStop.toString().padStart(2, '0')}:${minutesStop.toString().padStart(2, '0')}:${secondsStop.toString().padStart(2, '0')}`;

                    return {
                        id: timer._id,
                        task: timer.timer_name,
                        formattedTime,
                        stopped: formattedStoppedTime,
                        userId
                    };
                } else {
                    return {
                        id: timer._id,
                        task: timer.timer_name,
                        formattedTime,
                        userId
                    };
                }
            });

            callback(timerData);
        } catch (error) {
            console.error('Error fetching timer data:', error);
            callback({ error: 'Internal server error.' });
        }
    });


    socket.on("logout", (data, callback) => {
        callback({ message: "Logged out successfully!" });
    });

    socket.on("disconnect", () => {
        console.log("Client disconnected");
    });
});

const MONGO_URL = process.env.MONGO_URL;
mongoose.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("Database is successfully connected"))
    .catch((err) => console.error("Database connection error:", err));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
