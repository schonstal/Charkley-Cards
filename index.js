var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

const users = {};
const channels = {};
const sockets = {};

function generateCode() {
  let id = "";
  let letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  for (let i = 0; i < 4; i++) {
    id += letters.charAt(Math.floor(Math.random() * letters.length));
  }

  return id;
}

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket) {
  let _channel = null;
  let _username = null;
  let _code = generateCode();

  sockets[_code] = socket;
  console.log(`code: ${_code}`);
  socket.emit('set_code', { code: _code });

  socket.on('add_name', function(name) {
    channels[_channel].addName(_username, name);

    console.log(`[${new Date()}] ${_username} submitted name ${name} to ${_channel}`);
  });

  socket.on('add_flavor', function(flavor) {
    channels[_channel].addFlavor(_username, flavor);

    console.log(`[${new Date()}] ${_username} submitted flavor ${flavor} to ${_channel}`);
  });

  socket.on('join', function({ username, channel }) {
    console.log(`[${new Date()}] ${username} joined game: ${channel}`);

    if (channels[channel] === undefined) {
      channels[channel] = new Channel(channel);
    }

    _channel = channel;
    _username = username;
    channels[channel].addUser(username, socket);

    socket.emit('change_phase', 'start-game');
  });

  socket.on('start_game', function({ channel, round_time }) {
    channels[channel].startGame(round_time);
  });

  socket.on('add_card', function({ name, flavor }) {
    channels[_channel].addCard({ name, flavor });
  });

  socket.on('register_screen', function() {
    if (channels[channel] === undefined) {
      channels[channel] = new Channel(channel);
    }

    channels[channel].registerScreen(socket);
  });

  socket.on('evaluate', function() {
    console.log('evaluated');
  });
});

http.listen(port, function() {
  console.log('listening on *:' + port);
});

const randomProperty = function(obj) {
  let keys = Object.keys(obj)
  let key = keys[keys.length * Math.random() << 0];
  let property = obj[key];

  return { key, property };
};

class Channel {
  constructor(name) {
    this.users = {};
    this.currentPhase = 'add-name';
    this.name = name;
    this.nameSubmissions = {};
    this.flavorSubmissions = {};
    this.started = false;
    this.cards = [];
  }

  addCard({ name, flavor }) {
    this.cards.push({
      name,
      flavor,
      author: this.nameSubmissions[name]
    });
  }

  registerScreen(socket) {
    this.screenSocket = socket;
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

    if (sockets[this.name] !== undefined) {
      io.to(sockets[this.name].id).emit('change_phase', { phase });
    }
  }

  startGame(gameTime = 30000) {
    if (this.started) return;
    this.started = true;

    this.switchPhase('add-name');

    setTimeout(() => {
      this.switchPhase('add-flavor');
      setTimeout(() => {
        this.switchPhase('make-cards');
        this.sendPhrases();
        setTimeout(() => {
          this.switchPhase('evaluate');
          this.startEvaluate();
        }, gameTime);
      }, gameTime);
    }, gameTime);
  }

  startEvaluate() {
    this.activeCard = this.cards.pop();
    if (sockets[this.name] !== undefined) {
      io.to(sockets[this.name].id).emit('show_card', { card: this.activeCard });
    }

    if (this.cards.length > 0) {
      setTimeout(() => this.startEvaluate(), 10000);
    }
  }

  sendPhrases() {
    let availableNames = Object.assign({}, this.nameSubmissions);
    let availableFlavors = Object.assign({}, this.flavorSubmissions);

    let names = [];
    let flavors = [];

    let entries = Object.entries(this.users);
    for (let [username, user] of entries) {
      names = [];
      flavors = [];

      for (let i = 0; i < 3; i++) {
        let name = randomProperty(availableNames);
        if (name.key !== undefined) {
          delete availableNames[name.key];
          names.push({
            username: name.property,
            name: name.key
          });
        }

        let flavor = randomProperty(availableFlavors);
        if (flavor.key !== undefined) {
          delete availableFlavors[flavor.key];
          flavors.push({
            username: flavor.property,
            flavor: flavor.key
          });
        }
      }

      user.socket.emit('phrases', { names, flavors });
    }
  }

  addName(username, name) {
    this.nameSubmissions[name] = username;
  }

  addFlavor(username, flavor) {
    this.flavorSubmissions[flavor] = username;
  }
}

class User {
  constructor(username, socket) {
    this.username = username;

    this.score = 0;
    this.socket = socket;
  }

  sendPhrases({ names, flavors }) {
    this.socket.emit('phrases', {
      names,
      flavors
    });
  }
}
