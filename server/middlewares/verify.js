import jwt from "jsonwebtoken";
import os from "os";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

const homeDir = os.homedir();
const isWindows = os.type().match(/windows/i);
const sessionFileName = path.join(homeDir, `${isWindows ? "_" : "."}sb-timers-session`);

export const verifyToken = (req, res, next) => {
    const sessionFileData = JSON.parse(fs.readFileSync(sessionFileName, "utf-8"));
    const token = sessionFileData.token;
    if (token) {
        jwt.verify(token, process.env.JWT_SECRET, (err, decodenodToken) => {
            if (err) {
                console.log(err.message);
                res.redirect("/login");
            } else {
                next();
            }
        });
    } else {
        next();
    }
};