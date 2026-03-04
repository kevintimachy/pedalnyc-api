const mongoose = require("mongoose");
const Schema = mongoose.Schema;


const tripSchema = new Schema({
    "tripduration": Number,
    "start station id": Number,
    "start station name": String,
    "end station id": Number,
    "end station name": String,
    "bikeid": Number,
    "usertype": String,
    "birth year": Number,
    "gender": Number,
    "start station location": {
        "type": { type: String },
        "coordinates": [Number]
    },
    "end station location": {
        "type": { type: String },
        "coordinates": [Number]
    },
    "start time": Date,
    "stop time": Date
});

module.exports = class TripDB {
    constructor() {
        // We don't have a `Trip` object until initialize() is complete
        this.Trip = null;
        this.connection = null;
    }

    // Pass the connection string to `initialize()`
    async initialize(connectionString) {
        if (!connectionString) {
            throw new Error("Missing MongoDB connection string");
        }

        this.connection = mongoose.createConnection(connectionString);
        await this.connection.asPromise();

        this.Trip = this.connection.model("trips", tripSchema);
    }

    async addNewTrip(data) {
        const newTrip = new this.Trip(data);
        await newTrip.save();
        return newTrip;
    }

    async getAllTrips(page, perPage, filters) {
        const query = this.filterQuery(filters);

        return Promise.all([
            this.Trip.find(query)
                .sort({ _id: 1 })
                .skip((page - 1) * perPage)
                .limit(perPage)
                .lean()
                .exec(),

            this.Trip.countDocuments(query)
        ]).then(([trips, total]) => ({
            trips,
            total,
            page,
            perPage,
            totalPages: Math.ceil(total / perPage)
        }));
    }

    getTripById(id) {
        return this.Trip.findOne({ _id: id }).exec();
    }

    async updateTripById(data, id) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new Error("Invalid trip ID");
        }

        const updatedTrip = await this.Trip.findByIdAndUpdate(
            id,
            { $set: data },
            {
                new: true,
                runValidators: true
            }
        ).lean();

        if (!updatedTrip) {
            throw new Error("Trip not found");
        }

        return updatedTrip;
    }

    deleteTripById(id) {
        return this.Trip.deleteOne({ _id: id }).exec();
    }

    //Analtics function to get distribution of user types based on current filters
    async getUserTypeDistribution(filters) {
        const query = this.filterQuery(filters); // Exclude usertype filter for distribution

        return this.Trip.aggregate([
            { $match: query }, // apply any filters
            { $group: { _id: "$usertype", count: { $sum: 1 } } }
        ]).exec();
    }

    getDurationDistribution(filters) {
        const query = this.filterQuery(filters);

        return this.Trip.aggregate([
            { $match: query },
            {
                $bucket: {
                    groupBy: "$tripduration",
                    boundaries: [0, 300, 600, 900, 1200, 1500, 1800, 2100, 2400, 2700, 3000, 3300],
                    default: "Other",
                    output: {
                        count: { $sum: 1 }
                    }
                }
            }
        ]).exec();
    }

    getStartStationDistribution(filters) {
        const query = this.filterQuery(filters);

        return this.Trip.aggregate([
            { $match: query },
            {
                $group: {
                    _id: "$start station name",
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]).exec();
    }

    // Quick helper to convert filter query params into MongoDB query format
    filterQuery(filters) {
        const query = {};

        // Filter by date range
        if (filters.startDate || filters.endDate) {
            query['start time'] = {};
            if (filters.startDate) query['start time'].$gte = new Date(filters.startDate);
            if (filters.endDate) query['start time'].$lte = new Date(filters.endDate);
        }

        // Filter by birth year range
        if (filters.minBirthYear || filters.maxBirthYear) {
            query['birth year'] = {};
            if (filters.minBirthYear) query['birth year'].$gte = parseInt(filters.minBirthYear, 10);
            if (filters.maxBirthYear) query['birth year'].$lte = parseInt(filters.maxBirthYear, 10);
        }

        // Filter by trip duration range
        if (filters.minDuration || filters.maxDuration) {
            query['tripduration'] = {};
            if (filters.minDuration) query['tripduration'].$gte = parseInt(filters.minDuration, 10);
            if (filters.maxDuration) query['tripduration'].$lte = parseInt(filters.maxDuration, 10);
        }

        // Filter by usertype
        if (filters.usertype) {
            query['usertype'] = filters.usertype;
        }

        return query;
    }
}
