const mongoose=require("mongoose");
const passport = require("passport");
const Schema =mongoose.Schema;
const passportLocalMongoose=require("passport-local-mongoose");
const express=require("express");
const router=express.Router();

const userSchema=new Schema({
    email:{
        type:String,
        requried :true,
    }

});



userSchema.plugin(passportLocalMongoose);

module.exports=mongoose.model('user',userSchema);