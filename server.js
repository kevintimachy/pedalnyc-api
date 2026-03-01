const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const TripDB = require('./modules/tripsDB.js');
const db = new TripDB();
require('dotenv').config();
const { MONGODB_CONN_STRING } = process.env;
const HTTP_PORT = process.env.PORT || 8080;
// Or use some other port number that you like better

// Add support for incoming JSON entities
app.use(bodyParser.json());

// Setup CORS
app.use(cors());

// Parsing JSON using middleware
app.use(express.json());

// Deliver the app's home page to browser clients
app.get('/', (req, res) => {
    res.json({ message: "API Listening" });
});

// POST a new trip
app.post('/api/trips', async (req, res) => {
    try {
        const newTrip = await db.addNewTrip(req.body);
        res.status(201).json({ newTrip });
    }
    catch (err) {
        res.status(500).json({ error: "Unable to add trip" });
    }
});

// GET All Trips
app.get('/api/trips', (req, res) => {
    const page = req.query.page;
    const perPage = req.query.perPage;

    db.getAllTrips(page, perPage).then((data) => {
        res.status(200).json(data);
    }).catch((err) => {
        res.status(500).json(err);
    })
});

// GET Trip by ID
app.get('/api/trips/:id', (req, res) => {
    db.getTripById(req.params.id).then((data) => {
        res.status(200).json(data);
    }).catch((err) => {
        res.status(500).json(err);
    });
});

// PUT/Update trip by ID
app.put('/api/trips/:id', (req, res) => {
    db.updateTripById(req.body, req.params.id).then((data) => {
        res.status(200).json(data);
    }).catch((err) => {
        res.status(500).json(err);
    });
});

// DELETE trip by ID
app.delete('/api/trips/:id', (req, res) => {
    db.deleteTripById(req.params.id).then((data) => {
        res.status(204).json({});
    }).catch((err) => {
        res.status(500).json(err);
    });
});

// Resource not found (this should be at the end)
app.use((req, res) => {
    res.status(404).send('Resource not found');
});

// Tell the app to start listening for requests
db.initialize(MONGODB_CONN_STRING).then(() => {
    app.listen(HTTP_PORT, () => {
        console.log(`server listening on: ${HTTP_PORT}`);
    });
}).catch((err) => {
    console.log(err);
})
