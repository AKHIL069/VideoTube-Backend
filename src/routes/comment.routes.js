import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware";
import { addComment, deleteComment, updateComment } from "../controllers/comment.controller";

const router = Router()

router.route("/add").post(verifyJWT, addComment)
router.route("/update/:commentId").patch(verifyJWT, updateComment)
router.route("/delete/:commentId").delete(verifyJWT, deleteComment)


export default router