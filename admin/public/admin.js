'use strict';


/* DOM variables */
var video = document.querySelector('video');

/*
    Logic variables
*/

var myPeerConnection;
const peerConConfig = {
    'iceServers': [{
        'urls': 'stun:stun.l.google.com:19302'
    }]
};
var hasAddTrack = false;

/*
    Signaling server
*/

// Connects to the signaling server
const socket = io('/admin');

socket.on('connect', () => {
    socket.emit('id', socket.id)
});

function debug(msg) {
    socket.send("Admin: " + msg);
}

socket.on('offer_sdp', (sdp) => {
    debug("Received SDP offer by admin");
    // Not getMedia();
    handleVideoOfferMsg(sdp);
});

socket.on('ice_candidate', (candidate) => {
    debug("ICE candidate received by drone");
    handleNewICECandidateMsg(candidate);
});

// Temporal sequence

/*Answer SDP*/

// Call createPeerConnection and sent back the SDP
function handleVideoOfferMsg(sdp) {

    createPeerConnection();

    // We need to set the remote description to the received SDP offer
    // so that our local WebRTC layer knows how to talk to the caller.

    var desc = new RTCSessionDescription(sdp);

    myPeerConnection.setRemoteDescription(desc).then(function () {
        //getMedia()
    }).then(function () {
        debug("Creating SDP answer");
        // Now that we've successfully set the remote description, we need to
        // start our stream up locally then create an SDP answer. This SDP
        // data describes the local end of our call, including the codec
        // information, options agreed upon, and so forth.
        return myPeerConnection.createAnswer();
    })
        .then(function (answer) {
            debug("Setting local description after creating answer");
            // We now have our answer, so establish that as the local description.
            // This actually configures our end of the call to match the settings
            // specified in the SDP.
            return myPeerConnection.setLocalDescription(answer);
        })
        .then(function () {
            socket.emit('answer_sdp', myPeerConnection.localDescription);


            // We've configured our end of the call now. Time to send our
            // answer back to the caller so they know that we want to talk
            // and how to talk to us.

            debug("Sending answer packet back to other peer");
        })
        // TODO. Handle errors
        .catch(reportError);
}
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
        //myPeerConnection.onnegotiationneeded = handleNegotiationNeededEvent;

        // Mozilla (Spec) - addTrack, Chrome still uses addStream
        hasAddTrack = (myPeerConnection.addTrack !== undefined);
        if (hasAddTrack) {
            // RTCPeerConnection.addTrack()
            myPeerConnection.ontrack = function (event) {
                debug("ontrack event");
                video.srcObject = event.streams[0];
            };
        } else {
            // RTCPeerConnection.addStream() by other peer
            myPeerConnection.onaddstream = function (event) {
                debug("onaddstream event");
                video.srcObject = event.stream;
            };
        }
    } else {
        alert("Peer connection alredy set");
    }
}

/*Answer ICE*/

// Send ICE
function handleICECandidateEvent(event) {
    if (event.candidate) {
        //debug("Outgoing ICE candidate: " + event.candidate.candidate);
        debug("Sending ICE candidate");
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

function closeVideoCall() {
    console.log("Video call closed");
    myPeerConnection.ontrack = null;      // For newer ones
    myPeerConnection.onremovestream = null;
    myPeerConnection.onnicecandidate = null;
    myPeerConnection.oniceconnectionstatechange = null;
    myPeerConnection.onsignalingstatechange = null;
    myPeerConnection.onicegatheringstatechange = null;
    myPeerConnection.onnotificationneeded = null;
    myPeerConnection.close();
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
    }
    video.src = null;

}
function reportError(errMessage) {
    debug("Error " + errMessage.name + ": " + errMessage.message);
}