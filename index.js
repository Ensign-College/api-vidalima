const Redis = require('redis');
const {addOrder, getOrder} = require("./services/orderservice.js");
const {addOrderItem} = require("./services/orderItemservice.js");
const fs = require("fs");
const Schema = JSON.parse(fs.readFileSync("./orderItemSchema.json"));
const Ajv = require('ajv');
const ajv = new Ajv();

const redisClient = Redis.createClient({
    url:`redis://localhost:6379`
});

exports.boxesHandler = async (event, context) => {
    try {
        const boxes = await redisClient.json.get('boxes', { path: '$' });
        return {
            statusCode: 200,
            body: JSON.stringify(boxes[0])
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: "Internal Server Error"
        };
    }
};

exports.ordersHandler = async (event, context) => {
    try {
        const order = JSON.parse(event.body);
        let responseStatus = order.productQuantity
            ? 200
            : 400 && order.shippingAddress
            ? 200
            : 400;

        if (responseStatus === 200) {
            try {
                await addOrder({ redisClient, order });
            } catch (error) {
                console.error(error);
                return {
                    statusCode: 500,
                    body: "Internal Server Error"
                };
            }
        }

        return {
            statusCode: responseStatus,
            body: responseStatus === 200 ? "" : `Missing one of the following fields: ${exactMatchOrderFields()} ${partiallyMatchOrderFields()}`
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 400,
            body: "Invalid request body"
        };
    }
};

exports.orderItemsHandler = async (event, context) => {
    try {
        const validate = ajv.compile(Schema);
        const valid = validate(JSON.parse(event.body));
        if (!valid) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Invalid request body" })
            };
        }

        const orderItemId = await addOrderItem({ redisClient, orderItem: JSON.parse(event.body) });

        return {
            statusCode: 201,
            body: JSON.stringify({ orderItemId, message: "Order item added successfully" })
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: "Internal Server Error"
        };
    }
};

exports.ordersByIdHandler = async (event, context) => {
    try {
        const orderId = event.pathParameters.orderId;
        const order = await getOrder({ redisClient, orderId });

        return {
            statusCode: 200,
            body: JSON.stringify(order)
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: "Internal Server Error"
        };
    }
};

