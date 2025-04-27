import mongoose from 'mongoose'
import { dbName } from '../constants.js'


// Connecting Database
const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${dbName}`);
        console.log(`MongoDB connected at ${connectionInstance.connection.host}`);
        
    } 
    
    catch (error) {
        console.log("Database Connection error", error.message);
        process.exit(1);
    }
}

export default connectDB