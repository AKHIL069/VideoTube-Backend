import mongoose from "mongoose";
import { Video } from "../models/video.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId} = req.query

     if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid or missing userId");
    }

    const filters = {
        owner: userId
    };

    if (query) {
        filters.title = { $regex: query, $options: 'i' }; // search by title (case-insensitive)
    }

    const sortOptions = {
        [sortBy]: sortType === 'asc' ? 1 : -1
    };

    const skip = (Number(page) - 1) * Number(limit);

    const [videos, total] = await Promise.all([
        Video.find(filters)
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit)),
        Video.countDocuments(filters)
     ]);

    const  videoDetails = {
        total,
        page: Number(page),
        limit: Number(limit),
        videos
     }

    if (!videos.length) {
        throw new ApiError(404, "No videos found for this User.");
    }

    res.status(200).json(new ApiResponse(200, videoDetails, "Video fetched successfully"))

})

const publishVideos = asyncHandler(async (req, res) => {
    try {
        const { title, description } = req.body
        
        let thumbnailLocalPath;
        const videoLocalPath = req.files?.videoFile[0]?.path;
        
        if (req.files && Array.isArray(req.files.thumbnail) && req.files.thumbnail.length > 0) {
            thumbnailLocalPath = req.files.thumbnail[0]?.path
         }   

        if (!videoLocalPath) {
            throw new ApiError(400, "Video file not found")
        }

        const uploadedVideo = await uploadOnCloudinary(videoLocalPath)
        
        const uploadThumbnail = await uploadOnCloudinary(thumbnailLocalPath)

        if (!uploadedVideo) {
            throw new ApiError(400, "Video file couldn't uploaded on cloudinary")
        }
    
        const video = await Video.create({
            title: title,
            description: description,
            owner: req.user?._id,
            duration: uploadedVideo.duration,
            videoFile: uploadedVideo?.url,
            thumbnail: uploadThumbnail?.url || ""
        })

        const publishedVideo = await Video.findById(video._id)

        if (!publishedVideo) {
            throw new ApiError(500, "Something went wrong while uploading video")
        }
        return res.status(200).json(
            new ApiResponse(200, publishedVideo, "Video uploaded successfully")
        )

    } catch (error) {
        throw new ApiError(400, {}, "Something went wrong due some internal error")
    }
})

const getAllUserVideos = asyncHandler(async (req, res) => {
    const userId = req.user?._id
    try {
        if (!userId) {
            throw new ApiError(401, "Unauthorize acess, please login first")
        }

        const videos = await Video.find({owner: userId})
        if (!videos) {
            throw new ApiError(404, "No videos found for this User.")
        }

        return res
        .status(200)
        .json(new ApiResponse(200, videos, "Videos fetched successfully"))
    } catch (error) {
        console.log(error);
        
        throw new ApiError(400, "Something went wrong due to some internal error")
    }
    
})

const getVideoById = asyncHandler(async (res, req) => {
    const { videoId } = req.params

    try {
        if (!videoId) {
            throw new ApiError(400, "Please provide video id")
        }
    
        const videos = await Video.find({_id: videoId})
        if (!videos) {
            throw new ApiError(404, "No videos found for with this video id")
        }
    
        return res
        .status(200)
        .json(new ApiResponse(200, videos, "Video fetched successfully"))
    } catch (error) {
        new ApiError(400, {"Error": error}, "Something went wrong due to some internal error")
    }
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.pramas
    const { title, description } = req.body
    const thumbnailLocalPath = req.file?.path

    if (!videoId) {
        throw new ApiError(400, "Please provide video id to update any video")
    }

    const newThumbnailUpload = await uploadOnCloudinary(thumbnailLocalPath)

    const updateFields = {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(newThumbnailUpload !== undefined && { newThumbnailUpload })
    }
    
    const newVideo = await Video.findByIdAndUpdate(
        {
            _id: videoId
        },
        {
            $set: updateFields
        },
        {new: true}
    )

    return res
    .status(200)
    .json(
        new ApiResponse(200, newVideo, "Video updated successfully")
    )
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.findByIdAndDelete({_id: videoId})

    if (!video) {
        throw new ApiError(404, "Video not found or already deleted");
    }

    res.status(200)
    .json(new ApiResponse(200, video, "Video deleted successfully"))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { isPublished } = req.body

    if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.findByIdAndUpdate(
        {
            _id: videoId
        },
        {
            $set: {
                isPublished: isPublished
            }
        },
        {new: true}
    )

    return res.status(200).json(new ApiResponse(200, video, "Published flag updated successfully"))
})


export { publishVideos, getAllUserVideos, getAllVideos, getVideoById, updateVideo, deleteVideo, togglePublishStatus } 