//import the require modules 
const express = require('express');  
const http = require('http');       
const axios = require('axios');      
const sqlite3 = require('sqlite3').verbose(); 
const db = new sqlite3.Database('database.db'); 
const app = express();                      
const port = 5001;                             

let ordersql = `CREATE TABLE IF NOT EXISTS "order" (order_number INTEGER PRIMARY KEY, item_number)`;   // sql query to create order table

db.run(ordersql, (err) => {                                                                            //excute the query      
    if (err) {
        console.error('Error in creating table:', err.message);                                       //error handling
    } else {
        console.log('the order table created successfully');
    }
});


app.post('/purchase/:item_number', (req, res) => {                                                     //handle post req     
    const item_numberr = req.params.item_number; 
 
    const insert_query = `INSERT INTO "order" (item_number) VALUES (?)`;                               //insert order to the order table 
    db.run(insert_query, [item_numberr], (err) => {                                                    //excute  the query
        if (err) {
            console.error('Error in inserting the data:', err.message);
        } else {
            console.log('inserted successfully');
        }
    });

    const select_query = `SELECT * FROM "order"`;                                                       //query for select all order 
    db.all(select_query, [], (err, rows) => {
        if (err) {
            console.error(' querying error:', err.message);
        } else {
            console.log('table result:');                                                              // print all orders 
            rows.forEach((row) => {
                console.log(row);
            });
        }
    });

    http.get('http://catalog:5000/info/' + req.params.item_number,(response)=>{                     //get http req to send it to catalog server
        var responseData='';
        response.on("data", (chunk)=>{
          
           responseData = JSON.parse(chunk);
           console.log('Fetched successfully');
           console.log(responseData);
           
        });
        response.on('end', () => {
            
            if(responseData[0].quantity>0){
                const updatedquantity = responseData[0].quantity - 1;                                      //if the quantity greater than 0 decrease the it by 1 

                const updatedData = { quantity: updatedquantity }; 

                axios.put('http://catalog:5000/update/' + req.params.item_number, updatedData)     //http put req for update quantity number
                    .then((response) => {
                        console.log("Success");
                    })
                    .catch((error) => {
                        console.error("Error:", error);
                    });
                    res.json({ message: 'Purchase completed' });

            }
            else{
                res.json({ message: 'Item is sold out' });
            }
        });      
   
});

});

app.listen(port, () => {                                                                            // start the order server on port 5000
    console.log(`order server is running at port ${port}`);


});
