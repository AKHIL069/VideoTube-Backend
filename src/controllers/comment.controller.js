import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { Comment } from "../models/comment.models.js";

const addComment = asyncHandler(async (req, res) => {
    const { userId } = req.user?._id
    const { content, videoId } = req.body

    if (!(content, videoId)) {
        throw new ApiError(400, "Please provide all fields correctly")
    }

    const comment = await Comment.create({
        content,
        video: videoId,
        owner: userId
    })

    if (!comment) {
        throw new ApiError(400, "Comment can't be added do to some internal error")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, comment, "Comment added successfully"))
})

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    const { content } = req.body

    if (!content) {
        throw new ApiError(400, "Please provide content which we need to update")
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        {_id: commentId},
        {
            $set: {
                content: content
            }
        },
        {new: true}
    )

    if (!updatedComment) {
        throw new ApiError(400, "Comment not updated due to some internal error")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, updatedComment, "Comment updated successfully"))
})

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params

    if (!commentId) {
        throw new ApiError(400, "Please provide comment id for deleting that comment")
    }

    const comment = await Comment.findByIdAndDelete({_id: commentId})

    if (!comment) {
            throw new ApiError(404, "Cooment not found or already deleted");
        }
    
        res.status(200)
        .json(new ApiResponse(200, comment, "Comment deleted successfully"))
})

export { addComment, updateComment, deleteComment }