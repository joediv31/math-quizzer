var assert = require("assert");
var io = require("socket.io-client");

var socketURL = 'http://127.0.0.1:80';

var options = {
  transports: ['websocket'],
  'force new connection': true
};

var username1 = "Joe",
    username2 = "Frank",
    username3 = "",
    username4 = "Joe",
    username5 = "Steve";

describe("Math game server", function(){
  
  it('should increment the number of users by 1, add each name/point combo to the users array, and initialize the number of points to 0 for each valid user sign up', function(done){
    
    var client1 = io.connect(socketURL, options);
    
    client1.on('connect', function(data){
      //add valid user
      client1.emit('addUser', username1);
      
      var client2 = io.connect(socketURL, options);
      
      client2.on('connect', function(data2){
        //add valid user2
        client2.emit('addUser', username2); 
        client2.disconnect();
      });
    });
    
    var numAttempts = 0;
    client1.on('updatePlayers', function(data){
      numAttempts++;
      if(numAttempts == 2){
        //after adding 2 valid users the # of users should equal 2
        assert.equal(2, data[0].length);
        //each user should have been added to the user array
        //user1 name added 
        assert.equal(username1, data[0][0].name);
        //user2 name added
        assert.equal(username2, data[0][1].name);
        //user1 points initialized
        assert.equal(0, data[0][0].points);
        //user2 points initialized
        assert.equal(0, data[0][1].points);
        
        client1.disconnect();
        done();
      } 
    });
  });
  
  it('should not increment number of users by 1 for blank sign ups', function(done){
    
    var client1 = io.connect(socketURL, options);
    
    client1.on('connect', function(data){
      client1.emit('addUser', username1);
      
      var client2 = io.connect(socketURL, options);
      
      client2.on('connect', function(data2){
        //attempt to add blank user
        client2.emit('addUser', username3); 
        client2.disconnect();
      });
    });
    
    var numAttempts = 0;
    client1.on('updatePlayers', function(data){
      numAttempts++;
      if(numAttempts == 2){
        //after attempting to add the 2nd user (whose username is null), # of users should still equal 1
        assert.equal(1, data[0].length);
        client1.disconnect();
        done();
      } 
    });
  });
  
  it('should not increment number of users by 1 for repeat user names', function(done){
    var client1 = io.connect(socketURL, options);
    
    client1.on('connect', function(data){
      client1.emit('addUser', username1);
      
      var client2 = io.connect(socketURL, options);
      
      client2.on('connect', function(data2){
        //attempt to add user with same username as user1
        client2.emit('addUser', username4); 
        client2.disconnect();
      });
    });
    
    var numAttempts = 0;
    client1.on('updatePlayers', function(data){
      numAttempts++;
      if(numAttempts == 2){
        //after attempting to add the 2nd user (whose username is already taken), # of users should still equal 1
        assert.equal(1, data[0].length);
        client1.disconnect();
        done();
      } 
    });
  });
  
  it('"+ - x and /" operators should work on arg1 and arg2, should correspond with incrementing points for correct answers, and points should reset to zero at start of new game', function(done){
  
    var client1 = io.connect(socketURL, options);
    
    client1.on('connect', function(data){
      client1.emit('addUser', username1);
    });
    
    var numAttempts = 0;
    
    client1.on('newQuestion', function(data){
      var arg1 = data[0]['arg1'];
      var operator = data[0]['operator'];
      var arg2 = data[0]['arg2'];
      
      var answer;
      
      if(operator === "+")
        answer = arg1 + arg2;
      else if(operator === "x")
        answer = arg1 * arg2;
      else if(operator === "-")
        answer = arg1 - arg2;
      else if(operator === "\/")
        answer = Math.round(arg1/arg2);
      
      numAttempts++;  
      client1.emit('submitAnswer', answer);
      
    });
    
    var numCorrect = 0;
    
    client1.on('answered', function(data){
      numCorrect++;
      
      //awarded to the username who answered correctly
      assert.equal(username1, data);
      if(numAttempts < 8)
        client1.emit('getCurrentQuestion');
      else if(numAttempts == 8){ 
        //operators work 
        assert.equal(numAttempts, numCorrect);
        client1.emit('newGame');
      }
      else if(numAttempts == 9){
        //points get reset to zero when new game starts
        assert(1, data[0][0].points);
        client1.disconnect();
        done();
      }
    });
    
    client1.on('updatePlayers', function(data){  
      if(numAttempts == 0)
        client1.emit('newGame');
      else if(numAttempts == 7){
        //points accumulate as you answer questions correctly
        assert(7, data[0][0].points);
      }
        
    });
  });
  
  it('illegal answers (decimals, blank, incorrect or not an integer) should not increment points and should display proper error message', function(done){
    var client1 = io.connect(socketURL, options);
    
    client1.on('connect', function(data){
      client1.emit('addUser', username1);
    });
    
    client1.on('updatePlayers', function(data){  
      //never increments points from illegal or incorrect submitted answers below
      assert.equal(0, data[0][0].points);
      client1.emit('newGame');
    });
    
    client1.on('newQuestion', function(data){
      var arg1 = data[0]['arg1'];
      var operator = data[0]['operator'];
      var arg2 = data[0]['arg2'];
      
      var answer;
      
      if(operator === "+")
        answer = arg1 + arg2;
      else if(operator === "x")
        answer = arg1 * arg2;
      else if(operator === "-")
        answer = arg1 - arg2;
      else if(operator === "\/")
        answer = Math.round(arg1/arg2);
        
      //purposly mess up answer
      answer++;  
      
      client1.emit('submitAnswer', answer);
    });
    
    var numAttempts = 0;
    
    client1.on('submitError', function(data){
      if(numAttempts == 0){
        //for incorrect answer
        assert.equal("Answer is incorrect, please try again.", data);
        numAttempts++;
        client1.emit('submitAnswer', '');
      }
      else if(numAttempts == 1){
        //for blank answer
        assert.equal("Please enter an answer.", data);
        numAttempts++;
        client1.emit('submitAnswer', '1.5');
      }
      else if(numAttempts == 2){
        //for answers with decimal points
        assert.equal("Please round your answer to the nearest integer.", data);
        numAttempts++;
        client1.emit('submitAnswer', 'dhs2383k');
      }
      else if(numAttempts == 3){
        //for answers that are not valid integers 
        assert.equal("Please enter a valid integer.", data);
        numAttempts++;
        client1.emit('submitAnswer', '_/43&*.q-k');
      }
      else if(numAttempts == 4){
        //for answers that are not valid integers and contain special characters
        assert.equal("Please enter a valid integer.", data);
        client1.disconnect();
        done();
      }
    });
    
    client1.on('answered', function(data){
      //should never happen (a correct answer should not occur), if does the assertion will fail on purpose
      assert.equal(0, 1);
    });
    
  });
  
  it('user array should list users in order of points descending', function(done){
    
    //create 3 valid users - give user2 2points, user3 1 point, user1 0 points, and see that they are sorted correctly.
    var numAttempts = 0;
    var client1 = io.connect(socketURL, options);
    client1.on('connect', function(data){
      client1.emit('addUser', username1);
      
      var client2 = io.connect(socketURL, options);
      client2.on('connect', function(data2){
        client2.emit('addUser', username2);
      
        var client3 = io.connect(socketURL, options);
        client3.on('connect', function(data3){
          client3.emit('addUser', username5);
        });
        
        client3.on('updatePlayers', function(users){
          if(numAttempts == 0){
            numAttempts++;
            client3.emit('newGame');
          }
          else if(numAttempts == 4){
            //user2 should be in 1st place & have 2 points
            assert.equal(2, users[0][0].points);
            assert.equal(username2, users[0][0].name);
            //user3 should be in 2nd place & have 1 point
            assert.equal(1, users[0][1].points);
            assert.equal(username5, users[0][1].name);
            //user1 should be in 3rd place & have 0 points
            assert.equal(0, users[0][2].points);
            assert.equal(username1, users[0][2].name);
            client3.disconnect();
            client2.disconnect();
            client1.disconnect();
            done();
          }
        });
        client3.on('answered', function(data3){
          numAttempts++;
          client2.emit('getCurrentQuestion');
          client3.emit('getCurrentQuestion');
        });
		    
        client3.on('newQuestion', function(data3){
          var arg1 = data3[0]['arg1'];
          var operator = data3[0]['operator'];
          var arg2 = data3[0]['arg2'];
		      
          var answer;
		      
          if(operator === "+")
            answer = arg1 + arg2;
          else if(operator === "x")
            answer = arg1 * arg2;
          else if(operator === "-")
            answer = arg1 - arg2;
          else if(operator === "\/")
            answer = Math.round(arg1/arg2);
		      
          if(numAttempts == 3)
            client3.emit('submitAnswer', answer);
        });
      });
      
      client2.on('newQuestion', function(data3){
        var arg1 = data3[0]['arg1'];
        var operator = data3[0]['operator'];
        var arg2 = data3[0]['arg2'];
	      
        var answer;
	      
        if(operator === "+")
          answer = arg1 + arg2;
        else if(operator === "x")
          answer = arg1 * arg2;
        else if(operator === "-")
          answer = arg1 - arg2;
        else if(operator === "\/")
          answer = Math.round(arg1/arg2);
	      
        if(numAttempts <3)
          client2.emit('submitAnswer', answer);        
      });
    });
  });
  
  it('should not allow the creation of new games (or resetting games), or submit answers if the socket is not "signed in" as a user', function(done){
    //create an auth client and 2 non-authed clients.  Have auth client create a new game, and answer 1 question.
    //Un authed users should try to create a new game & answer a question (both which should change the index of the question #, but if all goes well it will not.
    
    var numAttempts = 0;
    
    //create valid user client1
    var client1 = io.connect(socketURL, options);
    
    client1.on('connect', function(data){
      client1.emit('addUser', username1);
      
      //created un authed user client2
      var client2 = io.connect(socketURL, options);
      
      client2.on('answered', function(data2){
        numAttempts++;
        client2.emit('getCurrentQuestion');
      });
      
      client2.on('newQuestion', function(data2){
        if(numAttempts == 1){		  
          //index of question should now be 2
          assert.equal(2, data2[1]);
          //attempts to start a new game
          client2.emit('newGame');
        }
      });
      
      client2.on('authError', function(msg){
      
        //newGame request should now throw an error for client2
        assert.equal('Must choose a user name', msg);
        
        if(numAttempts == 1){
          numAttempts++;
 					
          //create un authed user client3 
          var client3 = io.connect(socketURL, options);
          
          client3.on('connect', function(data3){
            //attempts to submit an answer
            client3.emit('submitAnswer', 0);
          });
          
          client3.on('authError', function(msg2){

            //submitAnswer request should now throw an error for client3
            assert.equal("Can't submit answer without username", msg2);
            client3.disconnect();
            client2.disconnect();
            client1.disconnect();
            done();
          });
        }
      });
    });
    
    client1.on('updatePlayers', function(data){
      if(numAttempts == 0)
        client1.emit('newGame');
    });
    
    client1.on('newQuestion', function(data){
      
      var arg1 = data[0]['arg1'];
      var operator = data[0]['operator'];
      var arg2 = data[0]['arg2'];
      
      var answer;
      
      if(operator === "+")
        answer = arg1 + arg2;
      else if(operator === "x")
        answer = arg1 * arg2;
      else if(operator === "-")
        answer = arg1 - arg2;
      else if(operator === "\/")
        answer = Math.round(arg1/arg2);
      
      if(numAttempts == 0){
        //index of question should be 1
        assert.equal(1, data[1]);
        client1.emit('submitAnswer', answer);
      }
      else if(numAttempts == 1){
        //Will never fire since client2 is not authed to start new games (or reset them), which it tries when numAttempts = 1.
        //If it does fire, the assertion fails on purpose
        assert.equal(0,1);
      }
    });
    
    client1.on('answered', function(data){
      if(numAttempts == 2){
        //Will never fire since client3 is not authed to submit answers, which it tries when numAttempts = 2.
        //If it does fire, the assertion fails on purpose
        assert.equal(0,1);
      }
    });
  });
});
