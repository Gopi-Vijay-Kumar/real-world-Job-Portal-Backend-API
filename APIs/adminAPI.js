import exp from 'express'
import { userModel } from '../models/userModel.js'
import { jobModel } from '../models/jobModel.js'
import { applicationModel } from '../models/applicationModel.js'
import { hash, compare } from 'bcryptjs'
import { verifyToken } from '../middlewares/verifyToken.js'
import { allowedRoles } from '../middlewares/allowedRoles.js'
import jwt from "jsonwebtoken"

export const adminRouter = exp.Router()

// 1. Register Admin account (Initial Admin Setup)
adminRouter.post("/users", async (req, res, next) => {
    try {
        let newAdmin = req.body
        newAdmin.role = "ADMIN"

        let hashedPassword = await hash(newAdmin.password, 12)
        newAdmin.password = hashedPassword

        let adminDocument = await userModel.create(newAdmin)
        let adminObj = adminDocument.toObject()
        delete adminObj.password

        res.status(201).json({
            success: true,
            message: "Admin registered successfully",
            data: adminObj
        })
    } catch (err) {
        next(err)
    }
})

// 2. Admin Login
adminRouter.post("/admin/login", async (req, res, next) => {
    try {
        let credObj = req.body

        let admin = await userModel.findOne({ email: credObj.email, role: "ADMIN" }).select("+password")
        if (!admin) {
            return res.status(401).json({
                success: false,
                message: "Invalid admin email or role"
            })
        }

        let isMatched = await compare(credObj.password, admin.password)
        if (!isMatched) {
            return res.status(401).json({
                success: false,
                message: "Invalid password"
            })
        }

        let signedToken = jwt.sign(
            { id: admin._id, role: admin.role, email: admin.email, name: admin.name },
            process.env.SECRET_KEY,
            { expiresIn: '1d' }
        )

        res.cookie("accessToken", signedToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: "lax",
            maxAge: 24 * 60 * 60 * 1000
        })

        let adminObj = admin.toObject()
        delete adminObj.password

        res.status(200).json({
            success: true,
            message: "Admin login successful",
            data: adminObj
        })
    } catch (err) {
        next(err)
    }
})

// 3. View all registered users [protected]
adminRouter.get("/users", verifyToken, allowedRoles("ADMIN"), async (req, res, next) => {
    try {
        let users = await userModel.find()
        res.status(200).json({ success: true, message: "List of users fetched successfully", data: users })
    } catch (err) {
        next(err)
    }
})

// 4. View user by ID [protected]
adminRouter.get("/users/:userId", verifyToken, allowedRoles("ADMIN"), async (req, res, next) => {
    try {
        let user = await userModel.findById(req.params.userId)
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" })
        }
        res.status(200).json({ success: true, message: "User details fetched", data: user })
    } catch (err) {
        next(err)
    }
})

// 5. Update user details or status [protected]
adminRouter.put("/users/:userId", verifyToken, allowedRoles("ADMIN"), async (req, res, next) => {
    try {
        let updateData = req.body
        delete updateData.password

        let updatedUser = await userModel.findByIdAndUpdate(
            req.params.userId,
            updateData,
            { new: true, runValidators: true }
        )
        if (!updatedUser) {
            return res.status(404).json({ success: false, message: "User not found" })
        }
        res.status(200).json({ success: true, message: "User updated successfully", data: updatedUser })
    } catch (err) {
        next(err)
    }
})

// 6. Delete user by ID [protected]
adminRouter.delete("/users/:userId", verifyToken, allowedRoles("ADMIN"), async (req, res, next) => {
    try {
        let deletedUser = await userModel.findByIdAndDelete(req.params.userId)
        if (!deletedUser) {
            return res.status(404).json({ success: false, message: "User not found" })
        }
        res.status(200).json({ success: true, message: "User deleted successfully", data: deletedUser })
    } catch (err) {
        next(err)
    }
})

// 7. View all job postings [protected]
adminRouter.get("/jobs", verifyToken, allowedRoles("ADMIN"), async (req, res, next) => {
    try {
        let jobs = await jobModel.find().populate("employerId", "name email company")
        res.status(200).json({ success: true, message: "All job postings fetched", data: jobs })
    } catch (err) {
        next(err)
    }
})

// 8. View job posting by ID [protected]
adminRouter.get("/jobs/:jobId", verifyToken, allowedRoles("ADMIN"), async (req, res, next) => {
    try {
        let jobPosting = await jobModel.findById(req.params.jobId).populate("employerId", "name email company")
        if (!jobPosting) {
            return res.status(404).json({ success: false, message: "Job posting not found" })
        }
        res.status(200).json({ success: true, message: "Job posting details", data: jobPosting })
    } catch (err) {
        next(err)
    }
})

// 9. Remove inappropriate or invalid job posting [protected]
adminRouter.delete("/jobs/:jobId", verifyToken, allowedRoles("ADMIN"), async (req, res, next) => {
    try {
        let deletedJob = await jobModel.findByIdAndDelete(req.params.jobId)
        if (!deletedJob) {
            return res.status(404).json({ success: false, message: "Job posting not found" })
        }
        res.status(200).json({ success: true, message: "Job posting removed successfully", data: deletedJob })
    } catch (err) {
        next(err)
    }
})

// 10. Platform summary / statistics review [protected]
adminRouter.get("/stats", verifyToken, allowedRoles("ADMIN"), async (req, res, next) => {
    try {
        let totalUsers = await userModel.countDocuments()
        let jobSeekers = await userModel.countDocuments({ role: "JOB SEEKER" })
        let employers = await userModel.countDocuments({ role: "EMPLOYER" })
        let admins = await userModel.countDocuments({ role: "ADMIN" })
        let totalJobs = await jobModel.countDocuments()
        let activeJobs = await jobModel.countDocuments({ jobStatus: "active" })
        let totalApplications = await applicationModel.countDocuments()

        res.status(200).json({
            success: true,
            message: "Platform metrics summary",
            data: {
                users: { totalUsers, jobSeekers, employers, admins },
                jobs: { totalJobs, activeJobs },
                applications: { totalApplications }
            }
        })
    } catch (err) {
        next(err)
    }
})

// 11. Admin Logout
adminRouter.post("/logout", async (req, res) => {
    res.clearCookie("accessToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: "lax"
    })
    res.status(200).json({ success: true, message: "Admin logout successful" })
})

