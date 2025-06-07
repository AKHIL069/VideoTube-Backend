import { Router } from "express";
import { addSubscription, deleteSubscription } from "../controllers/subscriber.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/create").post(verifyJWT, addSubscription)
router.route("/remove/:subscriptionId").delete(verifyJWT, deleteSubscription)

export default router