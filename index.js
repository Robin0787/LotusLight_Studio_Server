const { MongoClient, ServerApiVersion } = require("mongodb");
const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
require("dotenv").config();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.8nldzhn.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const userCollection = client.db("AllData").collection("users");
    const classCollection = client.db("AllData").collection("classes");
    //---------------GET----------------------------------GET---------------------------GET
    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });
    // Getting all the instructors
    app.get('/instructors', async(req, res) => {
      const query = {role: 'instructor'};
      const instructors = await userCollection.find(query).toArray();
      res.send(instructors);
    })
    // Getting specific user role
    app.get('/user-role/:email', async(req, res) => {
      const email = req.params.email;
      const query = {email: email};
      const user = await userCollection.findOne(query);
      res.send({role: user?.role || 'user'});
    })
    // Getting all classes based on email
    app.get('/classes/:email', async(req, res) => {
      const email = req.params.email;
      const query = {instructorEmail: email};
      const classes = await classCollection.find(query).toArray();
      res.send(classes);

    })
    //--------------POST---------------------------------POST--------------------------POST
    app.post('/add-class', async(req, res) => {
      const classInfo = req.body;
      const result = await classCollection.insertOne(classInfo);
      res.send(result);
    })
    //--------------PUT---------------------------------PUT---------------------------PUT
    // Storing the user to database for further usage
    app.put("/store-user/:email", async (req, res) => {
      const email = req.params.email;
      const {details} = req.body;
      const query = { email: email };
      const updateDoc = {
        $set: details,
      };
      const options = { upsert: true };
      const result = await userCollection.updateOne(query, updateDoc, options);
      res.send(result);
    });
    //-------------PATCH-------------------------------PATCH-------------------------PATCH

    //------------DELETE------------------------------PATCH-------------------------PATCH

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Successfully connected to Database!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Welcome to LotusLight Studio Server!");
});

app.listen(port, () => {
  console.log("Server is running on port", port);
});
