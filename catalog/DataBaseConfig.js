const sqlite3 = require('sqlite3').verbose();                                      // import Sqlite3 module
const db = new sqlite3.Database('data.db',sqlite3.OPEN_READWRITE,(err)=>{          // create a new Sqlite instance with read-write mode

    if(err) 
    return console.error(err.message);
});
let sql;
function createCatalogTable(){                                                     //function to create catalog table
   sql = `CREATE TABLE IF NOT EXISTS catalog(id INTEGER PRIMARY KEY,title,price,Topic,quantity)`;
   db.run(sql)
}

function insertIntoCatalog(title,price,Topic,quantity){                                //function to insert data into the catalog table  
   sql =`INSERT INTO catalog (title,price,Topic,quantity) VALUES(?,?,?,?)`
   db.run(sql,[title,price,Topic,quantity],(err)=>{
    if(err) 
    return console.error(err.message);
})
}
function searchTopic(topic, callback){                                             //function to search for item                              
    sql=`SELECT * FROM catalog where topic = ?`;
    db.all(sql,[topic],(err,rows)=>{
        db.all(sql, [topic], (err, rows) => {
            if (err) {
                callback(err, null);
            } else {
                callback(null, rows);
            }
        });
    })
    }  
    function showAllBooks(callback) { // Function to show all books in the catalog
        const sql = `SELECT * FROM catalog`; // SQL query to select all books
        db.all(sql, [], (err, rows) => { // Execute the SQL query
            if (err) {
                callback(err, null); // Handle errors if they occur
            } else {
                callback(null, rows); // Return the fetched rows
            }
        });
    }
    


function info(id, callback) {                                                  //function to retrieve info about an item 
    const sql = `SELECT * FROM catalog WHERE id = ?`;
    db.all(sql, [id], (err, row) => {
        if (err) {
            callback(err, null);
        } else {
            callback(null, row);
        }
    });
}

function updatequantity(quantity,id,callback){                                     //function to update the quantity of an item 
    sql=`UPDATE catalog SET quantity = ? where id = ?`;
    db.run(sql,[quantity,id],(err)=>{

        if (err) {
            callback(err, null);
        } else {
            console.log("quantity updated successfully");
        }
    })
        
    }
    
    module.exports = {                                                       //export functions to be used externally
        createCatalogTable,
        insertIntoCatalog,
        searchTopic,
        info,
        updatequantity,
        showAllBooks
     }