const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
require("dotenv").config();

app.use(cors());
app.use(express.json());
const stripe = require("stripe")(process.env.STRIPE_API_SECRET_KEY);

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
    const selectedClassCollection = client.db("AllData").collection("selectedClasses");
    const enrolledClassCollection = client.db("AllData").collection("enrolledClasses");
    const paymentCollection = client.db("AllData").collection("payments");
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
      res.send({role: user?.role || 'student'});
    })
    // Getting all classes based on email
    app.get('/classes/:email', async(req, res) => {
      const email = req.params.email;
      const query = {instructorEmail: email};
      const classes = await classCollection.find(query).toArray();
      res.send(classes);

    })
    // Getting specific class details
    app.get('/class-details/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await classCollection.findOne(query);
      res.send(result);
    })
    // Getting all the classes form classCollection
    app.get('/all-classes', async(req, res) => {
      const result = (await classCollection.find().toArray()).reverse();
      res.send(result);
    })
    // Getting all users
    app.get('/all-users', async(req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    })
    // Getting all approved classes
    app.get('/approved-classes', async(req, res) => {
      const query = {status: 'approved'};
      const result = await classCollection.find(query).toArray();
      res.send(result);
    })
    // Getting all selected classes based on user email
    app.get('/selected-classes/:email', async(req, res) => {
      const email = req.params.email;
      const query = {userEmail: email};
      const result = await selectedClassCollection.find(query).toArray();
      res.send(result);
    })
    // Getting selected item details based on items id
    app.get('/selected-item/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await selectedClassCollection.findOne(query);
      res.send(result);
    })
    // Getting all enrolled classes;
    app.get('/enrolled-classes/:email', async(req, res) => {
      const email = req.params.email;
      const query = {userEmail: email};
      const result = (await enrolledClassCollection.find(query).toArray()).reverse();
      res.send(result);
    })
    // Getting payments based on user email
    app.get('/payments/:email', async(req, res) => {
      const email = req.params.email;
      const query = {userEmail: email};
      const result = (await paymentCollection.find(query).toArray()).reverse();
      res.send(result);
    });
    // Getting specific instructors class
    app.get('/instructor-classes/:email', async(req, res) => {
      const email = req.params.email;
      const query = { instructorEmail: email, status: 'approved'};
      const result = await classCollection.find(query).toArray();
      res.send(result);
    })
    // Getting six popular classes
    app.get('/popular-classes', async (req, res) => {
      const result = await classCollection.find({ enrolled: { $exists: true }, status: 'approved'}).sort({ enrolled: -1 }).limit(6).toArray();
      res.send(result);
    })
    app.get('/popular-instructors', async (req, res) => {
      const result = await userCollection.find({students: {$exists: true}, role: 'instructor'}).sort({students: -1}).limit(6).toArray();
      res.send(result);
    })
    // Getting admin stats
    app.get('/admin-stats', async(req, res) => {
      const [{totalAmount}] = await paymentCollection.aggregate([
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$price' }
          }
        }
      ]).toArray();
      const [{totalStudents, totalClasses}] = await userCollection.aggregate([
        {
          $match: { role: 'instructor' }
        },
        {
          $group: {
            _id : null,
            totalStudents: { $sum: '$students' },
            totalClasses: { $sum: '$classes' }
          }
        }
      ]).toArray();
      const totalInstructors = (await userCollection.find({role: 'instructor'}).toArray()).length;
      res.send({totalStudents, totalClasses ,totalAmount, totalInstructors});
    })
    //--------------POST---------------------------------POST--------------------------POST
    // Posting class to database
    app.post('/add-class', async(req, res) => {
      const classInfo = req.body;
      const result = await classCollection.insertOne(classInfo);
      res.send(result);
    });
    // Increasing instructors class number
    app.post('/update-class-number/:email', async(req, res) => {
      const email = req.params.email;
      const query = {email: email};
      const result = await userCollection.findOneAndUpdate(query, {$inc: {classes: 1}}, {returnOriginal: false});
      res.send(result);
    });
    // Increasing instructors students number
     app.post('/update-students-number/:email', async(req, res) => {
      const email = req.params.email;
      const query = {email: email};
      const result = await userCollection.findOneAndUpdate(query, {$inc: {students: 1}}, {returnOriginal: false});
      res.send(result);
    });
    // Increasing enrolled students based on classId
    app.post('/update-enrolled-students/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await classCollection.findOneAndUpdate(query, {$inc: {enrolled: 1}}, {returnOriginal: false});
      res.send(result);
    });
    // Storing user selected Item;
    app.post('/add-selected-class', async(req, res) => {
      const selectedItem = req.body;
      const result = await selectedClassCollection.insertOne(selectedItem);
      res.send(result);
    })
    // Creating payment intent
    app.post('/create-payment-intent', async(req, res) => {
      const {price} = req.body;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: 'usd',
        payment_method_types: ['card']
      });
      res.send({ClientSecret: paymentIntent.client_secret});
    });
    app.post('/add-class-to-enrolled', async(req, res) => {
      const body = req.body;
      const result = await enrolledClassCollection.insertOne({...body});
      res.send(result);
    })
    // Storing payment invoice 
    app.post('/store-payment-details', async(req, res)=>{
      const body = req.body;
      const result = await paymentCollection.insertOne({...body});
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
    // Updating class info
    app.patch('/update-class/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const updateInfo = req.body;
      const updateDoc = {
        $set: {...updateInfo}
      }
      const result = await classCollection.updateOne(query, updateDoc);
      res.send(result);
    })
    // Updating class status and feedback by admin
    app.patch('/update-class-status/:id', async(req,res) => {
      const id = req.params.id;
      const updatedInfo = req.body;
      const query = {_id: new ObjectId(id)};
      const updateDoc = {
        $set: {...updatedInfo}
      }
      const options = {upsert: true};
      const result = await classCollection.updateOne(query, updateDoc, options);
      res.send(result);
    })
    // Updating user status by admin
    app.patch('/update-user/:id', async(req, res) => {
      const id = req.params.id;
      const {status} = req.body;
      const query = {_id : new ObjectId(id)};
      const updatedDoc = {
        $set: {role: status}
      }
      const options = {upsert: true}
      const result = await userCollection.updateOne(query, updatedDoc, options);
      res.send(result);
    })
    
    //------------DELETE------------------------------DELETE-------------------------DELETE
    // Deleting specific instructors class based on id
    app.delete('/delete-class/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await classCollection.deleteOne(query);
      res.send(result);
    })
    // Deleting students selected class based on id
    app.delete('/delete-selected-class/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await selectedClassCollection.deleteOne(query);
      res.send(result);
    })
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
