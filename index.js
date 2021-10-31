const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const { query } = require('express');
var admin = require("firebase-admin");
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

//firebase admin initialization
var serviceAccount = require("./ema-john-simple-9af71-firebase-adminsdk-rbh29-079767afe2.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.y1dxx.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const idToken = req.headers.authorization.split('Bearer ')[1];
        try {
            const decodedUser = await admin.auth().verifyIdToken(idToken);
            req.decodedUserEmail = decodedUser.email;
        }
        catch {

        }
    }
    next();
}

async function run() {
    try {
        await client.connect();
        const database = client.db('online_Shop');
        const productCollection = database.collection('products');
        const orderCollection = database.collection('orders');

        //GET Products API
        app.get('/products', async (req, res) => {
            const cursor = productCollection.find({});
            const count = await cursor.count();
            const page = req.query.page;
            const size = parseInt(req.query.size);

            let products;

            if (page) {
                products = await cursor.skip(page * size).limit(size).toArray();
            }
            else {
                products = await cursor.toArray();
            }

            res.send({
                count,
                products
            });
        });

        //Use POST to get data by Keys
        app.post('/products/byKeys', async (req, res) => {
            const keys = req.body;
            const query = { key: { $in: keys } }
            const products = await productCollection.find(query).toArray();
            res.json(products);
        })


        //Add Orders API
        app.get('/orders', verifyToken, async (req, res) => {
            const email = req.query.email;
            if (req.decodedUserEmail === email) {
                const cursor = orderCollection.find(query);
                const orders = await cursor.toArray();
                res.send(orders);
            }
            else {
                res.status(401).json({ message: 'User not Authorized' })
            }

        })
        app.post('/orders', async (req, res) => {
            const order = req.body;
            order.createdAy = new Date();
            const result = await orderCollection.insertOne(order);
            res.json(result)
        })

    }
    finally {
        // await client.close();
    }

}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send("Ema-John server is running.");
})

app.listen(port, () => {
    console.log('Server running at port: ', port);
})