import express from 'express'
import cors from 'cors'
import UserRouter from './Routes/User.routes.js'
const app = express();


app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:8081',
    credentials: true,
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS']
  }));

app.use(express.json())

app.use("/api/v1/users", UserRouter);


export default app;