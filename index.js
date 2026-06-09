const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json()); // Parses incoming JSON requests

const port = process.env.PORT || 5000;
const uri = process.env.MONGODB_URL;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the MongoDB server
    await client.connect();

    const db = client.db("hireloopBD");
    const usersCollection = db.collection("users");
    const jobsCollection = db.collection("jobs");
    const applicationsCollection = db.collection("applications");

    // 🎯 ফিক্স ১: কোম্পানির কালেকশন ভেরিয়েবলটি এখানে ডিফাইন করা হলো
    const companiesCollection = db.collection("companies");

    // 👥 1. GET: Fetch all users
    app.get("/users", async (req, res) => {
      try {
        const cursor = usersCollection.find();
        const result = await cursor.toArray();
        res.status(200).send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch users data" });
      }
    });

    //  2. GET: Fetch all job circulars (Latest jobs first)
    app.get("/jobs", async (req, res) => {
      try {
        const cursor = jobsCollection.find().sort({ createdAt: -1 });
        const result = await cursor.toArray();
        res.status(200).send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch jobs data" });
      }
    });

    //  3. POST: Create a new job circular
    app.post("/jobs", async (req, res) => {
      try {
        const newJob = req.body;
        newJob.createdAt = new Date(); // Adds a timestamp on the server side

        const result = await jobsCollection.insertOne(newJob);
        res.status(201).send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to post new job circular" });
      }
    });

    //  4. POST: Submit a job application
    app.post("/applications", async (req, res) => {
      try {
        const applicationData = req.body;
        const result = await applicationsCollection.insertOne(applicationData);
        res.status(201).send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to submit application" });
      }
    });

    // 5. GET: Fetch applications by a specific user email
    app.get("/applications/:email", async (req, res) => {
      try {
        const userEmail = req.params.email;
        const query = { userEmail: userEmail };
        const result = await applicationsCollection.find(query).toArray();
        res.status(200).send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch user applications" });
      }
    });

    //  6. DELETE: Remove a job circular by ID
    app.delete("/jobs/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await jobsCollection.deleteOne(query);
        res.status(200).send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to delete the job circular" });
      }
    });

    // 🔄 7. PUT: Update an existing job circular by ID
    app.put("/jobs/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const updatedJob = req.body;
        const filter = { _id: new ObjectId(id) };

        const updateDoc = {
          $set: {
            title: updatedJob.title,
            companyName: updatedJob.companyName,
            location: updatedJob.location,
            salary: updatedJob.salary,
            jobType: updatedJob.jobType,
            description: updatedJob.description,
          },
        };

        const result = await jobsCollection.updateOne(filter, updateDoc);
        res.status(200).send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to update the job circular" });
      }
    });

    // 🏢 8. GET: কোম্পানি ডাটা ফেচ করার এপিআই (যা আপনার কোডে ছিল না)

    app.get("/api/companies", async (req, res) => {
      try {
        const { userId } = req.query; // ফ্রন্টএন্ড থেকে পাঠানো userId ধরা হলো

        let query = {};
        if (userId) {
          query = { userId: userId }; // যদি userId থাকে, তবে শুধু সেই ইউজারের ডাটা ফিল্টার হবে
        }

        const cursor = companiesCollection.find(query);
        const result = await cursor.toArray();
        res.status(200).json({ success: true, data: result });
      } catch (error) {
        res
          .status(500)
          .json({ success: false, message: "Failed to fetch companies data" });
      }
    });

    // 🗑️ 9. DELETE: কোম্পানির ডাটা ডিলিট করার এপিআই
    app.delete("/api/companies/:id", async (req, res) => {
      try {
        const id = req.params.id;

        if (!id || id === "undefined") {
          return res.status(400).json({
            success: false,
            message: "আইডি পাওয়া যায়নি বা ইনভ্যালিড!",
          });
        }

        const query = { _id: new ObjectId(id) };
        const result = await companiesCollection.deleteOne(query);

        if (result.deletedCount === 1) {
          return res.json({
            success: true,
            message: "Entity removed successfully!",
          });
        } else {
          return res.status(404).json({
            success: false,
            message: "এই আইডিতে কোনো ডাটা পাওয়া যায়নি!",
          });
        }
      } catch (error) {
        console.error("Backend Delete Error:", error);
        return res.status(500).json({
          success: false,
          message: "Internal Server Error",
          error: error.message,
        });
      }
    });

    // 🔄 10. PUT: কোম্পানি আপডেট করার এপিআই
    app.put("/api/companies/:id", async (req, res) => {
      try {
        const { _id, ...updateData } = req.body;

        // 🎯 ফিক্স ২: companyCollection বদলে সঠিক ভেরিয়েবল companiesCollection ব্যবহার করা হয়েছে
        const result = await companiesCollection.updateOne(
          { _id: new ObjectId(req.params.id) },
          { $set: updateData },
        );
        res.status(200).send({ success: result.matchedCount > 0 });
      } catch (error) {
        res.status(500).send({ success: false, error: error.message });
      }
    });

    //  ৯. POST: নতুন কোম্পানি প্রোফাইল তৈরি করার এপিআই
    app.post("/api/companies", async (req, res) => {
      try {
        const newCompany = req.body;
        newCompany.createdAt = new Date();

        const result = await companiesCollection.insertOne(newCompany);

        // 🎯 নেক্সট-জেএস এর ক্লায়েন্ট যেন জেসন ডেটা নিখুঁতভাবে রিড করতে পারে
        res.setHeader("Content-Type", "application/json");
        return res.status(201).json({
          success: true,
          message: "Company profile created successfully!",
          insertedId: result.insertedId,
        });
      } catch (error) {
        console.error("Company Creation Error:", error);
        res.setHeader("Content-Type", "application/json");
        return res.status(500).json({
          success: false,
          message: "Failed to deploy new company profile",
        });
      }
    });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } catch (error) {
    console.error("Database connection error:", error);
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("HireLoop API Server is Running successfully!");
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
