const mongoose=require("mongoose");
const initData=require("./data.js");
const Listing =require("../models/listing.js");

main()
  .then(() => {
    console.log("Connected To DB");
  })
  .catch((err) => console.log(err));

async function main() {
  await mongoose.connect("mongodb://127.0.0.1:27017/wanderlust");
}

const initDB=async()=>{
    await Listing.deleteMany({});
    initData.data=initData.data.map((obj) => ({...obj,owner:"66c6c34c50a59ad05567725a"}));
    await Listing.insertMany(initData.data);
    console.log("Data was initilizes");
};
initDB();