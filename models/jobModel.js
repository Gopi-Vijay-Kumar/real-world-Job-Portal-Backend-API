import { Schema,model,Types } from "mongoose";

const jobSchema=new Schema({
    employerId:{
        type:Types.ObjectId,
        ref:'user',
        required:true
    },
    title:{
        type:String,
        required:true,
        trim:true
    },
    company:{
        type:String,
        required:true,
        trim:true
    },
    description:{
        type:String,
        minLength:[5,"min length is 5"],
        required:true
    },
    location:{
        type:String,
        required:true,
        trim:true
    },
    employmentType:{
        type: String,
        required: true,
        enum: {values:['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote'],
            message:"invalid employment type"}
    },
    salaryRange:{
        min:{
            type:Number,
            required:true,
            min:0
        },
        max:{
            type:Number,
            required:true,
            min:0
        },
        currency:{
            type:String,
            default:'INR'
        }
    },
    requiredSkills:{
        type:[String],
        required:true
    },
    experienceRequirement:{
        type:String,
        required:true,
        trim:true
    },
    postedDate:{
        type:Date,
        default:Date.now
    },
    applicationDeadline:{
        type:Date,
        required:true
    },
    jobStatus:{
        type:String,
        enum:{
            values:["active","archived","inactive"],
            message:"invalid status"
        },
        default:"active"
    }
},{
    timestamps:true,
    versionkey:false,
    strict:"throw"
})

export const jobModel=model("job",jobSchema)