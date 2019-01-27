var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

let users = {};

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
  socket.on('add_name', function({ username, name }) {
    console.log(`${username} submitted name ${name}`);
  });

  socket.on('add_flavor', function({ username, flavor }) {
    console.log(`${username} submitted flavor ${flavor}`);
  });

  socket.on('join', function({ username, client_id }) {
    users[username] = client_id;
  });
});

http.listen(port, function(){
  console.log('listening on *:' + port);
});

/*
  socket.on('chat message', function(msg){
    io.emit('chat message', msg);
  });
*/
