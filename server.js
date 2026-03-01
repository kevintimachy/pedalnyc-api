const express = require('express');
const cors = require('cors');
const app = express();
const TripDB = require('./modules/tripsDB.js');
const db = new TripDB();
require('dotenv').config();
const { MONGODB_CONN_STRING } = process.env;
const HTTP_PORT = process.env.PORT || 8080;

if (!MONGODB_CONN_STRING) {
    console.warn('MONGODB_CONN_STRING is not set; database operations will fail until it is provided.');
}

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.json({ message: "API Listening" });
});

app.post('/api/trips', async (req, res) => {
    try {
        const newTrip = await db.addNewTrip(req.body);
        res.status(201).json({ newTrip });
    } catch (err) {
        console.error('Failed to add trip', err);
        res.status(500).json({ error: "Unable to add trip" });
    }
});

app.get('/api/trips', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 10;

    if (page < 1 || perPage < 1) {
        return res.status(400).json({ error: "page and perPage must be positive integers" });
    }

    // Extract filter query params
    const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        minBirthYear: req.query.minBirthYear,
        maxBirthYear: req.query.maxBirthYear,
        minDuration: req.query.minDuration,
        maxDuration: req.query.maxDuration,
        usertype: req.query.usertype
    };

    db.getAllTrips(page, perPage, filters)
        .then(data => res.status(200).json(data))
        .catch(err => {
            console.error('Failed to fetch trips', err);
            res.status(500).json({ error: "Unable to retrieve trips" });
        });
});

app.get('/api/trips/:id', (req, res) => {
    db.getTripById(req.params.id)
        .then((data) => res.status(200).json(data))
        .catch((err) => {
            console.error('Failed to fetch trip', err);
            res.status(500).json({ error: "Unable to retrieve trip" });
        });
});

app.put('/api/trips/:id', (req, res) => {
    db.updateTripById(req.body, req.params.id)
        .then((data) => res.status(200).json(data))
        .catch((err) => {
            console.error('Failed to update trip', err);
            res.status(500).json({ error: "Unable to update trip" });
        });
});

app.delete('/api/trips/:id', (req, res) => {
    db.deleteTripById(req.params.id)
        .then(() => res.status(204).end())
        .catch((err) => {
            console.error('Failed to delete trip', err);
            res.status(500).json({ error: "Unable to delete trip" });
        });
});

app.use((req, res) => {
    res.status(404).send('Resource not found');
});

const dbInitPromise = db.initialize(MONGODB_CONN_STRING).catch((err) => {
    console.error('Database initialization failed', err);
    throw err;
});

if (process.env.VERCEL) {
    module.exports = async (req, res) => {
        try {
            await dbInitPromise;
            return app(req, res);
        } catch (err) {
            return res.status(500).json({ error: "Database initialization failed" });
        }
    };
} else {
    dbInitPromise
        .then(() => {
            app.listen(HTTP_PORT, () => {
                console.log(`server listening on: ${HTTP_PORT}`);
            });
        })
        .catch(() => process.exit(1));
}
