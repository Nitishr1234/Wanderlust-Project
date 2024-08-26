const mongoose=require("mongoose");
const reviews = require("./review");
const Review=require("./review.js");
const Schema =mongoose.Schema;

const listingSchema=new Schema({
    title:{
        type:String,
        requred:true
    },
    description:String,
    imgage:{
        type:String,
        default:"https://unsplash.com/photos/a-long-exposure-photo-of-a-pier-on-a-cloudy-day-7Fu6qerSV68",
        set:(v)=>v ==="" ?"https://unsplash.com/photos/a-long-exposure-photo-of-a-pier-on-a-cloudy-day-7Fu6qerSV68":v,
    },
    price:Number,
    location:String,
    reviews:[
        {
            type:Schema.Types.ObjectId,
            ref:"reviews",
        },
    ],
    owner:{
        type: Schema.Types.ObjectId,
        ref:"user"
    },
    category:{
        type: String,
        enum:["mountains","artic","farms","trending","castle"],
    }
});

listingSchema.post("findOneAndDelete",async(listing) =>{
    if(listing){
        await Review.deleteMany({_id: {$in :listing.reviews}});
    }
    
})
const Listing=mongoose.model("listing",listingSchema);
module.exports=Listing;