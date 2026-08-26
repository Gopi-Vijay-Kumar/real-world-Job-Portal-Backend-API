import { Schema,model } from "mongoose"
import {Types} from "mongoose"

const userSchema=new Schema(
    {
        name:{
            type:String,
            required:true,
            trim:true
        },
        email:{
            type:String,
            lowercase:true,
            trim:true,
            unique:true,
            required:true
        },
        password:{
            type:String,
            required:true,
            minlength:[4,"password should be of atleast 4 characters"],
            trim:true
        },
        role:{
            type:String,
            enum:{
                values:["JOB SEEKER","ADMIN","EMPLOYER"],
                message:"invalid role"
            }
        },
        skills:[String],
        experience:[{
            company:String,
            title:String,
            startDate:Date,
            endDate:Date,
            description:String
        }],
        education:[{
            institution:String,
            degree:String,
            fieldOfStudy:String,
            startDate:Date,
            endDate:Date
        }]

        
    },{
        timestamps:true,
        versionkey:false,
        strict:"throw"
    }
)

export const userModel=model("user",userSchema)