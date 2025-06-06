import { Router } from "express";
import { 
    changeCurrentPassword, 
    fetchUserDetails, 
    getCurrentUser, 
    getUserChannelProfile, 
    getWatchHistory, 
    refreshAccessToken, 
    updateAccountDetails, 
    updateUserAvatar, 
    updateUserCoverImage, 
    userLogin, 
    userLogout, 
    userRegisteration
 } from "../controllers/user.controller.js";
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

//secured routes

router.route("/logout").post(verifyJWT, userLogout)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/details").get(verifyJWT, fetchUserDetails)
router.route("/detail/:userId").get(verifyJWT, fetchUserDetails)
router.route("/update/passwrod").post(verifyJWT, changeCurrentPassword)
router.route("/getCurrentUser").get(verifyJWT, getCurrentUser)
router.route("/account/update").patch(verifyJWT, updateAccountDetails)
router.route("/avatar/update").patch(verifyJWT, upload.single("avatar"), updateUserAvatar)
router.route("/cover-image/update").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage)
router.route("/channel/:username").get(verifyJWT, getUserChannelProfile)
router.route("/history").get(verifyJWT, getWatchHistory)

export default router