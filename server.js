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

// extract port number and DB URL from .env with fallback defaults
const port = process.env.PORT || 4000
const dbUrl = process.env.DB_URL || 'mongodb://localhost:27017/job-portal-db'

// database connection 
async function connectDB(){
    try{
        await connect(dbUrl)
        console.log("DB connected")
        // server startup
        app.listen(port,()=>console.log(`server listening on ${port}`))
    }
    catch(err)
    {
        console.log("err in db connection", err.message)
    }
}
// calling for DB connection
connectDB()
// Global error handling middleware
app.use((err, req, res, next) => {
    console.error("Error encountered:", err.name, err.message)

    // Handle Mongoose Validation Error
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(e => e.message)
        return res.status(400).json({
            success: false,
            message: "Validation Error",
            errors: messages
        })
    }

    // Handle Mongoose CastError (Invalid ObjectId)
    if (err.name === 'CastError') {
        return res.status(400).json({
            success: false,
            message: `Invalid format for field: ${err.path}`
        })
    }

    // Handle MongoDB Duplicate Key Error (code 11000)
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0] || 'field'
        return res.status(409).json({
            success: false,
            message: `Duplicate value entered for ${field}. It must be unique.`
        })
    }

    // Default Error Response
    const statusCode = err.statusCode || 500
    res.status(statusCode).json({
        success: false,
        message: err.message || "Internal Server Error"
    })
})