import exp from 'express'
import {userModel} from '../models/userModel.js'
import { jobModel } from '../models/jobModel.js'
import {compare} from 'bcryptjs'
import { verifyToken } from '../middlewares/verifyToken.js'
import {allowedRoles} from '../middlewares/allowedRoles.js'
import jwt from "jsonwebtoken"
export const adminRouter=exp.Router()

// API ROUTES
// admin login
adminRouter.post("/admin/login",async(req,res)=>{
    // get admin credentials
    let credObj=req.body
    // verify email and admin role
    let admin=await userModel.findOne({
        email:credObj.email,
        role:"ADMIN"
    })
    if(admin==null)
    {
        return res.status(401).json({
            success:false,
            message:"invalid admin email or role"
        })
    }
    // verify password
    let result=await compare(credObj.password,admin.password)

    if(result==false)
    {
        return res.status(401).json({
            success:false,
            message:"invalid password"
        })
    }
    // create JWT token
    let signedToken=jwt.sign({
        id:admin._id,
        role:admin.role
    },process.env.SECRET_KEY,{expiresIn:'1d'})

    // store in cookie
    res.cookie("accessToken",signedToken,{
        httpOnly:true,
        secure:false,
        sameSite:"lax"
    })

    // login success response
    res.status(200).json({success:true,
        message:"admin login success"
    })
})

// view all registered users
adminRouter.get("/users",verifyToken,allowedRoles("ADMIN"),async(req,res)=>{
    // get all users through find() from users collection
    let users=await userModel.find()
    res.status(200).json({success:true,message:"list of users",data:users})
})

// view user by id[protected]
adminRouter.get("/users/:userId",verifyToken,allowedRoles("ADMIN"),async(req,res)=>{
    // extract id from url
    let urlId=req.params.userId
    // get user with id urlId
    let user=await userModel.findById(urlId)
    if(user==null)
    {
        return res.status(404).json({success:false,message:"user not found"})
    }
    res.status(200).json({success:true,message:"user found",data:user})
})

// Update user details/status [protected]
adminRouter.put("/users/:userId", verifyToken, allowedRoles("ADMIN"), async (req, res) => {
    // get new changes to be updated from body and user by id and update
    let updatedUser = await userModel.findByIdAndUpdate(
        req.params.userId,
        req.body,
        { new: true, runValidators: true }
    );
    if (!updatedUser) {
        return res.status(404).json({ success: false, message: "User not found" });
    }
    res.status(200).json({ success: true, message: "User updated successfully", data: updatedUser });
});

// delete user by id
adminRouter.delete("/users/:userId",verifyToken,allowedRoles("ADMIN"),async(req,res)=>{
    // extract user by id
    let urlId=req.params.userId
    let deletedUser=await userModel.findByIdAndDelete(urlId)
    if(deletedUser==null)
    {
        return res.status(401).json({success:false,message:"user not found"})
    }
    res.status(200).json({success:true,message:"user deleted successfully",data:deletedUser})
})

// view all job postings
adminRouter.get("/jobs",async(req,res)=>{
    // get job from jobs collection through find()
    let jobs=await jobModel.find()
    if(jobs.length==0)
    {
        return res.status(401).json({success:false,message:"no jobs"})
    }
    res.status(200).json({success:true,message:"jobs:",data:jobs})
})

// view job posting by id
adminRouter.get("/jobs/:jobId",async(req,res)=>{
    // get id of job from url
    let jobId=req.params.jobId
    let jobPosting=await jobModel.findById(jobId)
    // if no job matches the id
    if(jobPosting==null)
    {
        return res.status(401).json({success:false,message:"invalid id "})
    }
    res.status(200).json({success:true,message:"Job posting:",data:jobPosting})
})

// remove unwanted/invalid job posting[protected]
adminRouter.delete("/jobs/:jobId",verifyToken,allowedRoles("ADMIN"),async(req,res)=>{
    // for invalid thing ,we are not just selecting random jobs but chose those jobs which are "inactive" with a condition
    let deletedJob=await jobModel.findOneAndDelete({_id: req.params.jobId,
    jobStatus: "inactive"})
    if(deletedJob==null)
    {
        return res.status(401).json({success:false,message:"this job is not inactive"})
    }
    return res.status(200).json({success:true,message:"deleted this inactive job",data:deletedJob})
})

