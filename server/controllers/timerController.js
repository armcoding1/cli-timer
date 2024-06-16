import os from "os";
import path from "path";
import fs from "fs";
import Timer from "../models/Timer.js";

const homeDir = os.homedir();
const isWindows = os.type().match(/windows/i);
const sessionFileName = path.join(homeDir, `${isWindows ? "_" : "."}sb-timers-session`);

export const startTimer = async (req, res) => {
    const sessionFileData = JSON.parse(fs.readFileSync(sessionFileName, "utf-8"));
    
    const userId = sessionFileData.userId
    const { timerName } = req.body;
    try {
        const existingTimer = await Timer.findOne({ timer_name: timerName, user_id: userId });

        if (existingTimer) {
            return res.status(400).json({ error: 'Timer with this name already exists.' });
        }
        const startTime = new Date().getTime();

        const result = await Timer.create({
            timer_name: timerName,
            user_id: userId,
            start_time: startTime
        });

        return res.status(200).json({ message: 'Timer started successfully.'});
    } catch (error) {
        console.error('Error starting timer:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}

export const stopTimer = async (req, res) => {
    const { timerId } = req.params;
    try {
        const timer = await Timer.findById(timerId);

        if (!timer) {
            return res.status(404).json({ error: 'Timer not found.' });
        }

        const currentTime = new Date().getTime();
        const stoppedTime = currentTime - timer.start_time;

        const updatedTimer = await Timer.findByIdAndUpdate(timerId, { stoppedTime });
        console.log(stoppedTime);
        res.send("Timer stopped");
    } catch (error) {
        console.error('Error stopping timer:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};
