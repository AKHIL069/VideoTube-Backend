import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { Comment } from "../models/comment.models.js";

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid or missing video ID");
    }

    const skip = (page - 1) * limit;

    const comments = await Comment.find({ video: videoId })
                                .sort({ createdAt: -1 }) // most recent first
                                .skip(skip)
                                .limit(limit)
    
    if (!comments) {
       throw new ApiError(400, "No comments found with the video id") 
    }

    const totalComments = await Comment.countDocuments({ video: videoId });

    commentDetails = {
        currentPage: page,
        totalPages: Math.ceil(totalComments / limit),
        totalComments,
        comments
    }

    return res
    .status(200)
    .json(new ApiResponse(200, commentDetails, "All comments fetched successfully"))

})

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

export { getVideoComments, addComment, updateComment, deleteComment }