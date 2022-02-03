const express = require('express');
const { MongoClient } = require('mongodb');
require('dotenv').config();
const cors = require('cors');

const app = express();
const port = process.env.PORT || 5000;

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


        app.get('/appointments',async(req,res)=>{
            const email = req.query.email;
        
            const date = new Date(req.query.date).toLocaleDateString();

            const query = { email: email, date: date }

            const cursor = appointMentCollection.find(query);
            const appointments = await cursor.toArray();
            res.json(appointments);

        })
      
        app.post('/appointment',async(req,res)=>{
            const query = req.body;
            const result = await appointMentCollection.insertOne(query );
            res.json(result)

        })
      
        app.post('/users',async(req,res)=>{
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            console.log(result);
            res.json(result);

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
        app.put('/users/admin',async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const updateDoc = { $set: {role:'admin'} };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.json(result);


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