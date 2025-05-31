import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";


const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_UIR}/${DB_NAME}`)
        console.log(`\n MongoDB Connect !! DB HOST: ${connectionInstance.connection.host}`);
        

    } catch (error) {
        console.log("MongoDB Connection ERROR: ", error);
        process.exit(1)
    }
}

export default connectDB