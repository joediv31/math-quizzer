Math Quizzer  [![Nodejitsu Deploy Status Badges](https://webhooks.nodejitsu.com/joediv31/math-quizzer.png)](https://webops.nodejitsu.com#joediv31/webhooks) 
====

This repo contains the files for a real-time mental math quizzer built with [Node](http://nodejs.org/), [Socket.io](http://socket.io/), & [Bootstrap](http://twitter.github.io/bootstrap/).

A live version of the app was deployed with [Nodejitsu](https://www.nodejitsu.com/) and can be found here: [mathquizzer.nodejitsu.com](http://mathquizzer.nodejitsu.com)

Dependencies
----

To run this app in a local test environment you must have a working version of Nodejs and Socket.io installed.

You can start an local instance of the node server on the command line with: 

```bash
[sudo] node server.js
```

The app will then be found at 127.0.0.1:80

(make sure to change "var socket = io.connect('http://localhost:80')" on line 17 in index.html to connect to your local instance rather than the live version) 

Testing
----

Unit tests are located in the test.js file and are run using the Node module [Mocha](http://visionmedia.github.io/mocha/) and also require the socket.io-client module (to test client connections).

To install these type (using the npm):

```bash
[sudo] npm install socket.io-client -g
[sudo] npm install mocha -g 
``` 

Once Mocha, Node, Socket, & Socket-client are installed locally, start an instance of the server.js and run the tests in test.js on the command line by typing:

```bash
mocha test.js
```

There are a total of 7 tests and 28 assertions.
