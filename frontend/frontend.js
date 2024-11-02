console.log("Starting frontend service...");

const express = require('express'); 
const axios = require('axios'); 
const { createClient } = require('@redis/client'); 
const app = express(); 
const port = 5002;
// console.log("Starting frontend service...2");

const redis = require('redis');
// console.log("Starting frontend service...3");

// Backup lists for order and catalog
const replicas_O = [
    "http://order:5001", // order
    "http://order_replica:5003", // order_replica
];
const replicas_C = [
    "http://catalog:5000", // catalog
    "http://catalog_replica:5004", // catalog_replica
];


// Round tracking indicators for each list
let currentOrderReplicaIndex = 0;
let currentCatalogReplicaIndex = 0;

// Function to select the next order replica
function getNextOrderReplica() {
    const replica = replicas_O[currentOrderReplicaIndex];
    currentOrderReplicaIndex = (currentOrderReplicaIndex + 1) % replicas_O.length;
    return replica;
}
// Function to select the next catalog replica
function getNextCatalogReplica() {
    const replica = replicas_C[currentCatalogReplicaIndex];
    currentCatalogReplicaIndex = (currentCatalogReplicaIndex + 1) % replicas_C.length;
    return replica;
}

// Setting up Redis
const client = createClient({
    url: 'redis://my-redis:6379'  
});

client.on('error', (err) => console.log('Redis Client Error', err));

async function connectRedis() {
    await client.connect();
}

connectRedis().catch(console.error);

const setCache = async (key, value) => {
    await client.setEx(key, 3600, JSON.stringify(value)); // Store data in cache for one hour
};

const getCache = async (key) => {
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
};
// console.log("Starting frontend service...5");
// Search requests for the catalog
app.get('/search/:topic', async (req, res) => {
    const topic = req.params.topic;
    const cacheKey = `search:${topic}`;

    // Check the cache
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
        console.log(`Cache hit for topic: ${topic}`);
        return res.json(cachedData);
    } else {
        console.log(`Cache miss for topic: ${topic}`);
    }

    const replica = getNextCatalogReplica(); // Use the next catalog replica
    console.log(`Sending request to ${replica}/search/${topic}`);
    
    try {
        const response = await axios.get(`${replica}/search/${topic}`);
        console.log('Response received:', response.data);
        
        setCache(cacheKey, response.data); 
        res.json(response.data); 
    } catch (error) {
        console.error(`Error fetching data from ${replica}/search/${topic}:`, error.message);
        res.status(500).json({ error: error.message });
    }
});
// console.log("Starting frontend service...6");
// Information requests for the catalog
app.get('/info/:item_number', async (req, res) => {
    const itemNumber = req.params.item_number;
    const cacheKey = `info:${itemNumber}`;

    const cachedData = await getCache(cacheKey);
    if (cachedData) {
        console.log(`Cache hit for item number: ${itemNumber}`);
        return res.json(cachedData);
    } else {
        console.log(`Cache miss for item number: ${itemNumber}`);
    }

    const replica = getNextCatalogReplica(); // Use the next catalog replica
    console.log(`Sending request to ${replica}/info/${itemNumber}`);
    
    try {
        const response = await axios.get(`${replica}/info/${itemNumber}`);
        console.log('Response received:', response.data);
        
        setCache(cacheKey, response.data); 
        res.json(response.data);
    } catch (error) {
        console.error(`Error fetching data from ${replica}/info/${itemNumber}:`, error.message);
        res.status(500).json({ error: error.message });
    }
});
// console.log("Starting frontend service...7");
// Purchase requests for the order
app.post('/purchase/:item_number', async (req, res) => {
    const itemNumber = req.params.item_number;
    const replica = getNextOrderReplica(); // Use the next order replica
    console.log(`Sending POST request to ${replica}/purchase/${itemNumber}`);
    
    try {
        const response = await axios.post(`${replica}/purchase/${itemNumber}`);
        console.log('Ordered successfully:', response.data);

        // After purchasing, update book data in the cache
        const cacheKey = `info:${itemNumber}`;
        const catalogReplica = getNextCatalogReplica(); // Choose a catalog replica

        // Fetch updated book information from the catalog service
        const updatedInfo = await axios.get(`${catalogReplica}/info/${itemNumber}`);
        console.log('Updated book info received:', updatedInfo.data);

        // Update the cache with the new information
        setCache(cacheKey, updatedInfo.data);

        res.json(response.data);
    } catch (error) {
        console.error(`Error processing purchase for ${replica}/purchase/${itemNumber}:`, error.message);
        res.status(500).json({ error: error.message });
    }
});
// console.log("Starting frontend service...8");

app.delete('/cache/clear', async (req, res) => {
    try {
        await client.flushDb(); // Clear all data from Redis
        console.log('Cache cleared successfully');
        res.json({ message: 'Cache cleared successfully' });
    } catch (error) {
        console.error('Error clearing cache:', error.message);
        res.status(500).json({ error: error.message });
    }
});
// console.log("Starting frontend service...9");
app.get('/books', (req, res) => { // Get request to fetch all books
    DatabaseConfig.showAllBooks((err, data) => { // Call the method to fetch all books
        if (err) {
            res.status(500).send('Error fetching data from database'); // Error handling
        } else {
            res.json(data); // Send the fetched data as JSON response
            console.log('Fetched all books successfully');
            console.log(data);
        }
    });
});
// console.log("Starting frontend service...10");
// API to get all data in the cache
app.get('/cache/all', async (req, res) => {
    try {
        const keys = await client.keys('*'); // Fetch all keys from Redis
        const cacheData = {};

        // Fetch data associated with each key
        for (const key of keys) {
            const data = await client.get(key);
            cacheData[key] = JSON.parse(data);
        }

        console.log('Cache data retrieved:', cacheData);
        res.json(cacheData); // Send all stored data in the cache
    } catch (error) {
        console.error('Error retrieving cache data:', error.message);
        res.status(500).json({ error: error.message });
    }
});
app.listen(port,()=>{  
    console.log(`frontend server is running at port ${port}`);
})

