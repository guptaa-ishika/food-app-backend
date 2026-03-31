import mongoose from "mongoose";

/**
 * Connects to MongoDB Atlas (or local URI via MONGODB_URI).
 * Call once at startup; throws if connection fails.
 */
export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set in environment variables");
  }

  mongoose.set("strictQuery", true);

  await mongoose.connect(uri);
  console.log(`MongoDB connected: ${mongoose.connection.host}`);
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
