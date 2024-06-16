import Router from "express";
import { login } from "../controllers/loginController.js";
const loginRouter = Router();

loginRouter.post("/", login);

export default loginRouter;