const { MongoClient } = require('mongodb');

let db = null;
let client = null;

const connectDB = async () => {
    try {
        client = new MongoClient(process.env.MONGODB_URI);
        await client.connect();

        db = client.db();
        console.log(`MongoDB Connected: ${client.options.hosts[0]}`);

        await createIndexes();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const createIndexes = async () => {
    try {
        // Compound index on watches collection for search optimization
        await db.collection('watches').createIndex(
            { brand: 1, price: 1 },
            { name: 'brand_price_idx' }
        );

        // Text index for search functionality
        await db.collection('watches').createIndex(
            { model: 'text', brand: 'text', description: 'text' },
            { name: 'search_idx' }
        );

        // Index on users collection
        await db.collection('users').createIndex(
            { email: 1 },
            { unique: true, name: 'email_idx' }
        );

        // Compound index on orders collection
        await db.collection('orders').createIndex(
            { user: 1, createdAt: -1 },
            { name: 'user_orders_idx' }
        );

        // Index on reviews collection
        await db.collection('reviews').createIndex(
            { watch: 1, createdAt: -1 },
            { name: 'watch_reviews_idx' }
        );

        // Unique compound index on reviews
        await db.collection('reviews').createIndex(
            { watch: 1, user: 1 },
            { unique: true, name: 'watch_user_unique_idx' }
        );

        console.log('Database indexes created successfully');
    } catch (error) {
        console.error('Error creating indexes:', error.message);
    }
};

const getDB = () => {
    if (!db) {
        throw new Error('Database not initialized');
    }
    return db;
};

const closeDB = async () => {
    if (client) {
        await client.close();
    }
};

module.exports = { connectDB, getDB, closeDB };