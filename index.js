const express = require('express');
const admin = require("firebase-admin");
const { MongoClient } = require('mongodb');
require('dotenv').config();
const cors = require('cors');
const ObjectId = require('mongodb').ObjectId;
const fileUpload = require('express-fileupload');

const port = process.env.PORT || 5000;
const app = express();
app.use(cors());
app.use(express.json());
app.use(fileUpload())



const serviceAccount = require('./dctoken.json');

const stripe = require("stripe")('sk_test_51HdHuDEzOCt8A2LOzx5jYdsPaVj0i2rpEPvYb97WUQw0cjIE3tTYJ8njowOlMV5d825PsC1agqWbENO0DIU2e0py00nVktw4ng');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];
        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;

        }
        catch {

        }

    }
    next();



}




// middleware
app.use(cors());
app.use(express.json());






const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rojhc.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function run() {
    try {
        await client.connect();
        console.log('database connected successfully');
        const database = client.db("Doctor-portal");
        const appointMentCollection = database.collection("Appointment");
        const usersCollection = database.collection("users");
        const doctorsCollection = database.collection("doctors");


        app.get('/appointments', verifyToken, async (req, res) => {
            const email = req.query.email;

            const date = req.query.date;

            const query = { email: email, date: date }

            const cursor = appointMentCollection.find(query);
            const appointments = await cursor.toArray();
            res.json(appointments);

        })

        app.get('/appointments/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await appointMentCollection.findOne(query);
            res.json(result);

        })

        app.post('/appointment', async (req, res) => {
            const query = req.body;
            const result = await appointMentCollection.insertOne(query);
            res.json(result)

        })

        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
            }

            res.json({ admin: isAdmin });

        })
        //
        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        });
        app.put('/users/admin', verifyToken, async (req, res) => {
            const user = req.body;
            const requester = req.decodedEmail;
            if (requester) {
                const requesterAccount = await usersCollection.findOne({ email: requester });
                if (requesterAccount.role === 'admin') {
                    const filter = { email: user.email };
                    const updateDoc = { $set: { role: 'admin' } };
                    const result = await usersCollection.updateOne(filter, updateDoc);
                    res.json(result);
                }
            }
            else {
                res.status(403).json({ message: 'you do not have access to make admin' })
            }

        });
        app.post('/create-payment-intent', async (req, res) => {
            const paymentInfo = req.body;
            const amount = paymentInfo.price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
              currency: 'usd',
              amount: amount,
              payment_method_types: ['card']
            });
            res.json({ clientSecret: paymentIntent.client_secret })
          });
          //
          app.put('/appointments/:id', async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
              $set: {
                payment: payment
              }
            };
            const result = await appointMentCollection.updateOne(filter, updateDoc);
            res.json(result);
          })
          app.post('/adddoctor',async (req,res)=>{
            const email = req.body.email;
            const name = req.body.name;
            const image = req.files.image;
            const picData = image.data;
            const encodedImage = picData.toString('base64');
            const imageBuffer = Buffer(encodedImage,'base64');
            const doctor = {
                name,
                email,
                image: imageBuffer
            }
            const result = await doctorsCollection.insertOne(doctor);
            res.json(result);


          });
           
          app.get('/doctors', async (req, res) => {
            const cursor = doctorsCollection.find({});
            const doctors = await cursor.toArray();
            res.json(doctors);
        });






    }
    finally {
        // await client.close();
    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Doctor portal server is running');
});

app.listen(port, () => {
    console.log('Server running at port', port);
})