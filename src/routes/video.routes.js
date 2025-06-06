import { Router } from "express"
import { getAllUserVideos, getAllVideos, getVideoById, publishVideos, togglePublishStatus, updateVideo } from "../controllers/video.controller.js"
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"

const router = Router()

router.route("/upload").post(
    upload.fields([
        {
            name: "videoFile",
            maxCount: 1
        },
        {
            name: "thumbnail",
            maxCount: 1
        }
    ]),
    verifyJWT,
    publishVideos
)
router.route("/fetch/filters").get(verifyJWT, getAllVideos)
router.route("/fetch/:userId").get(verifyJWT, getAllUserVideos)
router.route("/fetch/byId/:videoId").get(verifyJWT, getVideoById)
router.route("/update/:videoId").patch(verifyJWT, updateVideo)
router.route("/flag/update/:videoId").patch(verifyJWT, togglePublishStatus)

export default router