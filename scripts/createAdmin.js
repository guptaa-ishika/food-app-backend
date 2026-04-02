// scripts/createAdmin.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../models/userModel.js";

await mongoose.connect("your_mongo_uri");

const hashedPassword = await bcrypt.hash("admin123", 10);

await User.create({
  name: "Admin",
  email: "admin@gmail.com",
  password: hashedPassword,
  role: "admin",
});

console.log("Admin created");
process.exit();