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

  socket.on('add_name', function(name) {
    channels[_channel].users[_username].addName(name);

    console.log(`[${new Date()}] ${_username} submitted name ${name} to ${_channel}`);
  });

  socket.on('add_flavor', function(flavor) {
    channels[_channel].users[_username].addFlavor(flavor);

    console.log(`[${new Date()}] ${_username} submitted flavor ${flavor} to ${_channel}`);
  });

  socket.on('join', function({ username, channel }) {
    console.log(`[${new Date()}] ${username} joined game: ${channel}`);

    if (channels[channel] === undefined) {
      channels[channel] = new Channel(channel, 10000);
    }

    _channel = channel;
    _username = username;
    channels[channel].addUser(username, socket);

    socket.emit('change_phase', channels[channel].currentPhase);
  });
});

http.listen(port, function(){
  console.log('listening on *:' + port);
});

class Channel {
  constructor(name, gameTime = 30000) {
    this.users = {};
    this.currentPhase = 'add-name';
    this.name = name;

    setTimeout(() => {
      this.switchPhase('add-flavor');
      setTimeout(() => {
        this.switchPhase('make-cards');
      }, gameTime);
    }, gameTime);
  }

  addUser(username, socket) {
    this.users[username] = new User(username, socket);
  }

  switchPhase(phase) {
    console.log(`[${new Date()}] game ${this.name} switching to phase: ${phase}`)
    this.currentPhase = phase;

    let entries = Object.entries(this.users);
    for (const [username, user] of entries) {
      user.socket.emit('change_phase', phase);
    }
  }
}

class User {
  constructor(username, socket) {
    this.username = username;

    this.score = 0;
    this.nameSubmissions = [];
    this.flavorSubmissions = [];
    this.socket = socket;
  }

  addName(name) {
    this.nameSubmissions.push(name);
  }

  addFlavor(flavor) {
    this.flavorSubmissions.push(flavor);
  }
}
