// external modules
const express = require("express");
const app = express();
const cfenv = require("cfenv");
const bodyParser = require('body-parser');
const async = require('async');

// internal modules
const WCS = require('./components/Conversation');
const DB = require('./components/CloudantDB');
const LANG =  require('./components/Translator');

// load local VCAP configuration and service credentials
var vcapLocal;
try {
  vcapLocal = require('./vcap-local.json');
  console.log('Loaded local VCAP');
}
catch(e){
  console.log('no local VCAP found');
}

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// parse application/json
app.use(bodyParser.json());
app.set('view engine', 'jade');


// constants
const appEnvOpts = vcapLocal ? { vcap: vcapLocal} : {};
const appEnv = cfenv.getAppEnv(appEnvOpts);
const workspaceId = '5e373bc7-20d2-444e-90e7-3ebf8e4e8460';
const templates = `${__dirname}/public/views/`;


// using the imported internal modules!
var conversation = WCS.createConversationInstance(workspaceId, appEnv);
var cloudantDb = DB.createCloudantConnection(appEnv, "mydb");
var userDataDb = DB.createCloudantConnection(appEnv, "data");
var translator = LANG.createTranslationService(appEnv);

// main message POST function
// takes input from user and sends it to Watson
// wraps up response and sends it back
app.post('/api/message', function (req, res) {
  var lang = getLang(req.body.lang) || 'en';
  var email = req.body.email;

  // organize payload object for Watson
  var payload = {
    workspace_id: workspaceId,
    context: req.body.context || {},
    input: req.body.input
  };

  if(payload.input){
    if (lang !== 'en') {
      var textArr = [{text: payload.input.text, source :lang, target : 'en'}];
      async.map(textArr,
        applyTranslationObject,
        function (err, results) {
          payload.input.text = results[0];
          conversation.message(payload, function (err, resp) {
            if (err) {
              res.send(res.status(err.code || 500).json(err));
            }
            // return data from Watson
            if (resp.output) {
              async.map([resp.output.text[0]],
                applyTranslation.bind({target: lang}),
                function (err, results) {
                  if(err){
                    console.log(err);
                  }
                  resp.output.text = results;
                  return res.json(resp);
                });
            }
          });
        });
    }
    else {
      conversation.message(payload, function (err, resp) {
        if (err) {
          res.send(res.status(err.code || 500).json(err));
        }
        // return data from Watson
        // TODO update to work with waterfall but ok for now
        updateUserContext(email, resp);
        return res.json(updateMessage(resp));
      });
    }
  }
  else {
    if (lang !== 'en') {
      conversation.message(payload, function (err, resp) {
        if (err) {
          res.send(res.status(err.code || 500).json(err));
        }
        // return data from Watson
        if (resp.output) {
          async.map(resp.output.text,
            applyTranslation.bind({target: lang}),
            function (err, results) {
              if(err){
                console.log(err);
              }
              //console.log(results);
              resp.output.text = results;
              return res.json(resp);
            });
        }
      });
    }
    else {
      async.waterfall([
          function (callback) {
            console.log(this.email);
            userDataDb.get(this.email, function (err, data) {
              if (!err) {
                callback(err, data);
              }
              else {
                callback(null, null);
              }
            });
          }.bind({email : email}),
        function (results, callback) {
        console.log(results);
        if (!results || Object.keys(results.context).length === 0) {
          this.payload.context = req.body.context;
          this.payload.input = {};
        }
        else {
          this.payload.context = results.context || '';
          this.payload.context.system.dialog_stack[0] = results.prevNode;
          this.payload.input = results.input || {};
        }
        conversation.message(this.payload, function (err, resp) {
          if (err) {
            res.send(res.status(err.code || 500).json(err));
          }
          // return data from Watson
          // TODO update to be within waterfall but ok for now
          updateUserContext(email, resp);
          callback(null, resp);
        });
      }.bind({payload : payload})],
        function (err, results) {
          if (err) {
            console.log(err);
          }
          return res.json(updateMessage(results));
        });
    }
  }
});


// basically updates the response payload to make things easier when passing data back and forth
function updateMessage(response) {
  var responseText = null;
  if (!response.output) {
	response.output = {};
  } else {
    return response;
	}
  if (response.intents && response.intents[0]) {
	var intent = response.intents[0];
	// Depending on the confidence of the response the app can return different messages.
	// The confidence will vary depending on how well the system is trained. The service will always try to assign
	// a class/intent to the input. If the confidence is low, then it suggests the service is unsure of the
	// user's intent . In these cases it is usually best to return a disambiguation message
	// ('I did not understand your intent, please rephrase your question', etc..)
	if (intent.confidence >= 0.75) {
	  responseText = 'I understood your intent was ' + intent.intent;
	} else if (intent.confidence >= 0.5) {
	  responseText = 'I think your intent was ' + intent.intent;
	} else {
	  responseText = 'I did not understand your int' +
      'ent';
	  }
  }
  response.output.text = responseText;

  return response;
}


// POST function to place user in db
app.post("/profile/create", function (request, response) {
  // creates an profile object for our NOSQL db
  // keys and values brahh
  var user = DB.createProfileObject(request);
  if(!cloudantDb) {
    console.log("No database.");
    response.send("No database.");
    return;
  }

  // insert the username as a document
  var key = request.body._id;
  cloudantDb.get(key, function(err, data) {
    if (!err) {
      console.log("This user already exists!");
      var pw = request.body.password;
      if (data['password'] !== pw) {
        response.render(templates+"login", {"incorrect_pw": true, "wrong_user": false});
      } else {
        response.render(templates + "login", {"incorrect_pw": false, "wrong_user": false});
      }
    } else {
      cloudantDb.insert(user, function(err) {
        if (err) {
          response.send('[cloudantDb.insert] ', err.message);
          return;
        }
        response.redirect("/chat");
      });
    }
  });
});


// GET redirect method
app.get("/chat", function (req, res) {
  res.sendFile(__dirname+"/public/chat.html");
});


// UPDATE function to update user metadata
app.post('/profile/update', function (request, response) {
  var user = DB.createProfileObject(request);
  var id = request.body._id;
  cloudantDb.get(id, function (err, data) {
    if (!err) {
      user._rev = data._rev;
      user.password = data.password;
      cloudantDb.insert(user, function (err) {
        if (err) {
          response.send('[cloudantDb.insert] ', err.message);
        }
        else {
          response.send('Updated user');
        }
      });
    }
  });
});


// POST login user
app.post('/profile/getUser', function (request, response) {
  var key = request.body._id;
  var pw = request.body.password;
  cloudantDb.get(key, function (err, data) {
    if (err) {
      response.render(templates+"login", {"incorrect_pw": true, "wrong_user": true})
    } else {
      if (data['password'] !== pw) {
        response.render(templates + "login", {"incorrect_pw": true, "wrong_user": false})
      } else {
        response.redirect("/chat");
      }
    }
  });
});

app.get("/",function(req,res){
  res.render(templates+"landing",{"languages":["English", "Español","عربى","Português","Français", "Italiano"]});
});

function getLang (lang) {
  if (lang === "English") {
    return 'en';
  }
  else if (lang === "Español") {
    return 'es';
  }
  else if (lang === "عربى") {
    return 'ar';
  }
  else if (lang === "Português") {
    return 'pt';
  }
  else if (lang === "Français") {
    return 'fr';
  }
  else if (lang === "Italiano") {
    return 'it';
  }
  return null;
}

// TODO can moodify to have the ability to use as a waterfall function
function updateUserContext (email, resp) {
  //console.log('*******************');
  //console.log(resp);
  //console.log('*******************');

  var userData = {
    _id : email,
    input : resp.input,
    output : resp.output,
    context : resp.context
  };
  userDataDb.get(email, function (err, data) {
    if (!err) {
      console.log(data);
      for (var i = 0 ; i < data.output.nodes_visited.length; i++) {
        if (resp.context.system._node_output_map[data.output.nodes_visited[i]]) {
          console.log('setting up');
         userData.prevNode = data.output.nodes_visited[i];
      if (data.output.nodes_visited){
        for (var i = 0 ; i < data.output.nodes_visited.length; i++) {
          if (resp.context.system._node_output_map[data.output.nodes_visited[i]]) {
            console.log('setting up');
            userData.prevNode = data.output.nodes_visited[i];
          }
        }
      }
      userData._rev = data._rev;
      userDataDb.insert(userData, function (err) {
        if (err) {
          return err.message;
        }
        else {
          console.log('updated data');
         return 'success';
        }

      });
    }
    else {
      userDataDb.insert(userData, function (err) {
        if (err) {
          return err.message;
        }
        else {
          console.log('added new entry');
          return 'success';
        }
      });
    }
  });
}

// endpoint to give profile data
// will be used to show user progress
app.post("/profile/data", function (request, response) {
  var userData = {
    _id : request.body.email,
    input : {},
    output : {},
    context : {}
  };

  console.log(request);
  userDataDb.get(request.body.email, function (err, data) {
    if (err) {
      /*userData._rev = data._rev;
      userDataDb.insert(userData, function (err) {
        if (err) {
          return err.message;
        }
        else {
          console.log('updated data');
          response.send(data.context);
        }
      });*/
      console.log('what is wrong');
      response.send({nothing : 'ok'});
    }
    else {
      console.log('we should be ok');
      console.log(data.context);
      response.send(data.context);
    }
  })
});

app.post("/profile/data/deleteContext", function (request, response) {

  console.log(request);
  var userData = {
    _id : request.body.email,
    input : {},
    output : {},
    context : {}
  };
  userDataDb.get(request.body.email, function (err, data) {
    if (err) {
      response.sendStatus(404).json(err);
    }
    else {
      userData._rev = data._rev;
      userDataDb.insert(userData, function (err, resp) {
        if (err) {
          //console.log('fail');
          response.send({fail : 'ok'});
        }
        else {
          //console.log('succes');
          response.send({success : 'ok'});
        }
      });
    }
  });
});

// can use this method as a waterfall function
function getUserContextData (email, callback) {
  userDataDb.get(email, function (err, data) {
    if (!err) {
      callback(err, data.context);
    }
    else {
      callback(err);
    }
  });
}

// takes in text only to translate
function applyTranslation (text, callback) {
  translator.translate({text: text, source : 'en', target: this.target },
    function (err, translation) {
    callback(err, translation.translations[0].translation);
    });
}

// takes in entire text object
function applyTranslationObject (textObj, callback) {
  translator.translate(textObj,
    function (err, translation) {
      callback(err, translation.translations[0].translation);
    });
}

// batch translates
app.post("/set-language",function(req,res){
  var textObject = {
    // need to replace with actual text array
    textArr: req.body["text[]"] || ['a sentence would go here', 'sometimes i eat pie', 'i love to laugh'],
    source: 'en',
    target: getLang(req.query.lang) || 'es'
  };

  if (textObject.target === 'en') {
    res.send({translatedText : textObject.textArr});
  }
  else {
    async.map(textObject.textArr,
      applyTranslation.bind({target : textObject.target}),
      function (err, results) {
        res.send({translatedText : results});
      });
  }
});

//serve static file (index.html, images, css)
app.use(express.static(__dirname + '/public'));

var port = process.env.PORT || 3000;
app.listen(port, function() {
	console.log('app started at localhost:3000');
  });
