'use strict';


/* DOM variables */
var video = document.querySelector('video');

/* Logic variables */

var myPeerConnection;
const peerConConfig = {
    'iceServers': [{
        'urls': 'stun:stun.l.google.com:19302'
    }]
};
const mediaConstraints = {
    audio: false,            // We want an audio track
    video: true             // ...and we want a video track
};
var hasAddTrack = false;

/*
    Signaling server
*/

// Connect to the signaling server
const socket = io();

socket.on('connect', () => {
    socket.emit('id', socket.id);
});

function debug(msg) {
    socket.send("Client: " + msg);
}

socket.on('answer_sdp', (sdp) => {
    handleVideoAnswerMsg(sdp);
    debug("Received answer SDP");
});

socket.on('start', (message) => {
    console.log("Start");
    debug(message);
    createPeerConnection();
    getMedia();
});

socket.on('ice_candidate', (candidate) => {
    debug("ICE candidate received by user");
    handleNewICECandidateMsg(candidate);
});

// Temporal sequence

/*Offer SDP*/
function createPeerConnection() {
    debug("Creating RTCPeerConnection");
    if (typeof myPeerConnection === "undefined") {
        myPeerConnection = new RTCPeerConnection(peerConConfig);

        // When an ICE candidate is sent, not received
        myPeerConnection.onicecandidate = handleICECandidateEvent;
        // RTCPeerConnection.removeStream() is called by other peer
        myPeerConnection.onnremovestream = function () { closeVideoCall(); };
        // myPeerConnection.oniceconnectionstatechange = handleICEConnectionStateChangeEvent;
        // myPeerConnection.onicegatheringstatechange = handleICEGatheringStateChangeEvent;
        // myPeerConnection.onsignalingstatechange = handleSignalingStateChangeEvent;

        // Create SDP offer and send it
        myPeerConnection.onnegotiationneeded = handleNegotiationNeededEvent;

        // Mozilla (Spec) - addTrack, Chrome still uses addStream
        hasAddTrack = (myPeerConnection.addTrack !== undefined);
        // if (hasAddTrack) {
        //     // RTCPeerConnection.addTrack()
        //     myPeerConnection.ontrack = handleTrackEvent;
        // } else {
        //     // RTCPeerConnection.addStream()
        //     myPeerConnection.onaddstream = handleAddStreamEvent;
        // }
    } else {
        alert("Peer connection alredy set");
    }
}

function handleNegotiationNeededEvent() {
    // Called by the WebRTC layer to let us know when it's time to
    // begin (or restart) ICE negotiation. Starts by creating a WebRTC
    // offer, then sets it as the description of our local media
    // (which configures our local media stream), then sends the
    // description to the callee as an offer. This is a proposed media
    // format, codec, resolution, etc.s
    debug("onnegotiationneeded event");
    myPeerConnection.createOffer().then(function (offer) {
        return myPeerConnection.setLocalDescription(offer);
    })
        .then(function () {
            socket.emit("offer_sdp", myPeerConnection.localDescription);
        })
        .catch(reportError);
}

function handleVideoAnswerMsg(sdp) {
    var desc = new RTCSessionDescription(sdp);
    myPeerConnection.setRemoteDescription(desc).catch(reportError);
}

/*ICE*/

// Send ICE
function handleICECandidateEvent(event) {
    if (event.candidate) {
        debug("Outgoing ICE candidate: " + event.candidate.candidate);
        socket.emit('ice_candidate', event.candidate);
    }
}

// Receive ICE
function handleNewICECandidateMsg(candidate) {
    var candidate = new RTCIceCandidate(candidate);

    //debug("Adding received ICE candidate: " + JSON.stringify(candidate));
    myPeerConnection.addIceCandidate(candidate)
        .catch(reportError);
}

function reportError(errMessage) {
    debug("Error " + errMessage.name + ": " + errMessage.message);
}
// Get Media and call gotStream()
function getMedia() {
    console.log('Getting user media (video) ...');
    navigator.mediaDevices.getUserMedia(mediaConstraints)
        .then(gotStream)
        .catch(handleGetUserMediaError);
}
// Add stream/track to local video and RTCPeerConnection
function gotStream(stream) {
    window.stream = stream; // Available to console
    video.srcObject = stream; // Want to see ourselves?
    if (hasAddTrack) {
        stream.getTracks().forEach(track => myPeerConnection.addTrack(track, stream));
    } else {
        myPeerConnection.addStream(localStream);
    }
}

function handleGetUserMediaError(e) {
    switch (e.name) {
        case "NotFoundError":
            alert("Unable to open your call because no camera and/or microphone" +
                "were found.");
            break;
        case "SecurityError":
            break;
        case "PermissionDeniedError":
            // Do nothing; this is the same as the user canceling the call.
            break;
        default:
            alert("Error opening your camera and/or microphone: " + e.message);
            break;
    }

    closeVideoCall();
}

function closeVideoCall() {
    debug("Video call closed");
    myPeerConnection.ontrack = null;
    myPeerConnection.onremovestream = null;
    myPeerConnection.onnicecandidate = null;
    myPeerConnection.oniceconnectionstatechange = null;
    myPeerConnection.onsignalingstatechange = null;
    myPeerConnection.onicegatheringstatechange = null;
    myPeerConnection.onnotificationneeded = null;

    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
    }
    video.src = null;
    myPeerConnection.close();
    myPeerConnection = null;
}
