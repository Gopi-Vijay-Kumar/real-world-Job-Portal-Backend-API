import {Schema,model,Types} from 'mongoose'

const applicationSchema=new Schema({
    applicantId:{
        type:Types.ObjectId,
        ref:"user",
        required:true
    },
    jobId:{
        type:Types.ObjectId,
        ref:"job",
        required:true
    },
    applicationStatus:{
        type:String,
        enum:{
            values:['Applied', 'Reviewed', 'Accepted', 'Rejected'],
            message:"Invalid status"
        },
        default:"Applied"
    }
},{
    versionKey:false,
    timestamps:true,
    strict:"throw"
})

export const applicationModel=model("application",applicationSchema)