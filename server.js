// Const = will not be reassigned
const express = require('express');
const app = express();
const path = require('path');
// Reuse express server
const server = require('http').Server(app);
const io = require('socket.io')(server);
// Port
const port = process.env.PORT || 8080;

// Logic variables
var admin_id;
var user_id;

// Serve static files
app.use(express.static(__dirname + '/user/public'));
app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, '/user/public', 'user.html'));
});

app.use('/admin',express.static(__dirname + '/admin/public'));
//TO-DO Password needed
app.get('/admin', function (req, res) {

  res.sendFile(path.join(__dirname, '/admin/public', 'admin.html'));

});

// Socket.io Namespaces
const admin = io.of('/admin'),
  user = io.of('');

// Admin Namespace
admin.on('connection', (socket) => {
  debug("Admin connected");

  socket.on('id', (id) => {
    admin_id = id;
  });

  socket.on('message', (msg) => {
    console.log(msg);
  });

  socket.on('answer_sdp', (sdp) => {
    debug("SDP answer on server, sending to user");
    user.emit('answer_sdp', sdp);
  });

  socket.on('ice_candidate', (candidate) => {
    debug("ICE candidate on server, sending to user");
    user.emit('ice_candidate', candidate);
  });
});

// User Namespace
user.on('connection', function (socket) {
  debug("User connected");

  socket.on('id', (id) => {
    user_id = id;
  });

  socket.on('offer_sdp', (sdp) => {
    debug("Sdp received by server, sending to Drone");
    admin.emit('offer_sdp', sdp);
  });

  socket.on('message', (msg) => {
    console.log(msg);
  });

  socket.on('ice_candidate', (candidate) => {
    debug("ICE candidate on server, sending to drone");
    admin.emit('ice_candidate', candidate);
  });

  user.emit('start', "User connected - Start");
});

function debug(message) {
  console.log("Server: ", message);
}

// Start server
server.listen(port, function () {
  console.log('Server listening at port %d', port);
});
