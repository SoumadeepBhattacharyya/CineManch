import mongoose, { mongo }  from "mongoose";

const connectDB=async()=>{
    try {
        mongoose.connection.on('connected',()=>console.log('MongoDB Database connected'));
        await mongoose.connect(`${process.env.MONGODB_URI}/cinemanch`)
    } catch (error) {
        console.log(error.message);
    }
}

export default connectDB;