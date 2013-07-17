//HTML & CSS File Serving
var http = require("http"),
    fs   = require('fs'),
    path = require('path');

var server = http.createServer(function(req, res) {
 
  var filePath = req.url;

  if(filePath == "/")
    filePath = "./index.html";
  else
    filePath = "."+filePath;
    
  var ext = path.extname(filePath);
  var extTypes = {
    '.html' : 'text/html',
    '.js'   : 'text/javascript',
    '.css'  : 'text/css'
  };
  var mimeType = extTypes[ext] || 'text/plain';
  
  fs.exists(filePath, function(exists){
    if(exists){
      fs.readFile(filePath, function(error, content){
        if(error){
          res.writeHead(500);
          res.end();
        }
        else{
          res.writeHead(200, {'Content-Type': mimeType});
          res.end(content, 'utf-8');
        }
      });
    }
    else{
      res.writeHead(404);
      res.end();
    }
  });
}).listen(80);


//Socket.io Event Handling & Game Logic
var io = require('socket.io').listen(server),
    users = {},
    operators = ["+", "-", "x", "/"],
    currentQuestion = {},
    gameStarted = false, 
    questionCount = 1,
    POINTS_TO_WIN = 10;

//All socket.io 'on' event handling
io.sockets.on('connection', function(socket){
  
  socket.on('addUser', function(username){
    if(username == "")
      socket.emit('addUserError', "empty");
    else if(users[username] != null)
      socket.emit('addUserError', "taken"); 
    else{
      users[username] = {"name":username,"points":0};
      socket.username = username;
      updatePlayers();
    } 
  });
  
  //Socket Disconnect
  socket.on('disconnect', function(){
    delete users[socket.username];
    var myData = new Array();
    updatePlayers();
  });
  
  //New Game Request
  socket.on('newGame', function(){
    if(socket.username){
      setTimeout(function(){
        gameStarted = true;
        questionCount = 1;
    
        for(var user in users)
          users[user].points = 0;
	    
        currentQuestion = generateQuestion();
        var myData = new Array();
        myData[0] = currentQuestion;
        myData[1] = questionCount;
        io.sockets.emit('newQuestion', myData);
        updatePlayers();
      }, 50);
    }
    else{
      socket.emit('authError', 'Must choose a user name');
    }
  });
  
  //Get Current Question Request
  socket.on('getCurrentQuestion', function(){
    if(gameStarted){
      var myData = new Array();
      myData[0] = currentQuestion;
      myData[1] = questionCount;
      socket.emit('newQuestion', myData);
    }
  });
  
  //Socket has submited an answer
  socket.on('submitAnswer', function(data){  
    if(socket.username){
      if(gameStarted){
        if(data === "")
          socket.emit('submitError', "Please enter an answer.");
        else if(getType(data) == "float")
          socket.emit('submitError', "Please round your answer to the nearest integer.");
        else if(getType(data) == "string")
          socket.emit('submitError', "Please enter a valid integer.");
        else{
          var answer;
          if(currentQuestion["operator"] == "+")
            answer = currentQuestion["arg1"] + currentQuestion["arg2"];
          else if(currentQuestion["operator"] == "-")
            answer = currentQuestion["arg1"] - currentQuestion["arg2"];
          else if(currentQuestion["operator"] == "x")
            answer = currentQuestion["arg1"] * currentQuestion["arg2"];
          else if(currentQuestion["operator"] == "/")
            answer = Math.round(currentQuestion["arg1"] / currentQuestion["arg2"]);
          if(data == answer){
            users[socket.username].points++;
            questionCount++;
            if(users[socket.username].points == POINTS_TO_WIN){
              var winner = {
                key: null,
                val: null
              };
   	    for(var user in users){
              var thisPoints = users[user].points;
    	      if(thisPoints > winner.val){
    	        winner.val = thisPoints;
    	        winner.key = user;
    	      }
    	    }
    	    gameStarted = false;
            io.sockets.emit('gameOver', winner);
            updatePlayers();
          }
          else{
            io.sockets.emit('answered', socket.username);
            updatePlayers();
            currentQuestion = generateQuestion();
          }
        }
        else
          socket.emit('submitError', "Answer is incorrect, please try again.");
        }      
      }
    }
    else{
      socket.emit('authError', "Can't submit answer without username");
    }
  });
});

//Aux Game & Utility Functions

function updatePlayers(){
  
  var sortedArray = [];
  for (user in users){
    sortedArray.push({name:users[user].name, points:users[user].points});
  }
  sortedArray.sort(function(x,y){
    return (x.points - y.points)*-1;
  });
  var myData = new Array();
  myData[0] = sortedArray;
  myData[1] = gameStarted;
  io.sockets.emit('updatePlayers', myData);
}

function generateQuestion(){
  var max = 9;
  var min = 0;
  var question = {};

  question["arg1"] = Math.floor(Math.random() * (max - min) + min);
  question["arg2"] = Math.floor(Math.random() * (max - min) + min);
  question["operator"] = operators[Math.floor(Math.random() * operators.length)];
  
  if((question["arg2"] == 0)&&(question["operator"] == "/"))
    question["arg2"] = 1;
  
  return question;
}

function getType(data){
  if(isNaN(data))
    return "string";
  else if((data%1) != 0)
    return "float";
}
