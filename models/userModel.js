import { Schema, model } from "mongoose"

const userSchema = new Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true
        },
        email: {
            type: String,
            lowercase: true,
            trim: true,
            unique: true,
            required: [true, "Email is required"]
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: [4, "Password should be at least 4 characters"],
            select: false
        },
        role: {
            type: String,
            required: [true, "Role is required"],
            enum: {
                values: ["JOB SEEKER", "ADMIN", "EMPLOYER"],
                message: "Invalid role"
            }
        },
        status: {
            type: String,
            enum: {
                values: ["active", "suspended", "inactive"],
                message: "Invalid status"
            },
            default: "active"
        },
        skills: [String],
        experience: [{
            company: String,
            title: String,
            startDate: Date,
            endDate: Date,
            description: String
        }],
        education: [{
            institution: String,
            degree: String,
            fieldOfStudy: String,
            startDate: Date,
            endDate: Date
        }]
    },
    {
        timestamps: true,
        versionKey: false,
        strict: "throw"
    }
)

export const userModel = model("user", userSchema)