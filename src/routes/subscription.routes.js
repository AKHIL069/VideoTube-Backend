import { Router } from "express";
import { addSubscription } from "../controllers/subscriber.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/create").post(verifyJWT, addSubscription)

export default router