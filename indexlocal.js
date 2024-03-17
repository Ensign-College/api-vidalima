const express = require("express"); // express makes APIs - connect frotend to database
const Redis = require("redis"); //redis is a database, import the Redis class from the redis library
const bodyParser = require("body-parser"); //body-parser is a library that allows us to read the body of a request
const cors = require("cors"); //cors is a library that allows us to make requests from the frontend to the backend
const { addOrder, getOrder } = require("./services/orderservice.js"); //import the addOrder function from the orderservice.js file
const { addOrderItem, getOrderItem } = require("./services/orderItems.js"); //import the addOrderItem function from the orderItems.js file
const fs = require("fs"); //import the ajv library
const Schema = JSON.parse(fs.readFileSync("./services/orderItemSchema.json", "utf8")); // read the orderItemSchema.json file
const Ajv = require("ajv"); //import the ajv library
const ajv = new Ajv(); // create an ajv object to validade JSON

// SERVER SETUP
const options = {
  origin: "http://localhost:3000", //allow requests from the frontend
};

//import redis from 'redis';//import redis library
const redisClient = Redis.createClient({
  url: `redis://localhost:6379`, //connect to redis on port 6379
}); //create a redis client
const app = express(); // create an express application
app.use(bodyParser.json()); //use the body-parser library to read JSON from the request body
app.use(cors(options)); //use the cors library to allow requests from the frontend
const port = 3001; // port to run the server on
app.listen(port, () => {
  redisClient.connect(); //connect to redis
  console.log(`API is listening on port: ${port}`); //template literal
}); //listen for web requests form the frontend and don't stop () => console.log('listening at 3000')); // listen for requests on port 3000

app.get("/boxes", async (req, res) => {
  let boxes = await redisClient.json.get("boxes", { path: "$" }); //get boxes from redis
  res.json(boxes[0]); //convert boxes to a JSON string and send it to the user
}); //return boxes to the user

app.post("/boxes", async (req, res) => {
  const newBox = req.body; //get the box from the request body
  newBox.id = parseInt(await redisClient.json.arrLen("boxes", "$")) + 1; //add an id to the box, the user should not provide an id
  await redisClient.json.arrAppend("boxes", "$", newBox); //save the box to redis
  res.json(newBox); //send the box back to the user
}); //add a box to the list of boxes

//ORDER
app.post("/orders", async (req, res) => {
  let order = req.body;
  // order details, include product quantity and shipping address
  let responseStatus =
    order.customerId && order.shippingAddress ? 200 : 400;

  if (responseStatus === 200) {
    try {
      // addOrder function to handle order creation in the database
      await addOrder({ redisClient, order });
      res
        .status(200)
        .json({ message: "Order created successfully", order: order });
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
      return;
    }
  } else {
    res.status(responseStatus);
    res.send(
      `Missing one of the following fields: ${
        order.customerId ? "" : "customerId"
      } ${order.shippingAddress ? "" : "shippingAddress"}`
    );
  }
  
});

app.get("/orders/:orderId", async (req, res) => {
  //get the order from the database
  const orderId = req.params.orderId;
  let order = await getOrder({ redisClient, orderId });
  if (order === null) {
    res.status(404).send("Order not found");
  } else {
    res.json(order);
  }
});

//ORDER ITEMS
app.post("/orderItems", async (req, res) => {
  try {
    console.log("Schema:", Schema);
    const validate = ajv.compile(Schema);
    const valid = validate(req.body);
    if (!valid) {
      return res.status(400).json({ error: "Invalid request body" });
    }
    console.log("Request Body:", req.body);

    // Calling addOrderItem function and storing the result
    const orderItemId = await addOrderItem({
      redisClient,
      orderItem: req.body,
    });

    // Responding with the result
    res
      .status(201)
      .json({ orderItemId, message: "Order item added successfully" });
  } catch (error) {
    console.error("Error adding order item:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/orderItems/:orderItemId", async (req, res) => {
  try {
    const orderItemId = req.params.orderItemId;
    const orderItem = await getOrderItem({ redisClient, orderItemId });
    res.json(orderItem);
  } catch (error) {
    console.error("Error getting order item:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
