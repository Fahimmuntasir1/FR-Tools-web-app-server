const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.b8pet.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJwt(req, res, next){
  const authHeader = req.body.authorization
  if(!authHeader){
    return res.status(401).send({message : 'unauthorized access'})
  }
  const token = authHeader.split(' ')[1]
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function(err, decoded){
    if(err){
      return res.status(403).send({message: 'Access Forbidden'})
    }
    req.decoded = decoded
    next()
  })
}


async function run() {
  try {
    await client.connect();
    const toolsCollection = client.db("FR-Tools").collection("Tools");
    const userCollection = client.db("FR-Tools").collection("users");
    const reviewsCollection = client.db("FR-Tools").collection("review");
    const ordersCollection = client.db("FR-Tools").collection("orders");

    //get all tools
    app.get("/tools", async (req, res) => {
      const query = {};
      const cursor = toolsCollection.find(query);
      const tools = await cursor.toArray();
      res.send(tools);
    });
    //create user or update user
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1h" }
      );
      res.send({ result, token });
    });
    //get single tool by id
    app.get("/tools/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const tool = await toolsCollection.findOne(query);
      res.send(tool);
    });

    app.get("/review", async (req, res) => {
      const query = {};
      const cursor = reviewsCollection.find(query);
      const reviews = await cursor.toArray();
      res.send(reviews);
    });
    // post add items
    app.post("/review", async (req, res) => {
      const review = req.body;
      const result = await reviewsCollection.insertOne(review);
      res.send(result);
    });

    //update quantity
    app.put("/update/:id", async (req, res) => {
      const id = req.params.id;
      const object = req.body;
      
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          availableQuantity: object.updatedQuantity,
        },
      };
      console.log(updateDoc);
      const result = await toolsCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });
    // post add items
    app.post("/order", async (req, res) => {
      const order = req.body;
      const result = await ordersCollection.insertOne(order);
      res.send(result);
    });
    //get all user
    app.get('/user', async(req,res)=>{
      const users = await userCollection.find().toArray()
      res.send(users)
    })


  } finally {
    // await client.close();
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Running tools management server");
});
app.listen(port, () => {
  console.log("listening to port", port);
});
