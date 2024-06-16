import os from "os";
import path from "path";
import fs from "fs";
import Timer from "../models/Timer.js";
import User from "../models/User.js";

const homeDir = os.homedir();
const isWindows = os.type().match(/windows/i);
const sessionFileName = path.join(homeDir, `${isWindows ? "_" : "."}sb-timers-session`);

const formatTimeComponent = (component) => {
    return component.toString().padStart(2, '0');
};

export const allStatus = async (req, res) => {
    let sessionFileData;
    try {
        sessionFileData = JSON.parse(fs.readFileSync(sessionFileName, "utf-8"));
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error('Session file does not exist. Creating...');
            try {
                fs.writeFileSync(sessionFileName, JSON.stringify({}));
                console.log('Session file created successfully.');
                sessionFileData = {};
            } catch (err) {
                console.error('Error creating session file:', err);
                res.status(500).json({ error: 'Internal server error.' });
                return;
            }
        } else {
            console.error('Error reading session file:', error);
            res.status(500).json({ error: 'Internal server error.' });
            return;
        }
    }

    if (!sessionFileData) {
        res.status(401).json({ error: "User is not logged in." });
        console.log("User is not logged in.");
        return;
    }

    const userId = sessionFileData.userId;
    try {
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const timers = await Timer.find({ user_id: userId });

        if (!timers) {
            return res.status(404).json({ error: "No timers found" });
        };

        const currentTime = new Date().getTime();

        const timerData = timers.map(timer => {
            const elapsedTime = currentTime - timer.start_time;
            const hours = Math.floor(elapsedTime / (1000 * 60 * 60));
            const minutes = Math.floor((elapsedTime % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((elapsedTime % (1000 * 60)) / 1000);
            const formattedTime = `${formatTimeComponent(hours)}:${formatTimeComponent(minutes)}:${formatTimeComponent(seconds)}`;
            let formattedStoppedTime;
            if (timer.stoppedTime) {
                const hoursStop = Math.floor(timer.stoppedTime / (1000 * 60 * 60));
                const minutesStop = Math.floor((timer.stoppedTime % (1000 * 60 * 60)) / (1000 * 60));
                const secondsStop = Math.floor((timer.stoppedTime % (1000 * 60)) / 1000);
                formattedStoppedTime = `${formatTimeComponent(hoursStop)}:${formatTimeComponent(minutesStop)}:${formatTimeComponent(secondsStop)}`;
            }

            return {
                id: timer._id,
                task: timer.timer_name,
                formattedTime,
                stopped: formattedStoppedTime,
                userId
            };
        });

        if (!timerData) {
            return res.status(404).json({ error: "Timer not found for this user" });
        }
        res.status(200).json(timerData);
    } catch (error) {
        console.error('Error fetching timer data:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};


// export const status = async (req, res) => {
//     const { timerId } = req.params;
//     console.log('Received timerId:', timerId);

//     try {
//         const timer = await Timer.findById(timerId);
//         console.log('Found timer:', timer);
//         if (!timer) {
//             return res.status(404).json({ error: 'Timer not found' });
//         }

//         let formattedTime;
//         if (timer.stoppedTime) {
//             const hours = Math.floor(timer.stoppedTime / (1000 * 60 * 60));
//             const minutes = Math.floor((timer.stoppedTime % (1000 * 60 * 60)) / (1000 * 60));
//             const seconds = Math.floor((timer.stoppedTime % (1000 * 60)) / 1000);
//             formattedTime = `${formatTimeComponent(hours)}:${formatTimeComponent(minutes)}:${formatTimeComponent(seconds)}`;
//         } else {
//             const currentTime = new Date().getTime();
//             const elapsedTime = currentTime - timer.start_time;
//             const hours = Math.floor(elapsedTime / (1000 * 60 * 60));
//             const minutes = Math.floor((elapsedTime % (1000 * 60 * 60)) / (1000 * 60));
//             const seconds = Math.floor((elapsedTime % (1000 * 60)) / 1000);
//             formattedTime = `${formatTimeComponent(hours)}:${formatTimeComponent(minutes)}:${formatTimeComponent(seconds)}`;
//         }

//         console.log('Sending response:', { id: timer._id, task: timer.timer_name, formattedTime });
//         res.status(200).json({ id: timer._id, task: timer.timer_name, formattedTime });
//     } catch (error) {
//         console.error('Error fetching timer data:', error);
//         res.status(500).json({ error: 'Internal server error.' });
//     }
// };
