import exp from 'express'
import {userModel} from '../models/userModel.js'
import {jobModel} from '../models/jobModel.js'
import { verifyToken } from '../middlewares/verifyToken.js'
import { allowedRoles } from '../middlewares/allowedRoles.js'
import {hash,compare} from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { applicationModel } from '../models/applicationModel.js'
export const employerRouter =exp.Router()

// API ROUTES

// employer register
employerRouter.post("/users",async(req,res)=>{
    // get employer data
    let newUser=req.body
    // make role as EMPLOYER so no other person can't register through this route(automatically make them "employer")
    newUser.role="EMPLOYER"
    // hashing the password
    let hashedPassword= await hash(newUser.password,12)
    // replacing plain with hashed
    newUser.password=hashedPassword
    // save in DB
    let userDocument=await userModel.create(newUser)
    // send res
    res.json({success:true,message:"employer registered successfully",data:userDocument})}
    
    
)

// employer login
employerRouter.post("/users/login",async(req,res)=>{
    // get credentials of the user
    let credObj=req.body
    // verify email
    let user=await userModel.findOne({email:credObj.email,role:"EMPLOYER"})
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

// create a job posting
employerRouter.post("/jobs",verifyToken,allowedRoles("EMPLOYER"),async(req,res)=>{
    // get job information from the body
    let newJob=req.body
    newJob.employerId=req.user.id
    let jobDocument = await jobModel.create(newJob)
    res.status(200).json({success:true,message:"job posting created",data:jobDocument})
})

// view their own job postings
employerRouter.get("/jobs",verifyToken,allowedRoles("EMPLOYER"),async(req,res)=>{
    // getting employerId from the decoded token (from allowedRoles middleware where req.user=decodedToken(which has id and role))
    let employerId=req.user.id
    let jobs=await jobModel.find({employerId:employerId})
    if(jobs.length==0)
    {
        return res.status(401).json({success:false,message:"no jobs created by this employer"})
    }
    res.status(200).json({success:true,message:"job postings by this employer",data:jobs})
})

// view specific job posting by id
employerRouter.get("/jobs/:jobId",async(req,res)=>{
    // get id of the job from url
    let jobId=req.params.jobId
    let jobPosting=await jobModel.findById(jobId)
    if(jobPosting==null)
    {
        return res.status(401).json({success:false,message:"invalid id "})
    }
    res.status(200).json({success:true,message:"Job posting:",data:jobPosting})
})

// update their own posting
employerRouter.put("/jobs/:jobId",verifyToken,allowedRoles("EMPLOYER"),async(req,res)=>{
    let employerId=req.user.id
    let jobPosting=await jobModel.findById(req.params.jobId)
    let updJob=req.body
    // check if job with given id exists or not
    if(jobPosting==null)
    {
        return res.status(401).json({success:false,message:"no job posting with this id"})
    }
    // check whether the job is posted by this employer or not
    if(jobPosting.employerId==employerId)
    {
        let updatedJobDocument=await jobModel.findByIdAndUpdate(
            req.params.jobId,
            updJob,{
                new:true,runValidators:true
            }
        )
        return res.status(200).json({success:true,message:"updated successfully",data:updatedJobDocument})
    }
    return res.status(401).json({success:false,message:"this is not your posting so you can't update"})
})

// delete their own posting 
employerRouter.delete("/jobs/:jobId",verifyToken,allowedRoles("EMPLOYER"),async(req,res)=>{
    let employerId=req.user.id
    let jobPosting=await jobModel.findById(req.params.jobId)
    // check if job with given id exists or not
    if(jobPosting==null)
    {
        return res.status(401).json({success:false,message:"no job posting with this id"})
    }
    // check whether the job is posted by this employer or not
    if(jobPosting.employerId==employerId)
    {
        let deletedJobDocument=await jobModel.findByIdAndDelete(
            req.params.jobId
        )
        return res.status(200).json({success:true,message:"deleted successfully",data:deletedJobDocument})
    }
    return res.status(401).json({success:false,message:"this is not your posting so you can't delete"})
})

// view applications received for their postings
employerRouter.get("/applications",verifyToken,allowedRoles("EMPLOYER"),async(req,res)=>{
    // retrieve all jobs posted by this employer
    let jobs=await jobModel.find({employerId:req.user.id})
    // then retrieve all jobIds
    let jobIds=jobs.map(job=>job._id)
    // select applications whose jobIds are in these above retrieved jobIds
    let applications =await applicationModel.find({jobId:{$in:jobIds}})
    // if no such applications for this employer's jobs
    if(applications.length==0){
        return res.status(401).json({success:false,message:"no application for your jobs"})
    }
    res.status(200).json({success:true,message:"applications:",data:applications})
})

// update application's status for his job postings
employerRouter.put("/applications/:applicationId",verifyToken,allowedRoles("EMPLOYER"),async(req,res)=>{
    // get application by it's id
    let application = await applicationModel.findById(req.params.applicationId);
    // if no such application exists
    if (application == null) {
            return res.status(404).json({
                success: false,
                message: "Application not found"});
        }
        // if exists find the job which is posted by this employer and matches with this application(by id)
        let job = await jobModel.findOne({
            _id: application.jobId,
            employerId: req.user.id
        });
        // if no job exists(in common with this employer and this application id)
        if (job == null) {
            return res.status(403).json({
                success: false,message: "You are not authorized to update this application"
            });
        }
        // if job exists
        // update this application now
        let updatedApplication = await applicationModel.findByIdAndUpdate(
            req.params.applicationId,
            req.body,
            {new: true,runValidators: true}
        );
        res.status(200).json({
            success: true,
            message: "Application updated successfully",
            data: updatedApplication
        });
    
})