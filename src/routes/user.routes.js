import { Router } from "express";
import { changeCurrentPassword, fetchUserDetails, getCurrentUser, refreshAccessToken, updateAccountDetails, updateUserAvatar, updateUserCoverImage, userLogin, userLogout, userRegisteration } from "../controllers/user.controller.js";
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
router.route("/details").get(verifyJWT, fetchUserDetails)
router.route("/detail/:userId").get(verifyJWT, fetchUserDetails)
router.route("/update/passwrod").post(verifyJWT, changeCurrentPassword)
router.route("/getCurrentUser").get(verifyJWT, getCurrentUser)
router.route("/account/update").post(verifyJWT, updateAccountDetails)
router.route("/avatar/update").post(verifyJWT, updateUserAvatar)
router.route("/cover-image/update").post(verifyJWT, updateUserCoverImage)

//secured routes

router.route("/logout").post(verifyJWT, userLogout)
router.route("/refresh-token").post(refreshAccessToken)

export default router