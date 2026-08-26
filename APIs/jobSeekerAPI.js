import exp from 'express'
import {userModel} from '../models/userModel.js'
import {hash,compare} from 'bcryptjs'
import { allowedRoles } from '../middlewares/allowedRoles.js'
import { verifyToken } from '../middlewares/verifyToken.js'
import { jobModel } from '../models/jobModel.js'
import { applicationModel } from '../models/applicationModel.js'
import jwt from 'jsonwebtoken'

export const jobSeekerRouter=exp.Router()

// API ROUTES
// jobseeker register
jobSeekerRouter.post("/users",async(req,res)=>{
    // get new user details
    let newUser=req.body
    // make role as JOBSEEKER so no other person can't register through this route(automatically make them "employer")
    newUser.role="JOB SEEKER"
   // hash the password
    let hashedPassword=await hash(newUser.password,12)
    // replace passwords
    newUser.password=hashedPassword
    // save in DB
    let userDocument=await userModel.create(newUser)
    // send res
    res.json({success:true,message:"job seeker registered successfully",data:userDocument})}
    )

// login and receive authentication cookie
jobSeekerRouter.post("/users/login",allowedRoles("JOB SEEKER"),async(req,res)=>{
    // get credentials of the user
        let credObj=req.body
        // verify email

        let user=await userModel.findOne({email:credObj.email,role:"JOB SEEKER"})
        if(user==null)
        {
            return res.status(401).json({success:false,message:"invalid email or role"})
        }
        let result = await compare(credObj.password,user.password)
        if(result==false)
        {
            return res.status(401).json({success:false,message:"invalid password"})
        }
    
        // both email and passwords matched so generate signed token and store it in cookie storage send it
        let signedToken=jwt.sign({id:user._id,role:user.role},process.env.SECRET_KEY,{expiresIn:'1d'})
    
        res.cookie("accessToken",signedToken,{
            httpOnly:true,
            secure:false,
            sameSite:"lax"
        })
        res.status(200).json({status:true,message:"loginsuccess"})
    
})

// view own profile[protected]
jobSeekerRouter.get("/users",verifyToken,allowedRoles("JOB SEEKER"),async(req,res)=>{
    // getting profile by id
    let jobSeekerProfile=await userModel.findById(req.user.id)
    res.status(200).json({success:true,message:"profile:",data:jobSeekerProfile})
})

// update own profile[protected]
jobSeekerRouter.put("/users",verifyToken,allowedRoles("JOB SEEKER"),async(req,res)=>{
    // get updated thing from the body
    let newDoc=req.body
    // extracting the document by id and updating it
    let updatedJobSeekerProfile=await userModel.findByIdAndUpdate(req.user.id,newDoc,{new:true,runValidators:true})
    res.status(200).json({success:true,message:"updated profile:",data:updatedJobSeekerProfile})

})

// view all jobs
jobSeekerRouter.get("/jobs",async(req,res)=>{
     // get job from jobs collection through find()
    let jobs=await jobModel.find()
    if(jobs.length==0)
    {
        return res.status(401).json({success:false,message:"no jobs"})
    }
    res.status(200).json({success:true,message:"jobs:",data:jobs})
})
// view job by id
jobSeekerRouter.get("/jobs/:jobId",async(req,res)=>{
    // receive id from url
        let jobId=req.params.jobId
        // job posting of the urlId
        let jobPosting=await jobModel.findById(jobId)
        if(jobPosting==null)
        {
            return res.status(401).json({success:false,message:"invalid id "})
        }
        res.status(200).json({success:true,message:"Job posting:",data:jobPosting})
})

// apply job[protected]
jobSeekerRouter.post("/jobs/:jobId/apply",verifyToken, allowedRoles("JOB SEEKER"),async(req,res)=>{
    // checking for application by this jobSeeker for the same job(to avoid duplicate applications)
    let existingApplication = await applicationModel.findOne({
            applicantId: req.user.id,
            jobId: req.params.jobId
        });
        // if application exists
        if (existingApplication) {
            return res.status(409).json({
                success: false,
                message: "You have already applied for this job"
            });
        }
    // if there is no existing application 
    // creating application 
    let newApplication=req.body
    newApplication.applicantId=req.user.id
    newApplication.jobId=req.params.jobId

    let applicationDocument=await applicationModel.create(newApplication)
    res.status(200).json({success:true,message:"application created",data:applicationDocument})
})

// view their applications and statuses[protected]
jobSeekerRouter.get("/applications",verifyToken,allowedRoles("JOB SEEKER"),async(req,res)=>{
    // getting all the applications of this jobSeeker through applicantId
    let applications=await applicationModel.find({applicantId:req.user.id})
    // if no such applications
    if(applications.length==0)
    {
        return res.status(401).json({success:false,message:"no application for this jobseeker"})
    }
    // if there are some applications
    res.status(200).json({success:true,message:"applications:",data:applications})

})

// logout
jobSeekerRouter.post("/logout",async(req,res)=>{
    // clearing the token from cookie-storage
    res.clearCookie("accessToken",{
        httpOnly:true,
        secure:false,
        samesite:"lax"
    })
    res.status(200).json({success:true,message:"logout successful"})
})