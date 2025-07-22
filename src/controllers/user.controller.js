import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";


const generateAccessRefereshTokens = async(userId) => {
    try {
      const user =   await User.findById(userId)
      const accessToken = user.generateAccessToken()
      const refreshToken = user.generateRefreshToken()

      user.refreshToken = refreshToken
      await user.save({ validateBeforeSave: false })

      return {accessToken, refreshToken}

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token", error)
    }
}

const userRegisteration = asyncHandler( async(req, res) => { 
    // get user details from frontend

    const { fullName, email, username, password } = req.body
    
    // validation - not empty 

    if ([fullName, email, username, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required")
    }

    // check if user already exist

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with this email or username already exists")
    }
 
    // create user object - create entery in db

    const user = await User.create({
        fullName,
        username: username.toLowerCase(),
        email,
        password
    })

    // remove password and refresh token field from response

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

     // check for user creatation

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering user.")
    }

    // return res

    return res.status(201).json(
        new ApiResponse(201, createdUser, "User registered successfully")
    )
})


const userProfileUpdate = asyncHandler(async (req, res) => {

    const userId = req.user?._id

    // check for images, check for avatar

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;

    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    } 

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required.")   
    }

    // upload them to cloudinary, avatar

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar image couldn't uploaded on cloudinary")
    }

    const user = await User.findByIdAndUpdate(
        userId,
        {
        avatar: avatar.url,
        coverImage: coverImage?.url || "" 
        },
        {new: true}
    )

    if (!user) {
        throw new ApiError(500, "Something went wrong while updating the user profile")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "User profile updated successfully")
    )
})


const userLogin = asyncHandler(async (req, res) => {
    // get user credentails for login from req body

    const { username, email, password } = req.body

    // verify through username or email
    
    if (!(username || email)) {
        throw new ApiError(400, "Username or email is required");
    }

    // find the user
     
    const user = await User.findOne({
        $or: [{username}, {email}]
    })

//       return res
//       .status(200)
//       .json(
//        new ApiResponse(200, {}, "User does not exist")
//       )

    // password check

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
       return res
       .status(200)
       .json(
        new ApiResponse(200, {}, "Invalid credential, Please provide correct password")
       )
    }

    // generate access and refresh token 

    const { accessToken, refreshToken } = await generateAccessRefereshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    // send cookie 

    const options = {
        httpOnly: true,
        secure: true
    }

    // return response 

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged in Successfully."
        )
    )
})

const userLogout = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized Request" )
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFERESH_TOKEN_SECRET
        )
    
        const user = User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if (incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh token is expired or used")
        }
    
        const { accessToken, newRefreshToken } = await generateAccessRefereshTokens(user._id)
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        return res
        .status(200)
        .cookies("accessToken", accessToken)
        .cookie("refreshToken", newRefreshToken)
        .json(
            new ApiResponse(
                200, 
                {accessToken, refreshToken: newRefreshToken},
                "New Accesstoken generated successfully."
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token.")
    }

})

const fetchUserDetails = asyncHandler(async (req, res) => {
    const userId = req.params.userId

    let userData;
    try {
        if (userId) {
            userData = await User.findById(userId);
            if (!userData) throw new ApiError(404, "User not found with this user id.")
        } else {
            userData = await User.find();
        }
    
        res.status(200)
        .json(new ApiResponse(200, userData, "User data fetched successfully."))
    } catch (error) {
        throw new ApiError(401, error?.message || "Something went wrong.")
    }
})

const changeCurrentPassword = asyncHandler(async(req, res) => {
  const { oldPassword, newPassword } = req.body  

  const user = await User.findById(req.user?._id)
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password.")
  }

  user.password = newPassword
  await user.save({validateBeforeSave: false})

  return res
  .status(200)
  .json(new ApiResponse(200, {}, "New Paasowrd changed successfully"))
})

const getCurrentUser = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json(200, req.user, "Current user fetched successfully")
})

const updateAccountDetails = asyncHandler(async(req, res) => {
    const { fullName, email } = req.body

    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = req.user?._id

    const updatedUser = await User.findByIdAndUpdate(
        user,
        {
            $set: {
                fullName,
                email
            }
        },
        {new: true}
    ).select("-password")

    return res.status(200).json(new ApiResponse(200, updatedUser, "Account details updated successfully"))

})

const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Something went wrong while uploading avatar")
    }

    const user = req.user?._id
    const updatedAvatar = await User.findByIdAndUpdate(
        user,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")
    return res.status(200).json(new ApiResponse(200, updatedAvatar, "Avatar updated successfully"))
})

const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover Image file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage) {
        throw new ApiError(400, "Something went wrong while uploading cover image")
    }

    const user = req.user?._id
    const updatedCoverImage = await User.findByIdAndUpdate(
        user,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")
    return res.status(200).json(new ApiResponse(200, updatedCoverImage, "Cover Image updated successfully"))
})

const getUserChannelProfile = asyncHandler(async(req, res) => {
    const { username } = req.params

    if (!username?.trim) {
        throw new ApiError(400, "Username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from:  "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from:  "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        the: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                email: 1,
                avatar: 1,
                coverImage: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1
            }
        }
    ])
    console.log("Channel details: ", channel);
    
    if (!channel?.length) {
        throw new ApiError(404, "Channel does not exist")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User Channel fetched successfully")
    )
})

const getWatchHistory = asyncHandler(async(req, res) => {
    const user = await User.aggregate([{
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            },
            $lookup: {
                    from: "videos",
                    localField: "watchHistory",
                    foreignField: "_id",
                    as: "WatchHistory",
                    pipeline: [
                        {
                            $lookup: {
                                from: "users",
                                localField: "owner",
                                foreignField: "_id",
                                as: "owner",
                                pipeline: [
                                    {
                                        $project: {
                                            fullName: 1,
                                            userName: 1,
                                            avatar: 1
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            $addFields: {
                                owner: {
                                    $first: "$owner"
                                }
                            }
                        }
                    ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(200, user[0].getWatchHistory, "Watch History fetched successfully")
    )
})

export { 
    userRegisteration, 
    userLogin, 
    userLogout, 
    refreshAccessToken, 
    fetchUserDetails, 
    changeCurrentPassword, 
    getCurrentUser, 
    updateAccountDetails, 
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
 }
