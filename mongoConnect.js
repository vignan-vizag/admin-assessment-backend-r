const MongoClient = require("mongodb").MongoClient;
const dotenv = require("dotenv");
dotenv.config();

const url = process.env.MONGO_URI;
const dbName = process.env.DB_NAME;
let db;
let client;

// Initialize connection
const initConnection = async () => {
  try {
    if (!client) {
      client = await MongoClient.connect(url);
      console.log("Connected successfully to MongoDB server");
      db = client.db(dbName);
    }
    return db;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
};

// Initialize connection immediately
initConnection().catch(console.error);

async function mongoConnect() {
  if (!db) {
    return await initConnection();
  }
  return db;
}

module.exports = { mongoConnect };