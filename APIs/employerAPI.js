import exp from 'express'
import { userModel } from '../models/userModel.js'
import { jobModel } from '../models/jobModel.js'
import { verifyToken } from '../middlewares/verifyToken.js'
import { allowedRoles } from '../middlewares/allowedRoles.js'
import { hash, compare } from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { applicationModel } from '../models/applicationModel.js'

export const employerRouter = exp.Router()

// 1. Register as Employer
employerRouter.post("/users", async (req, res, next) => {
    try {
        let newUser = req.body
        newUser.role = "EMPLOYER"

        let hashedPassword = await hash(newUser.password, 12)
        newUser.password = hashedPassword

        let userDocument = await userModel.create(newUser)
        let userObj = userDocument.toObject()
        delete userObj.password

        res.status(201).json({
            success: true,
            message: "Employer registered successfully",
            data: userObj
        })
    } catch (err) {
        next(err)
    }
})

// 2. Login as Employer
employerRouter.post("/users/login", async (req, res, next) => {
    try {
        let credObj = req.body

        let user = await userModel.findOne({ email: credObj.email, role: "EMPLOYER" }).select("+password")
        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid email or role" })
        }

        let isMatched = await compare(credObj.password, user.password)
        if (!isMatched) {
            return res.status(401).json({ success: false, message: "Invalid password" })
        }

        let signedToken = jwt.sign(
            { id: user._id, role: user.role, email: user.email, name: user.name },
            process.env.SECRET_KEY || 'default_secret_key',
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
            message: "Employer login successful",
            data: userObj
        })
    } catch (err) {
        next(err)
    }
})

// 3. Create a new job posting [protected]
employerRouter.post("/jobs", verifyToken, allowedRoles("EMPLOYER"), async (req, res, next) => {
    try {
        let newJob = req.body
        newJob.employerId = req.user.id

        let jobDocument = await jobModel.create(newJob)
        res.status(201).json({ success: true, message: "Job posting created successfully", data: jobDocument })
    } catch (err) {
        next(err)
    }
})

// 4. View own job postings [protected]
employerRouter.get("/jobs", verifyToken, allowedRoles("EMPLOYER"), async (req, res, next) => {
    try {
        let jobs = await jobModel.find({ employerId: req.user.id })
        res.status(200).json({ success: true, message: "Employer job postings fetched", data: jobs })
    } catch (err) {
        next(err)
    }
})

// 5. View specific job posting by ID
employerRouter.get("/jobs/:jobId", async (req, res, next) => {
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

// 6. Update own job posting [protected]
employerRouter.put("/jobs/:jobId", verifyToken, allowedRoles("EMPLOYER"), async (req, res, next) => {
    try {
        let employerId = req.user.id
        let jobPosting = await jobModel.findById(req.params.jobId)

        if (!jobPosting) {
            return res.status(404).json({ success: false, message: "Job posting not found" })
        }

        if (jobPosting.employerId.toString() !== employerId) {
            return res.status(403).json({ success: false, message: "Forbidden: You can only update your own job postings" })
        }

        let updatedJobDocument = await jobModel.findByIdAndUpdate(
            req.params.jobId,
            req.body,
            { new: true, runValidators: true }
        )
        res.status(200).json({ success: true, message: "Job posting updated successfully", data: updatedJobDocument })
    } catch (err) {
        next(err)
    }
})

// 7. Delete own job posting [protected]
employerRouter.delete("/jobs/:jobId", verifyToken, allowedRoles("EMPLOYER"), async (req, res, next) => {
    try {
        let employerId = req.user.id
        let jobPosting = await jobModel.findById(req.params.jobId)

        if (!jobPosting) {
            return res.status(404).json({ success: false, message: "Job posting not found" })
        }

        if (jobPosting.employerId.toString() !== employerId) {
            return res.status(403).json({ success: false, message: "Forbidden: You can only delete your own job postings" })
        }

        let deletedJob = await jobModel.findByIdAndDelete(req.params.jobId)
        res.status(200).json({ success: true, message: "Job posting deleted successfully", data: deletedJob })
    } catch (err) {
        next(err)
    }
})

// 8. View applications received for their job postings [protected]
employerRouter.get("/applications", verifyToken, allowedRoles("EMPLOYER"), async (req, res, next) => {
    try {
        let jobs = await jobModel.find({ employerId: req.user.id })
        let jobIds = jobs.map(job => job._id)

        let applications = await applicationModel.find({ jobId: { $in: jobIds } })
            .populate("jobId", "title company location employmentType salaryRange jobStatus")
            .populate("applicantId", "name email skills experience education")

        res.status(200).json({ success: true, message: "Applications received for your jobs", data: applications })
    } catch (err) {
        next(err)
    }
})

// 9. Update application status for own job posting [protected]
employerRouter.put("/applications/:applicationId", verifyToken, allowedRoles("EMPLOYER"), async (req, res, next) => {
    try {
        let application = await applicationModel.findById(req.params.applicationId)
        if (!application) {
            return res.status(404).json({ success: false, message: "Application not found" })
        }

        let job = await jobModel.findOne({
            _id: application.jobId,
            employerId: req.user.id
        })

        if (!job) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: You are not authorized to update applications for this job"
            })
        }

        let updatedApplication = await applicationModel.findByIdAndUpdate(
            req.params.applicationId,
            { applicationStatus: req.body.applicationStatus },
            { new: true, runValidators: true }
        ).populate("jobId", "title company").populate("applicantId", "name email")

        res.status(200).json({
            success: true,
            message: "Application status updated successfully",
            data: updatedApplication
        })
    } catch (err) {
        next(err)
    }
})

// 10. Employer Logout
employerRouter.post("/logout", async (req, res) => {
    res.clearCookie("accessToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: "lax"
    })
    res.status(200).json({ success: true, message: "Employer logout successful" })
})