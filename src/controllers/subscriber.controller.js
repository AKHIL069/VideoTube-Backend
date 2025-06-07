import { Subscription } from "../models/subscription.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


const addSubscription = asyncHandler(async (req, res) => {
    const { userId } = req.user?._id
    const { channelId } = req.body

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

})


export { addSubscription }