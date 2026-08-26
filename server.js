import exp from 'express'
import {connect} from 'mongoose'
import {config} from 'dotenv'
import cookieParser from 'cookie-parser'
// Import API route modules
import {adminRouter} from './APIs/adminAPI.js'
import { employerRouter } from './APIs/employerAPI.js'
import { jobSeekerRouter } from './APIs/jobSeekerAPI.js'
//Load environment variables from .env file
config() 

const app=exp()

// body (json req) parser
app.use(exp.json())
// parse cookies coming with client reqs
app.use(cookieParser())

// API Route Handlers
app.use("/admin-api",adminRouter)
app.use("/jobSeeker-api",jobSeekerRouter)
app.use("/employer-api",employerRouter)

// extract port number from .env
const port=process.env.PORT

// database connection 
async function connectDB(){
    try{
        await connect(process.env.DB_URL)
        console.log("DB connected")
        // server startup
        app.listen(port,()=>console.log(`server listening on ${port}`))
    }
    catch(err)
    {
        console.log("err in db connection",err)
    }
}
// calling for DB connection
connectDB()
// error handling middleware(global)
app.use((err,req,res,next)=>{
    console.log("error occured")
    res.json({success:false,message:err.message})
})