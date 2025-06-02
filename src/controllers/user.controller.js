import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken"


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

    // console.log(req.files);
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

    // create user object - create entery in db

    const user = await User.create({
        fullName,
        username: username.toLowerCase(),
        email,
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || "" 
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
        new ApiResponse(201, createdUser, "User registerd successfully")
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

    if (!user) {
       throw new ApiError(404, "User does not exist."); 
    }

    // password check

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
       throw new ApiError(401, "Invalid user credentials"); 
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
    if (incomingRefreshToken) {
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

export { userRegisteration, userLogin, userLogout, refreshAccessToken}
