const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express()
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5000;

//middleware

app.use(cors())
app.use(express.json());

//console.log(process.env.DB_USER);
//console.log(process.env.DB_PASSWORD);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.hpc3ria.mongodb.net/?retryWrites=true&w=majority`;
//console.log(uri)
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });



function verifyJWT(req, res, next) {

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorized access');
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    })

}

async function run() {
    try {
        const categoriesCollection = client.db('furniture').collection('category');
        const usersCollection = client.db('furniture').collection('users');
        const paymentsCollection = client.db('furniture').collection('payments');

        app.get('/category', async (req, res) => {
            const query = {};
            const users = await categoriesCollection.find(query).toArray();
            res.send(category);
        })

        app.get('/users', async (req, res) => {
            const query = {};
            const users = await usersCollection.find(query).toArray();
            res.send(users);
        });
        
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'admin' });
        })
        
        app.post('/users', async (req, res) => {
            const user = req.body;
            console.log(user);
            // TODO: make sure you do not enter duplicate user email
            // only insert users if the user doesn't exist in the database
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });
        
        app.put('/users/admin/:id', verifyJWT,  async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });
        

        app.post('/create-payment-intent', async (req, res) => {
            const booking = req.body;
            const price = booking.price;
            const amount = price * 100;
        
            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                ]
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });
        
        app.post('/payments', async (req, res) =>{
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);
            const id = payment.bookingId
            const filter = {_id: ObjectId(id)}
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const updatedResult = await bookingsCollection.updateOne(filter, updatedDoc)
            res.send(result);
        })
        
        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1h' })
                return res.send({ accessToken: token });
            }
            res.status(403).send({ accessToken: '' })
        });
        
      

    }
    finally {

    }
}



run().catch(console.log);
app.get('/', (req, res) => {
    res.send('hello furnitureland')
})

app.listen(port, () => {
    console.log(`Furnitureland app listening on port ${port}`);
  });