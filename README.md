# DroneCast - WebRTC

WebRTC feature for the DroneCast platform.

## Description

WebRTC system which allows sending Real-time video from a client (desktop or mobile browser) to another.
There are two endpoints (the port could be changed with an env variable):
* http://localhost:8080/admin -> Receives the video (Should be password-protected)
* http://localhost:8080  -> Sends the video from camera

## Getting Started

### Prerequisites

Only Node.js and a browser compatible with WebRTC are needed:

* [Node.js](https://nodejs.org)
* [List of compatible browsers](http://iswebrtcreadyyet.com/legacy.html)

### Installing

```
git clone https://github.com/IX-Kitchen/DroneCast-WebRTC.git
cd DroneCast-WebRTC
npm install
node server.js
```

The console should show the following message

```
Server listening at port 8080
```
Now you can access the service at:
Admin GUI - http://localhost:8080/admin
User GUI - http://localhost:8080/

