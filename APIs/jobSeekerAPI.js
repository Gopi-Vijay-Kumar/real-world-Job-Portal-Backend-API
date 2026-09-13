import exp from 'express'
import { userModel } from '../models/userModel.js'
import { hash, compare } from 'bcryptjs'
import { allowedRoles } from '../middlewares/allowedRoles.js'
import { verifyToken } from '../middlewares/verifyToken.js'
import { jobModel } from '../models/jobModel.js'
import { applicationModel } from '../models/applicationModel.js'
import jwt from 'jsonwebtoken'

export const jobSeekerRouter = exp.Router()

// 1. Register as Job Seeker
jobSeekerRouter.post("/users", async (req, res, next) => {
    try {
        let newUser = req.body
        newUser.role = "JOB SEEKER"

        // Hash the password
        let hashedPassword = await hash(newUser.password, 12)
        newUser.password = hashedPassword

        // Save in DB
        let userDocument = await userModel.create(newUser)
        let userObj = userDocument.toObject()
        delete userObj.password

        res.status(201).json({
            success: true,
            message: "Job seeker registered successfully",
            data: userObj
        })
    } catch (err) {
        next(err)
    }
})

// 2. Login as Job Seeker
jobSeekerRouter.post("/users/login", async (req, res, next) => {
    try {
        let credObj = req.body

        // Verify email & role (include password field for comparison)
        let user = await userModel.findOne({ email: credObj.email, role: "JOB SEEKER" }).select("+password")
        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid email or role" })
        }

        let isMatched = await compare(credObj.password, user.password)
        if (!isMatched) {
            return res.status(401).json({ success: false, message: "Invalid password" })
        }

        // Generate JWT token
        let signedToken = jwt.sign(
            { id: user._id, role: user.role, email: user.email, name: user.name },
            process.env.SECRET_KEY,
            { expiresIn: '1d' }
        )

        res.cookie("accessToken", signedToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: "lax",
            maxAge: 24 * 60 * 60 * 1000
        })

        let userObj = user.toObject()
        delete userObj.password

        res.status(200).json({
            success: true,
            message: "Login successful",
            data: userObj
        })
    } catch (err) {
        next(err)
    }
})

// 3. View own profile [protected]
jobSeekerRouter.get("/users", verifyToken, allowedRoles("JOB SEEKER"), async (req, res, next) => {
    try {
        let profile = await userModel.findById(req.user.id)
        if (!profile) {
            return res.status(404).json({ success: false, message: "User profile not found" })
        }
        res.status(200).json({ success: true, message: "Profile fetched successfully", data: profile })
    } catch (err) {
        next(err)
    }
})

// 4. Update own profile [protected]
jobSeekerRouter.put("/users", verifyToken, allowedRoles("JOB SEEKER"), async (req, res, next) => {
    try {
        let updateData = req.body
        delete updateData.role
        delete updateData.password

        let updatedProfile = await userModel.findByIdAndUpdate(
            req.user.id,
            updateData,
            { new: true, runValidators: true }
        )
        res.status(200).json({ success: true, message: "Profile updated successfully", data: updatedProfile })
    } catch (err) {
        next(err)
    }
})

// 5. View all available jobs
jobSeekerRouter.get("/jobs", async (req, res, next) => {
    try {
        let jobs = await jobModel.find({ jobStatus: "active" }).populate("employerId", "name email company")
        res.status(200).json({ success: true, message: "Available jobs fetched successfully", data: jobs })
    } catch (err) {
        next(err)
    }
})

// 6. View a single job by ID
jobSeekerRouter.get("/jobs/:jobId", async (req, res, next) => {
    try {
        let jobId = req.params.jobId
        let jobPosting = await jobModel.findById(jobId).populate("employerId", "name email company")
        if (!jobPosting) {
            return res.status(404).json({ success: false, message: "Job posting not found" })
        }
        res.status(200).json({ success: true, message: "Job posting details", data: jobPosting })
    } catch (err) {
        next(err)
    }
})

// 7. Apply for a job [protected]
jobSeekerRouter.post("/jobs/:jobId/apply", verifyToken, allowedRoles("JOB SEEKER"), async (req, res, next) => {
    try {
        let jobId = req.params.jobId

        // Check if job exists
        let targetJob = await jobModel.findById(jobId)
        if (!targetJob) {
            return res.status(404).json({ success: false, message: "Job not found" })
        }

        // Check for duplicate application
        let existingApp = await applicationModel.findOne({
            applicantId: req.user.id,
            jobId: jobId
        })
        if (existingApp) {
            return res.status(409).json({
                success: false,
                message: "You have already applied for this job"
            })
        }

        // Create new application
        let appData = req.body || {}
        appData.applicantId = req.user.id
        appData.jobId = jobId

        let createdApp = await applicationModel.create(appData)
        let populatedApp = await applicationModel.findById(createdApp._id)
            .populate("jobId", "title company location employmentType salaryRange jobStatus")
            .populate("applicantId", "name email skills experience education")

        res.status(201).json({ success: true, message: "Application submitted successfully", data: populatedApp })
    } catch (err) {
        next(err)
    }
})

// 8. View submitted applications and statuses [protected]
jobSeekerRouter.get("/applications", verifyToken, allowedRoles("JOB SEEKER"), async (req, res, next) => {
    try {
        let applications = await applicationModel.find({ applicantId: req.user.id })
            .populate("jobId", "title company location employmentType salaryRange jobStatus")
            .populate("applicantId", "name email")

        res.status(200).json({ success: true, message: "Submitted applications fetched", data: applications })
    } catch (err) {
        next(err)
    }
})

// 9. Logout and clear cookie
jobSeekerRouter.post("/logout", async (req, res) => {
    res.clearCookie("accessToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: "lax"
    })
    res.status(200).json({ success: true, message: "Logout successful" })
})