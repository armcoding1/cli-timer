import Router from "express";
import { startTimer, stopTimer } from "../controllers/timerController.js";
import { verifyToken } from "../middlewares/verify.js";
const timerRouter = Router();

timerRouter.post("/", verifyToken, startTimer);
timerRouter.post("/stop/:timerId", verifyToken, stopTimer);

export default timerRouter; 