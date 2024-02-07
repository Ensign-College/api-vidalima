const express = require('express'); // express makes APIs - connect frontend to database

const bodyParser = require('body-parser'); // Add this line to parse request body

const Redis = require('redis'); // import the Redis Class from Library 

const cors = require ('cors');

const options = {
    origin: 'http://localhost:3000' //allow our frontend to call this backend
}

const redisClient = Redis.createClient({
    url: `redis://localhost:6379`
});

const app = express(); // create an express application (express is like a constructor)
const port = 3001; // this is the port number

app.use(bodyParser.json()); // Use bodyParser to parse JSON requests
app.use(cors(options)); // allow frontend to call backend

app.listen(port, () => {
    redisClient.connect(); // this connects to the redis database!!!
    console.log(`API is Listening on port: ${port}`); // template literal

}); // listen for web requests from the fronend and don't stop (3000 is the port number)

//http://localhost:3000/boxes
// 1 - URL
// 2 - A function to return boxes
// req= the  request from the browser
// res= the response to the browser


// Handle POST requests to create boxes
app.post('/boxes', async (req, res) => {
    // req = required info, red = response 
    // async mean we will await promises 


        // Assuming the request body contains the box data in JSON format
        const newBox = req.body;

        newBox.id = parseInt (await redisClient.json.arrLen('boxes', '$')) +1; // the user shoudln't choose the ID

        // Add the new box to the Redis database
        await redisClient.json.arrAppend('boxes', '$',newBox);

        //Respond with new box
        res.json(newBox);

});

app.get('/boxes', async (req, res) => { // async is a promise (race car condition is when we don't know what will come up first)

    //send the boxes to the browser 
    let boxes = await redisClient.json.get('boxes', { path: '$' }); //get the boxes
    //Print boxes to the console
    console.log('Boxes:', boxes);

    res.json(boxes[0]);//the boxes is an array of arrays,convert first element to a JSON string

}); // return boxes to the user 


console.log("Hello");

