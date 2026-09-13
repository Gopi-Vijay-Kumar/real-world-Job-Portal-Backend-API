import { Schema, model, Types } from 'mongoose'

const applicationSchema = new Schema({
    applicantId: {
        type: Types.ObjectId,
        ref: "user",
        required: [true, "Applicant ID is required"]
    },
    jobId: {
        type: Types.ObjectId,
        ref: "job",
        required: [true, "Job ID is required"]
    },
    applicationStatus: {
        type: String,
        enum: {
            values: ['Applied', 'Reviewed', 'Accepted', 'Rejected'],
            message: "Invalid status"
        },
        default: "Applied"
    },
    resume: {
        type: String,
        trim: true
    },
    coverNote: {
        type: String,
        trim: true
    }
}, {
    versionKey: false,
    timestamps: true,
    strict: "throw"
})

// Compound unique index to prevent duplicate applications for the same job by the same jobseeker
applicationSchema.index({ applicantId: 1, jobId: 1 }, { unique: true })

export const applicationModel = model("application", applicationSchema)