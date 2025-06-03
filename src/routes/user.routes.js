import { Router } from "express";
import { fetchUserDetails, refreshAccessToken, userLogin, userLogout, userRegisteration } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";


const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    userRegisteration
)
router.route("/login").post(userLogin)
router.route("/data").get(verifyJWT, fetchUserDetails)
router.route("/data/:userId").get(verifyJWT, fetchUserDetails)

//secured routes

router.route("/logout").post(verifyJWT, userLogout)
router.route("/refresh-token").post(refreshAccessToken)

export default router