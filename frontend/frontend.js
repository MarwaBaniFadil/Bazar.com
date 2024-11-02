const express = require('express'); 
const axios = require('axios'); 
const { createClient } = require('@redis/client'); 
const app = express(); 
const port = 5002;

// قوائم النسخ الاحتياطية للـ order و catalog
const replicas_O = [
    "http://order:5001", // order
    "http://order_replica:5003", // order_replica
];

const replicas_C = [
    "http://catalog:5000", // catalog
    "http://catoalog_replica:5004", // catalog_replica
];

// مؤشرات تتبع الجولة لكل قائمة
let currentOrderReplicaIndex = 0;
let currentCatalogReplicaIndex = 0;

// دالة لاختيار النسخة التالية للـ order
function getNextOrderReplica() {
    const replica = replicas_O[currentOrderReplicaIndex];
    currentOrderReplicaIndex = (currentOrderReplicaIndex + 1) % replicas_O.length;
    return replica;
}

// دالة لاختيار النسخة التالية للـ catalog
function getNextCatalogReplica() {
    const replica = replicas_C[currentCatalogReplicaIndex];
    currentCatalogReplicaIndex = (currentCatalogReplicaIndex + 1) % replicas_C.length;
    return replica;
}

// إعداد Redis
const client = createClient({
    url: 'redis://my-redis:6379'  
});

client.on('error', (err) => console.log('Redis Client Error', err));

async function connectRedis() {
    await client.connect();
}

connectRedis().catch(console.error);

const setCache = async (key, value) => {
    await client.setEx(key, 3600, JSON.stringify(value)); // حفظ البيانات في الكاش لمدة ساعة
};

const getCache = async (key) => {
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
};

// طلبات البحث للـ catalog
app.get('/search/:topic', async (req, res) => {
    const topic = req.params.topic;
    const cacheKey = `search:${topic}`;

    // تحقق من الكاش
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
        console.log(`Cache hit for topic: ${topic}`);
        return res.json(cachedData);
    } else {
        console.log(`Cache miss for topic: ${topic}`);
    }

    const replica = getNextCatalogReplica(); // استخدام النسخة التالية من الـ catalog
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

// طلبات المعلومات للـ catalog
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

    const replica = getNextCatalogReplica(); // استخدام النسخة التالية من الـ catalog
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

// طلبات الشراء للـ order
app.post('/purchase/:item_number', async (req, res) => {
    const itemNumber = req.params.item_number;
    const replica = getNextOrderReplica(); // استخدام النسخة التالية من الـ order
    console.log(`Sending POST request to ${replica}/purchase/${itemNumber}`);
    
    try {
        const response = await axios.post(`${replica}/purchase/${itemNumber}`);
        console.log('Ordered successfully:', response.data);

        // بعد الشراء، تحديث بيانات الكتاب في الكاش
        const cacheKey = `info:${itemNumber}`;
        const catalogReplica = getNextCatalogReplica(); // اختيار نسخة catalog

        // جلب المعلومات المحدثة للكتاب من خدمة الـ catalog
        const updatedInfo = await axios.get(`${catalogReplica}/info/${itemNumber}`);
        console.log('Updated book info received:', updatedInfo.data);

        // تحديث الكاش بالمعلومات المحدثة
        setCache(cacheKey, updatedInfo.data);

        res.json(response.data);
    } catch (error) {
        console.error(`Error processing purchase for ${replica}/purchase/${itemNumber}:`, error.message);
        res.status(500).json({ error: error.message });
    }
});


app.delete('/cache/clear', async (req, res) => {
    try {
        await client.flushDb(); // مسح جميع البيانات من Redis
        console.log('Cache cleared successfully');
        res.json({ message: 'Cache cleared successfully' });
    } catch (error) {
        console.error('Error clearing cache:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// API للحصول على جميع البيانات في الكاش
app.get('/cache/all', async (req, res) => {
    try {
        const keys = await client.keys('*'); // جلب جميع المفاتيح من Redis
        const cacheData = {};

        // جلب البيانات المرتبطة بكل مفتاح
        for (const key of keys) {
            const data = await client.get(key);
            cacheData[key] = JSON.parse(data);
        }

        console.log('Cache data retrieved:', cacheData);
        res.json(cacheData); // إرسال جميع البيانات المخزنة في الكاش
    } catch (error) {
        console.error('Error retrieving cache data:', error.message);
        res.status(500).json({ error: error.message });
    }
});



app.listen(port, () => {
    console.log(`Front end server is running at port ${port}`);
});
