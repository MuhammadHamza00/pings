const peer = new Peer({
    config: {
        iceServers: [
            { urls: 'stun:stun.relay.metered.ca:80' },
            { urls: 'turn:global.relay.metered.ca:80', username: 'b756e1b3a93c4f0d6b3182ad', credential: '/0ObJ709+DWBNIzS' },
            { urls: 'turn:global.relay.metered.ca:80?transport=tcp', username: 'b756e1b3a93c4f0d6b3182ad', credential: '/0ObJ709+DWBNIzS' },
            { urls: 'turn:global.relay.metered.ca:443', username: 'b756e1b3a93c4f0d6b3182ad', credential: '/0ObJ709+DWBNIzS' },
            { urls: 'turns:global.relay.metered.ca:443?transport=tcp', username: 'b756e1b3a93c4f0d6b3182ad', credential: '/0ObJ709+DWBNIzS' }
        ]
    }
});

let localStream;
let currentCall = null;

peer.on('open', id => {
    console.log('My peer ID is: ' + id);
    // document.getElementById('displayPeerId').innerText = id;

    // Send the peer ID to the server to update the user's peer ID
    fetch('/update_peer_id', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ peerId: id }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.status !== 'success') {
            console.error('Failed to update peer ID on server:', data.message);
        }
    })
    .catch(err => {
        console.error('Error updating peer ID:', err);
    });
});


const getPeerEmail = () => document.getElementById('peerEmail').value;

const handleIncomingStream = (stream, type) => {
    if (type === 'video' || type === 'screen') {
        document.getElementById('remoteVideo').srcObject = stream;
    } else if (type === 'audio') {
        document.getElementById('remoteAudio').srcObject = stream;
    }
};

const startStream = async (streamType) => {
    try {
        let stream;
        if (streamType === 'video') {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            document.getElementById('localVideo').srcObject = stream;
        } else if (streamType === 'screen') {
            stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            document.getElementById('localVideo').srcObject = stream;
        } else if (streamType === 'audio') {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            document.getElementById('localAudio').srcObject = stream;
        }

        const peerEmail = getPeerEmail();
        if (peerEmail) {
            document.getElementById("receiver-id").innerText = peerEmail;
            const response = await fetch('/get_peer_id', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: peerEmail }),
            });
            const data = await response.json();
            if (data.peerId) {
                const call = peer.call(data.peerId, stream);
                currentCall = call;
                call.on('stream', remoteStream => handleIncomingStream(remoteStream, streamType));

                call.on('close', () => {
                    console.log('Call closed');
                    document.getElementById('remoteVideo').srcObject = null;
                    document.getElementById('remoteAudio').srcObject = null;
                });

                call.on('error', err => {
                    console.error('Call error:', err);
                });
            } else {
                console.error('No peer ID found for the provided email');
            }
        }
    } catch (error) {
        console.error('Error starting stream:', error);
    }
};

const disconnectCall = () => {
    if (currentCall) {
        currentCall.close();
        currentCall = null;
        document.getElementById('remoteVideo').srcObject = null;
        document.getElementById('remoteAudio').srcObject = null;
        document.getElementById('localVideo').srcObject = null;
        document.getElementById('localAudio').srcObject = null;
        console.log('Call disconnected');
    }
};

document.getElementById('startVideo').addEventListener('click', () => startStream('video'));
document.getElementById('startScreen').addEventListener('click', () => startStream('screen'));
document.getElementById('startAudio').addEventListener('click', () => startStream('audio'));
document.getElementById('disconnectCall').addEventListener('click', disconnectCall);
document.getElementById('startVideo').addEventListener('click', () => {
    document.getElementById('localPlaceholder').style.display = 'none';
    document.getElementById('localVideo').style.display = 'block';
});

document.getElementById('startScreen').addEventListener('click', () => {
    document.getElementById('localPlaceholder').style.display = 'none';
    document.getElementById('localVideo').style.display = 'block';
});

document.getElementById('disconnectCall').addEventListener('click', () => {
    document.getElementById('localPlaceholder').style.display = 'block';
    document.getElementById('localVideo').style.display = 'none';
    document.getElementById('remotePlaceholder').style.display = 'block';
    document.getElementById('remoteVideo').style.display = 'none';
});

peer.on('call', call => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
        call.answer(stream); // Answer the call with an A/V stream.
        currentCall = call;
        call.on('stream', remoteStream => handleIncomingStream(remoteStream, 'video'));

        call.on('close', () => {
            console.log('Call closed');
            document.getElementById('remoteVideo').srcObject = null;
            document.getElementById('remoteAudio').srcObject = null;
        });

        call.on('error', err => {
            console.error('Call error:', err);
        });
    }).catch(err => {
        console.error('Failed to get local stream', err);
    });
});

peer.on('error', err => {
    console.error('Peer error:', err);
});
