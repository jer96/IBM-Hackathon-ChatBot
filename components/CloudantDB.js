// internal module for Cloudant NOSQL db service
// allows for abstraction, all of the db setup is here
// also allows for db helper functions to be created here

function createCloudantConnection(appEnv, name) {
  var mydb = null;
  if (appEnv.services['cloudantNoSQLDB']) {
    // Load the Cloudant library.
    var Cloudant = require('cloudant');

    // Initialize database with credentials
    var cloudant = Cloudant(appEnv.services['cloudantNoSQLDB'][0].credentials);

    //database name
    var dbName = name;

    // Create a new "mydb" database.
    cloudant.db.create(dbName, function(err, data) {
      if(!err) //err if database already exists
        console.log("Created database: " + dbName);
    });

    // Specify the database we are going to use (mydb)...
    mydb = cloudant.db.use(dbName);
  }
  else {
    console.log('Cloudant service is not working');
  }
  return mydb;
}

// create a function to make db profile objects
function createProfileObject (req) {
  return {
    _id : req.body._id.toLowerCase(),
    password : req.body.password
  };
}

// allow access to all the useful functions
module.exports = {
  createCloudantConnection : createCloudantConnection,
  createProfileObject : createProfileObject
};