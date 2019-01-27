var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

let users = {};
let channels = {};

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
  let _channel = null;
  let _username = null;

  socket.on('add_name', function({ username, name }) {
    channels[_channel].users[_username].addName(name);

    console.log(`${username} submitted name ${name}`);
  });

  socket.on('add_flavor', function({ username, flavor }) {
    channels[_channel].users[_username].addFlavor(flavor);

    console.log(`${username} submitted flavor ${flavor}`);
  });

  socket.on('join', function({ username, channel }) {
    console.log(`got a join for ${channel} by ${username}`);

    if (channels[channel] === undefined) {
      channels[channel] = new Channel();
    }

    _channel = channel;
    _username = username;
    channels[channel].addUser(username);
  });
});

http.listen(port, function(){
  console.log('listening on *:' + port);
});

class Channel {
  constructor() {
    this.users = {};
  }

  addUser(username) {
    users[username] = new User(username);
  }
}

class User {
  constructor(username) {
    this.username = username;

    this.score = 0;
    this.nameSubmissions = [];
    this.flavorSubmissions = [];
  }

  addName(name) {
    this.nameSubmissions.push(name);
  }

  addFlavor(flavor) {
    this.flavorSubmissions.push(flavor);
  }
}
