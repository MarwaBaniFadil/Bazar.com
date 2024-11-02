//import require modules
const express = require('express'); 
const http =require('http'); 
const DatabaseConfig = require('./DatabaseConfig');   
const app = express(); 
const port= 5000; 
app.use(express.json());   

app.get('/search/:topic',(req,res)=>{                                              //get search req 
    DatabaseConfig.searchTopic(req.params.topic, (err, data) => {                 //call the serch method from databaseconfig to search for an item
        if (err) {
            res.status(500).send('Error fetching data from database');            //error handling
        } else {
            res.json(data);    
            console.log('Fetched successfully');
            console.log(data);
        }
    });
})

app.get('/books', (req, res) => { // Get request to fetch all books
    DatabaseConfig.showAllBooks((err, data) => { // Call the method to fetch all books
        if (err) {
            res.status(500).send('Error fetching data from database'); // Error handling
        } else {
            res.json(data); // Send the fetched data as JSON response
            console.log('Fetched all books successfully ');
            console.log(data);
        }
    });
});


app.get('/info/:item_number',(req,res)=>{                                        //call the info method from databaseconfig to fetch data for item                 
    DatabaseConfig.info(req.params.item_number, (err, data) => {
        if (err) {
            res.status(500).send('Error fetching data from database');           //error handling
        } else {
            console.log('Fetched successfully');
            console.log(data);
            res.json(data);                                                      //if success send the data as a json
        }
    });
})

app.put('/update/:item_number',(req,res)=>{                                     // to update the quantity of an item
    quantity = req.body.quantity;                                                     //extract the quantity from the body
    console.log( req.body.quantity);
    DatabaseConfig.updatequantity(quantity,req.params.item_number, (err) => {         //call the updatequantity method from databaseconfig to update the quantity of the item

        if (err) {
            res.status(500).send('Error fetching data from database');          //error handling
        } else {
            res.status(200).send(' Done Updated');
        }
    });
})

app.listen(port,()=>{  
    console.log(`Catalog server is running at port ${port}`);
})

