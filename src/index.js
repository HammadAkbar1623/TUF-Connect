import dotenv from 'dotenv'
import connectDB from './DB/index.js'
import app from './app.js'
import http from 'http'
import { Server } from 'socket.io'
dotenv.config({
    path: './.env',
})

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
    }
})

// Listen for client connections
io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Handle disconnection
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

connectDB()
.then(() => {
    app.listen(process.env.PORT || 3000, () => {
        console.log(`Server is running on port ${process.env.PORT} `)
    })
})
.catch((err) => {
    console.log('Error connecting to database', err)
})