const DatabaseConfig = require('./DatabaseConfig');


DatabaseConfig.createCatalogTable();
DatabaseConfig.insertIntoCatalog('How to get a good grade in DOS in 40 minutes a day',50,'Distributed systems',10);
DatabaseConfig.insertIntoCatalog('RPCs for Noobs',20,'Distributed systems',3);
DatabaseConfig.insertIntoCatalog('Xen and the Art of Surviving Undergraduate School',100,'Undergra duate school',4);
DatabaseConfig.insertIntoCatalog('Cooking for the Impatient Undergrad',25,'Undergraduate school',5);