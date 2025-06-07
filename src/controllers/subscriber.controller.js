import { Subscription } from "../models/subscription.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


const addSubscription = asyncHandler(async (req, res) => {
    const { userId } = req.user?._id
    const { channelId } = req.body

    try {
        if (!channelId) {
            throw new ApiError(400, "Please provide channel id for subscription")
        }
    
        const newSubscriber = await Subscription.create({
            subscriber: userId,
            channel: channelId
        })
    
        return res
        .status(200)
        .json(new ApiResponse(200, newSubscriber, "Channel subscribed successfully"))
    } catch (error) {
        throw new ApiError(400, {"Error": error}, "Something went wrong due to internal error")
    }

})

const deleteSubscription = asyncHandler(async (req, res) => {
    const { subscriptionId } = req.params

    if (!subscriptionId) {
        throw new ApiError(400, "Please provide subscription id for removing subscription")
    }

    const removeSubscription = await Subscription.findByIdAndDelete({_id: subscriptionId})

    if (!removeSubscription) {
            throw new ApiError(404, "Already unsubscribed this channel");
        }
    
        res.status(200)
        .json(new ApiResponse(200, deletedVideo, "Unsubscribed successfully"))
})


export { addSubscription, deleteSubscription }