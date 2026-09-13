import { Schema, model, Types } from "mongoose";

const jobSchema = new Schema({
    employerId: {
        type: Types.ObjectId,
        ref: 'user',
        required: true
    },
    title: {
        type: String,
        required: [true, "Job title is required"],
        trim: true
    },
    company: {
        type: String,
        required: [true, "Company name is required"],
        trim: true
    },
    description: {
        type: String,
        minLength: [5, "Min length for description is 5 characters"],
        required: [true, "Job description is required"]
    },
    location: {
        type: String,
        required: [true, "Location is required"],
        trim: true
    },
    employmentType: {
        type: String,
        required: [true, "Employment type is required"],
        enum: {
            values: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote'],
            message: "Invalid employment type"
        }
    },
    salaryRange: {
        min: {
            type: Number,
            required: [true, "Minimum salary is required"],
            min: 0
        },
        max: {
            type: Number,
            required: [true, "Maximum salary is required"],
            min: 0
        },
        currency: {
            type: String,
            default: 'INR'
        }
    },
    requiredSkills: {
        type: [String],
        required: [true, "Required skills are required"]
    },
    experienceRequirement: {
        type: String,
        required: [true, "Experience requirement is required"],
        trim: true
    },
    postedDate: {
        type: Date,
        default: Date.now
    },
    applicationDeadline: {
        type: Date,
        required: [true, "Application deadline is required"]
    },
    jobStatus: {
        type: String,
        enum: {
            values: ["active", "archived", "inactive"],
            message: "Invalid job status"
        },
        default: "active"
    }
}, {
    timestamps: true,
    versionKey: false,
    strict: "throw"
})

export const jobModel = model("job", jobSchema)