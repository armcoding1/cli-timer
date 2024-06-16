import os from "os";
import path from "path";
import fs from "fs";

const homeDir = os.homedir();
const isWindows = os.type().match(/windows/i);
const sessionFileName = path.join(homeDir, `${isWindows ? "_" : "."}sb-timers-session`);

export const logout = (req, res) => {
    fs.unlink(sessionFileName, (err) => {
        if (err) {
            console.error('error removing file:', err);
            return;
        }
        console.log('File successfully removed:', sessionFileName);
    });
    res.redirect("/login");
};