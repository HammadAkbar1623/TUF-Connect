import express from 'express'
import cors from 'cors'
import UserRouter from './Routes/User.routes.js'
const app = express();

app.use(express.json())

app.use("/api/v1/users", UserRouter);


export default app;