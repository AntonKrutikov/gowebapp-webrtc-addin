(async () => {

    let webrtcPopup = document.createElement('div')
    webrtcPopup.classList.add('webrtc-popup')
    dragElement(webrtcPopup);

    let webrtcCallInfo = document.createElement('div')
    webrtcCallInfo.classList.add('webrtc-calling-info')
    webrtcPopup.appendChild(webrtcCallInfo)

    let webrtcSubscriberInfo = document.createElement('div')
    webrtcSubscriberInfo.classList.add('webrtc-subscriber-info')
    webrtcCallInfo.appendChild(webrtcSubscriberInfo)

    /* bottom buttons section */
    let webrtcCallButtons = document.createElement('div')
    webrtcCallButtons.classList.add('webrtc-buttons')
    webrtcPopup.appendChild(webrtcCallButtons)

    let webrtcCancelButton = document.createElement('div')
    webrtcCancelButton.classList.add('webrtc-cancel-button')
    webrtcCancelButtonImg = document.createElement('img')
    webrtcCancelButtonImg.src = 'static/assets/end-call.png'
    webrtcCancelButton.addEventListener('click', () => {
        endCall()
    })
    webrtcCancelButton.appendChild(webrtcCancelButtonImg)
    // webrtcCallButtons.appendChild(webrtcCancelButton)

    let webrtcAcceptButton = document.createElement('div')
    webrtcAcceptButton.classList.add('webrtc-cancel-button')
    webrtcAcceptButtonImg = document.createElement('img')
    webrtcAcceptButtonImg.src = 'static/assets/accept-call.png'
    webrtcAcceptButton.addEventListener('click', () => {
        let callId = webrtcAcceptButton.dataset.callId
        let caller = webrtcAcceptButton.dataset.caller
        let offer = JSON.parse(webrtcAcceptButton.dataset.offer)

        answerCall(callId, caller, offer)
    })
    webrtcAcceptButton.appendChild(webrtcAcceptButtonImg)
    // webrtcCallButtons.appendChild(webrtcAcceptButton)

    /* caller small video section */
    let webrtcLocalStream = document.createElement('video')
    webrtcLocalStream.classList.add('webrtc-local-video')
    webrtcLocalStream.autoplay = true
    webrtcLocalStream.muted = true
    webrtcLocalStream.playsInline = true

    webrtcPopup.appendChild(webrtcLocalStream)

    let webrtcCallables = document.querySelectorAll('.webrtc-callable')
    webrtcCallables.forEach(callable => {
        callable.addEventListener('click', (e) => {
            let callto = callable.dataset.callto
            if (callto) {
                startCall(callto)
            }
        })
    })

    /* callee remote video */
    let webrtcRemoteStream = document.createElement('video')
    webrtcRemoteStream.classList.add('webrtc-remote-video')
    webrtcRemoteStream.autoplay = true
    webrtcRemoteStream.playsInline = true
    webrtcRemoteStream.muted = false


    let peerConnection = null
    let peerConfig = {}
    startListen() //always wait for incoming


    let fetchAbort = new AbortController()
    let iceFetchAbort = new AbortController()

    function createNewPeerConnection(config) {
        let peer = new RTCPeerConnection(config)

        peer.onicecandidate = (e) => {
            if (e.candidate !== null) {
                console.log(e.candidate)
                fetch("/webrtc/icecandidates", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        callid: peer.callId,
                        candidate: e.candidate.candidate,
                        sdpMid: e.candidate.sdpMid,
                        SdpMLineIndex: e.candidate.SdpMLineIndex
                    })
                })
            }
        }

        peer.onconnectionstatechange = (e) => {
            if (peer.connectionState === 'connected') {
                iceFetchAbort.abort()
                iceFetchAbort = new AbortController()
            }
        }

        peer.addEventListener('track', (e) => {
            webrtcPopup.prepend(webrtcRemoteStream)
            if (webrtcRemoteStream.srcObject) {
                return
            }
            webrtcRemoteStream.srcObject = e.streams[0]

            if(webrtcPopup.contains(webrtcCallInfo)) {
                webrtcPopup.removeChild(webrtcCallInfo)
            }
            if(webrtcCallButtons.contains(webrtcAcceptButton)) {
                webrtcCallButtons.removeChild(webrtcAcceptButton)
            }
        })

        return peer
    }

    async function startCall(callee) {
        if (!hasActiveCall()) {
            if(webrtcPopup.contains(webrtcRemoteStream)){
                webrtcPopup.removeChild(webrtcRemoteStream)
            }
            webrtcPopup.prepend(webrtcCallInfo)
            webrtcSubscriberInfo.innerText = callee
            webrtcSubscriberInfo.classList.add('animate-scale')
            webrtcCallButtons.appendChild(webrtcCancelButton)
            webrtcPopupShow()

            peerConnection = createNewPeerConnection()

            try {
            let stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
            webrtcLocalStream.srcObject = stream
            stream.getTracks().forEach(track => peerConnection.addTrack(track, stream))
            } catch (err) {
                console.log(err)
            }


            try {
                let result = await createOffer(peerConnection, callee, fetchAbort)
                if (result == 204) {
                    calleeNotOnline(callee)
                }
                if (result == 404) {
                    calleeNotRespond(callee)
                }
            } catch (err) {
                console.log(err, result)
            }
        }
    }

    function calleeNotOnline(callee) {
        webrtcSubscriberInfo.innerText = `${callee} not online`
        webrtcSubscriberInfo.classList.remove('animate-scale')
    }

    function calleeNotRespond(callee) {
        webrtcSubscriberInfo.innerText = `${callee} not respond`
        webrtcSubscriberInfo.classList.remove('animate-scale')
    }

    function hasActiveCall() {
        return document.body.contains(webrtcPopup)
    }

    function webrtcPopupShow() {
        document.body.appendChild(webrtcPopup)
    }

    function webrtcPopupRemove() {
        document.body.removeChild(webrtcPopup)
    }

    function endCall() {
        webrtcPopupRemove()
        if (webrtcCallButtons.contains(webrtcCancelButton)) {
            webrtcCallButtons.removeChild(webrtcCancelButton)
        }
        if (webrtcCallButtons.contains(webrtcAcceptButton)) {
            webrtcCallButtons.removeChild(webrtcAcceptButton)
        }
        delete webrtcAcceptButton.dataset.callId
        delete webrtcAcceptButton.dataset.caller
        delete webrtcAcceptButton.dataset.offer

        fetchAbort.abort()
        fetchAbort = new AbortController()
        let stream = webrtcLocalStream.srcObject
        if (stream) {
            stream.getTracks().forEach(track => track.stop())
        }
        webrtcRemoteStream.srcObject = null
        if (peerConnection) {
            peerConnection.close()
            peerConnection = null
        }
    }

    //Make a call. webrtc create offer
    async function createOffer(peer, callee, abort) {
        peer.callId = window.URL.createObjectURL(new Blob([])).substr(-36)

        let offer = await peer.createOffer({
            offerToReceiveAudio: 1,
            offerToReceiveVideo: 1
        })
        peer.setLocalDescription(offer)

        try {
            let response = await fetch('/webrtc/offer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ callee: callee, offer: offer, id: peer.callId }),
                signal: abort.signal
            })
            if (response.status == 204) {
                return 204
            }
            if (response.status == 404) {
                return 404 //408 code strange behaviour whith fetch
            }
            if (response.status == 200) {
                let answer = await response.json()
                if (answer) {
                    console.log(answer)
                    await peerConnection.setRemoteDescription(answer)
                    listenIceCanditates(peer, callee)
                    return 200
                }
            }
        } catch (err) {
            console.log(err)
        }
    }

    //Always waiting for new calls with long polling
    let incoming = []
    async function startListen() {
        let response = await fetch(`/webrtc/listennig`)
        let call = await response.json()
        if (call) {
            let indx = incoming.findIndex(c => c.id == call.id)
            if (call.type == 'offer' && indx == -1) {
                incoming.push(call)
            }
            if (call.type == 'cancel') {
                incoming.splice(indx, 1)
            }
            if (call.type == 'ice')
            console.log(call)
        }
        incomingCall(incoming)
        setTimeout(startListen, 500)
    }

    function incomingCall(incomig) {
        if (!hasActiveCall() && incomig.length > 0) {
            call = incomig[0]
            webrtcSubscriberInfo.innerText = call.caller
            webrtcSubscriberInfo.classList.add('animate-scale')
            webrtcCallButtons.appendChild(webrtcCancelButton)
            webrtcCallButtons.appendChild(webrtcAcceptButton)
            webrtcAcceptButton.dataset.caller = call.caller
            webrtcAcceptButton.dataset.offer = JSON.stringify(call.offer)
            webrtcAcceptButton.dataset.callId = call.id
            if(webrtcPopup.contains(webrtcRemoteStream)){
                webrtcPopup.removeChild(webrtcRemoteStream)
            }
            webrtcPopup.prepend(webrtcCallInfo)
            webrtcPopupShow()
        }
    }

    async function answerCall(callId, caller, offer) {
        peer = createNewPeerConnection()
        peer.callId = callId

        try {
            let stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
            webrtcLocalStream.srcObject = stream
            stream.getTracks().forEach(track => peer.addTrack(track, stream))
        } catch (err) {
            console.log(err)
        }

        await peer.setRemoteDescription(offer)
        let answer = await peer.createAnswer()
        await peer.setLocalDescription(answer)

        try {
            let response = await fetch('/webrtc/answer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 'id': callId, 'offer': answer }),
                signal: fetchAbort.signal
            })
            listenIceCanditates(peer, caller)
        } catch (err) {
            console.log(err)
        }
        //remove incomig call from list
        let indx = incoming.findIndex(call => call.id == callId)
        incoming.splice(indx, 1)
    }


    async function listenIceCanditates(peer, caller) {
        let result = await fetch(`/webrtc/icecandidates?callid=${peer.callId}`, {
            method: "GET",
            signal: iceFetchAbort.signal
        })

        let candidates = await result.json()
        console.log(candidates)
        if (peer.connectionState != 'connected') {
            if (candidates.length > 0 !== null && peer.connectionState != 'connected') {
                candidates.forEach(candidate => {
                    peer.addIceCandidate(candidate)

                })
                setTimeout(() => { listenIceCanditates(peer, caller) })
            }

        }
    }

    function dragElement(elmnt) {
        var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        if (document.getElementById(elmnt.id + "header")) {
          // if present, the header is where you move the DIV from:
          document.getElementById(elmnt.id + "header").onmousedown = dragMouseDown;
        } else {
          // otherwise, move the DIV from anywhere inside the DIV:
          elmnt.onmousedown = dragMouseDown;
        }
      
        function dragMouseDown(e) {
          e = e || window.event;
          e.preventDefault();
          // get the mouse cursor position at startup:
          pos3 = e.clientX;
          pos4 = e.clientY;
          document.onmouseup = closeDragElement;
          // call a function whenever the cursor moves:
          document.onmousemove = elementDrag;
        }
      
        function elementDrag(e) {
          e = e || window.event;
          e.preventDefault();
          // calculate the new cursor position:
          pos1 = pos3 - e.clientX;
          pos2 = pos4 - e.clientY;
          pos3 = e.clientX;
          pos4 = e.clientY;
          // set the element's new position:
          elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
          elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
        }
      
        function closeDragElement() {
          // stop moving when mouse button is released:
          document.onmouseup = null;
          document.onmousemove = null;
        }
      }

})()