import Router from "express";
import { allStatus, status } from "../controllers/statusController.js";
import { verifyToken } from "../middlewares/verify.js";
const statusRouter = Router();

statusRouter.get("/:timerId", verifyToken, status);
statusRouter.get("/", allStatus);

export default statusRouter;