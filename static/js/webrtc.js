(async () => {

    let webrtcPopup = document.createElement('div')
    webrtcPopup.classList.add('webrtc-popup')
    // dragElement(webrtcPopup);

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
    webrtcCancelButtonImg.src = 'static/assets/end-call_128.png'
    webrtcCancelButton.addEventListener('click', () => {
        endCall()
    })
    webrtcCancelButton.appendChild(webrtcCancelButtonImg)
    // webrtcCallButtons.appendChild(webrtcCancelButton)

    let webrtcAcceptButton = document.createElement('div')
    webrtcAcceptButton.classList.add('webrtc-cancel-button')
    webrtcAcceptButtonImg = document.createElement('img')
    webrtcAcceptButtonImg.src = 'static/assets/accept-call_128.png'
    webrtcAcceptButton.addEventListener('click', () => {
        let callId = webrtcAcceptButton.dataset.callId
        let caller = webrtcAcceptButton.dataset.caller
        let callee = webrtcAcceptButton.dataset.callee
        let offer = JSON.parse(webrtcAcceptButton.dataset.offer)

        answerCall(callId, caller, callee, offer)
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

    /* minimize button */
    let webrtcMinimizeButon = document.createElement('img')
    webrtcMinimizeButon.src = 'static/assets/minimize.png'
    webrtcMinimizeButon.classList.add('webrtc-minimize')
    webrtcMinimizeButon.addEventListener('click', () => {
        /* only on desktops */
        let mquery = window.matchMedia('(hover: none)')
        if (!mquery.matches){
            if (webrtcPopup.dataset.minimized == 'true') {
                webrtcMaximaize()
            } else {
                webrtcMinimize()
            }
        } else {
            webrtcMaximaize()
        }
    })
    webrtcPopup.appendChild(webrtcMinimizeButon)

    function webrtcMinimize() {
        webrtcPopup.style.width = '25%';
        webrtcPopup.style.height = '25%';
        webrtcPopup.style.right = 0;
        webrtcPopup.style.bottom = 0;
        webrtcPopup.style.top = 'unset';
        webrtcPopup.style.left = 'unset';
        webrtcPopup.style.transform = 'unset';
        webrtcMinimizeButon.style.width = '24px'
        webrtcMinimizeButon.style.height = '24px'
        webrtcMinimizeButon.style.transform = 'scaleY(-1)'

        webrtcChatContainer.style.display = 'none'
        webrtcChatIcon.style.display = 'none'

        webrtcPopup.dataset.minimized = 'true';
        dragElement(webrtcPopup);
    }

    function webrtcMaximaize() {
        webrtcPopup.style.width = null;
        webrtcPopup.style.height = null;
        webrtcPopup.style.right = null;
        webrtcPopup.style.bottom = null;
        webrtcPopup.style.top = null;
        webrtcPopup.style.left = null;
        webrtcPopup.style.transform = null;
        webrtcMinimizeButon.style.width = null
        webrtcMinimizeButon.style.height = null
        webrtcMinimizeButon.style.transform = null

        webrtcChatContainer.style.display = null
        webrtcChatIcon.style.display = null

        webrtcPopup.dataset.minimized = 'false'
        webrtcPopup.onmousedown = null
    }

    /* simple chat */
    let chat = {
        addMessage(from, msg) {
            let m = document.createElement('div')
            m.classList.add('webrtc-chat-message')
            let sender = document.createElement('b')
            let text = document.createElement('span')
            sender.innerText = `${from}:`
            text.innerText = msg
            m.appendChild(sender)
            m.appendChild(text)
            webrtcChat.prepend(m)
        }
    }
    //chat ico
    webrtcChatIcon = document.createElement('img')
    webrtcChatIcon.src = 'static/assets/chat.png'
    webrtcChatIcon.classList.add('webrtc-chat-icon')
    webrtcChatIcon.addEventListener('click', ()=> {
        if (webrtcPopup.contains(webrtcChatContainer)) {
            webrtcPopup.removeChild(webrtcChatContainer)
            webrtcChatIcon.style.right = null
            webrtcRemoteStream.style.width = null
            webrtcCallInfo.style.width = null
            webrtcCallButtons.style.width = null
        } else {
            webrtcPopup.appendChild(webrtcChatContainer)
            webrtcChatIcon.style.right = 'calc(25% + 16px)'
            webrtcRemoteStream.style.width='75%'
            webrtcCallInfo.style.width = '75%'
            webrtcCallButtons.style.width = '75%'


        }
    })
    webrtcPopup.appendChild(webrtcChatIcon)
    //container
    webrtcChatContainer = document.createElement('div')
    webrtcChatContainer.classList.add('webrtc-chat-container')
    //chat
    webrtcChat = document.createElement('div')
    webrtcChat.classList.add('webrtc-chat')
    webrtcChatContainer.appendChild(webrtcChat)
    //input
    webrtcChatInput = document.createElement('input')
    webrtcChatInput.type = 'text'
    webrtcChatInput.classList.add('webrtc-chat-input')
    webrtcChatInput.addEventListener('change', (e) => {
        if(peerDataChannel != null && peerDataChannel.readyState === 'open') {
            peerDataChannel.send(e.target.value)
            chat.addMessage(peerConnection.caller,e.target.value)
        }
        e.target.value=''
    })
    webrtcChatContainer.appendChild(webrtcChatInput)
    //webrtcPopup.appendChild(webrtcChatContainer)


    let peerConnection = null
    let peerConfig = {
        iceServers: [
            {
                "url": "stun:23.228.231.11:3478",
                "username": "guest",
                "urls": "stun:23.228.231.11:3478",
                "credential": "krxo736n55sthlvu3t8u15jhltf02131"
            }
        ]
    }
    let peerDataChannel = null
    function initDataChannel(datachannel) {
        datachannel.onmessage = (e) => {
            chat.addMessage(peerConnection.callee,e.data)
        }

        datachannel.onopen = (e) => {
        }

    }
    startListen() //always wait for incoming


    let fetchAbort = new AbortController()
    let iceFetchAbort = new AbortController()

    function createNewPeerConnection() {
        let peer = new RTCPeerConnection(peerConfig)

        /* Data Channels */
        peer.ondatachannel = (e) => {
            peerDataChannel = e.channel
            initDataChannel(peerDataChannel)
        }

        peer.onicecandidate = (e) => {
            if (e.candidate !== null) {
                //console.log(e)
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
                console.log('PeerConnection: connected')
                peerConnection.getSenders().map(sender => {
                    const kindOfTrack = sender.track?.kind;
                    if (sender.transport) {
                        const iceTransport = sender.transport.iceTransport;
                        const logSelectedCandidate = (e) => {
                            const selectedCandidatePair = iceTransport.getSelectedCandidatePair();
                            console.log(`SELECTED ${kindOfTrack || 'unknown'} SENDER CANDIDATE PAIR`, selectedCandidatePair);
                        };
                        iceTransport.onselectedcandidatepairchange = logSelectedCandidate;
                        logSelectedCandidate();
                    } else {
                        // retry at some time later
                    }
                });
            }
            if (peer.connectionState === 'disconnected') {
                peer.close()
                if (peerConnection == null) {
                    calleeDisconnected()
                }
            }
        }

        peer.addEventListener('track', (e) => {
            webrtcPopup.prepend(webrtcRemoteStream)
            // if (webrtcRemoteStream.srcObject) {
            //     return
            // }
            webrtcRemoteStream.srcObject = e.streams[0]

            if (webrtcPopup.contains(webrtcCallInfo)) {
                webrtcPopup.removeChild(webrtcCallInfo)
            }
            if (webrtcCallButtons.contains(webrtcAcceptButton)) {
                webrtcCallButtons.removeChild(webrtcAcceptButton)
            }
        })

        peerConnection = peer

        return peer
    }

    async function startCall(callee) {
        if (!hasActiveCall()) {
            if (webrtcPopup.contains(webrtcRemoteStream)) {
                webrtcPopup.removeChild(webrtcRemoteStream)
            }
            webrtcPopup.prepend(webrtcCallInfo)
            webrtcSubscriberInfo.innerText = callee
            webrtcSubscriberInfo.classList.add('animate-scale')
            webrtcCallButtons.appendChild(webrtcCancelButton)
            webrtcPopupShow()

            peerConnection = createNewPeerConnection()
            peerConnection.callee = callee

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

    function calleeBusy() {
        webrtcSubscriberInfo.innerText = `Busy`
        webrtcSubscriberInfo.classList.remove('animate-scale')
        // webrtcCallButtons.removeChild(webrtcAcceptButton)
    }

    function calleeDisconnected() {
        webrtcSubscriberInfo.innerText = `Connection lost`
        webrtcSubscriberInfo.classList.remove('animate-scale')
        webrtcRemoteStream.srcObject = null
        if (webrtcPopup.contains(webrtcRemoteStream)){
            webrtcPopup.removeChild(webrtcRemoteStream)
        }
        webrtcPopup.prepend(webrtcCallInfo)
    }

    function hasActiveCall() {
        // return document.body.contains(webrtcPopup)
        if (peerConnection && !peerConnection.signalingState === 'closed') {
            return true
        } else {
            return false
        }
        // return peerConnection?.signalingState === 'closed' ? false : true
    }

    function webrtcPopupShow() {
        document.body.appendChild(webrtcPopup)
    }

    function webrtcPopupRemove() {
        document.body.removeChild(webrtcPopup)
    }

    function endCall() {
        webrtcPopupRemove()
        let callId = webrtcAcceptButton.dataset.callId
        if (callId) {
            fetch(`/webrtc/cancel?callid=${callId}`, {
                method: 'GET'
            })
        }

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
        peerDataChannel = peer.createDataChannel('chat')
        initDataChannel(peerDataChannel)

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
                if (answer && answer.offer) {
                    // console.log(answer)
                    peerConnection.caller = answer.caller
                    await peerConnection.setRemoteDescription(answer.offer)
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
            //save all
            if (call.type == 'offer' && indx == -1) {
                incoming.push(call)
            }
            //but send busy to all inciming after first
            if (call.type == 'offer' && hasActiveCall()){
                fetch(`/webrtc/cancel?callid=${call.id}`, {
                    method: 'GET'
                })
            }
            if (call.type == 'cancel') {
                incoming.splice(indx, 1)
                if (peerConnection != null && peerConnection.callId == call.id) {
                    if (peerConnection.signalingState === 'have-local-offer') {
                        calleeBusy()
                    } else if (peerConnection.signalingState === 'stable') {
                        calleeDisconnected()
                    }
                    peerConnection.close()
                    peerConnection = null
                } else if (webrtcAcceptButton.dataset.callId == call.id) {
                    webrtcAcceptButton.dataset.callId = null
                    endCall()
                }
            }
        }
        incomingCall(incoming)
        setTimeout(startListen, 500)
    }

    function incomingCall(incomig) {
        if (!hasActiveCall() && incomig.length > 0) {
            call = incomig[0]
            webrtcSubscriberInfo.innerText = call.caller
            webrtcSubscriberInfo.classList.add('animate-scale')
            webrtcCallButtons.appendChild(webrtcAcceptButton)
            webrtcCallButtons.appendChild(webrtcCancelButton)
            webrtcAcceptButton.dataset.caller = call.caller
            webrtcAcceptButton.dataset.callee = call.callee
            webrtcAcceptButton.dataset.offer = JSON.stringify(call.offer)
            webrtcAcceptButton.dataset.callId = call.id
            if (webrtcPopup.contains(webrtcRemoteStream)) {
                webrtcPopup.removeChild(webrtcRemoteStream)
            }
            webrtcPopup.prepend(webrtcCallInfo)
            webrtcPopupShow()
        }
    }

    async function answerCall(callId, caller, callee, offer) {
        peer = createNewPeerConnection()
        peer.callId = callId
        peer.callee = caller
        peer.caller = callee


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
                body: JSON.stringify({ 'id': callId, 'offer': answer, caller: caller }),
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
        try {
        let result = await fetch(`/webrtc/icecandidates?callid=${peer.callId}`, {
            method: "GET",
            signal: iceFetchAbort.signal
        })

        let candidates = await result.json()
        if (peer.connectionState != 'connected') {
            if (candidates.length > 0 !== null && peer.connectionState != 'connected') {
                candidates.forEach(candidate => {
                    peer.addIceCandidate(candidate)

                })
                setTimeout(() => { listenIceCanditates(peer, caller) })
            }

        }} catch (err) {
            console.log('Abort ice candidates collect. (cancel fetch to /webrtc/icecandidates/?callid')
        }
    }

    /* Inform server that we leave page */
    window.addEventListener("beforeunload", (e) => {
        endCall()
     })

    /* HELPERS */


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