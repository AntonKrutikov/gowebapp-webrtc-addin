(async () => {
    const offerOptions = {
        offerToReceiveAudio: 1,
        offerToReceiveVideo: 1
    };

    let stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
    let pc = newPeerConnection()

    function newPeerConnection() {
        let pc = new RTCPeerConnection({
            iceServers: [{
                urls: 'stun:stun.l.google.com:19302'
            }]
        })

        stream.getTracks().forEach(track => pc.addTrack(track, stream))

        pc.addEventListener('track', (e) => {
            console.log(e)
            incomingContainer.style.display = 'none'
            remoteVideo.srcObject = e.streams[0]
            cancelCallButton.style.display = 'flex'
        })

        /* ICE */

        let candidates = []

        pc.onicecandidate = (e) => {
            console.log(e)
            if (e.candidate !== null) {
                candidates.push(e.candidate.toJSON())
                console.log(e)
            } else if (e.candidate === null && candidates.length !== 0) {
                console.log(candidates)
                fetch("/webrtc/icecandidates", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(candidates)
                })
                candidates = []
            }
        }

        pc.oniceconnectionstatechange = () => {
            if (pc.iceConnectionState == 'disconnected') {
                remoteVideo.srcObject = null
                cancelCallButton.style.display = 'none'
                pc.close()
                pc = newPeerConnection()
            }
        }

        return pc
    }

    const localVideo = document.getElementById('localVideo');
    const remoteVideo = document.getElementById('remoteVideo');



    localVideo.srcObject = stream;

    /* Wait for incoming (join) */
    let incomingContainer = document.querySelector('.incoming-container')

    async function showIncoming(incoming) {
        incomingContainer.style.display = 'none'
        incomingContainer.replaceChildren();

        if (incoming && incoming.length > 0) {

            incoming.forEach(call => {
                let btn = document.createElement('button')
                btn.innerText = `Incoming call ${call.caller}`
                btn.addEventListener('click', async () => {
                    await createAnswer(call.offer, call.id)
                    waitIceCanditates(call.caller)
                })
                incomingContainer.appendChild(btn)
            })

            incomingContainer.style.display = 'flex'
        }
    }

    let incoming = []
    async function waitForCalls() {
        let response = await fetch('/webrtc/listennig')
        let call = await response.json()
        if (call) {
            let indx = incoming.findIndex(c => c.id == call.id)
            if (call.type == 'new' && indx == -1) {
                incoming.push(call)
            }
            if (call.type == 'cancel') {
                incoming.splice(indx, 1)
            }
        }
        showIncoming(incoming)
        setTimeout(waitForCalls, 500)
    }
    waitForCalls()


    /* Call (create offer part) */

    let calleeInput = document.querySelector('#callee')
    calleeInput.addEventListener('keyup', (e) => {
        if (e.target.value == '') {
            callButton.disabled = true
        } else {
            callButton.disabled = false
        }
    })

    let callButton = document.querySelector('#call')

    let callingPlaceholder = document.querySelector('.calling-placeholder')

    //Need to abort polling on dialup cancelation
    let fetchAbort = new AbortController()
    let abortCallButton = document.querySelector('#abort-call')
    abortCallButton.addEventListener('click', (e) => {
        fetchAbort.abort()
        callingPlaceholder.style.display = 'none'
    })

    callButton.addEventListener('click', async () => {
        callButton.disabled = true
        fetchAbort = new AbortController()
        callingPlaceholder.style.display = 'flex'
        let callee = calleeInput.value
        await createOffer(callee)
        calleeInput.value = ''
    })

    createOffer = async (callee) => {
        cancelCall() //cancel current

        pc.currentCallID = window.URL.createObjectURL(new Blob([])).substr(-36)

        let offer = await pc.createOffer(offerOptions)
        pc.setLocalDescription(offer)

        try {
            let response = await fetch('/webrtc/offer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ callee: callee, offer: offer, id: pc.currentCallID }),
                signal: fetchAbort.signal
            })
            if (response.status == 204) {
                console.log('Callee not found')
            }
            if (response.status == 200) {
                let answer = await response.json()
                if (answer) {
                    console.log(answer)
                    await pc.setRemoteDescription(answer)
                }
            }
        } catch (err) {
            console.log(err)
        }
        finally {
            callingPlaceholder.style.display = 'none'
            callButton.disabled = false
        }
    }


    /* Answer */
    async function createAnswer(offer, id) {
        cancelCall() //cancel current

        pc.currentCallID = id
        await pc.setRemoteDescription({ "type": offer.type, sdp: offer.sdp })
        let answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        let response = await fetch('/webrtc/answer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 'id': id, 'offer': answer })
        })
        //remove incomig button
        let indx = incoming.findIndex(c => c.id == pc.currentCallID)
        console.log(incoming)
        incoming.splice(indx, 1)
    }





    let cancelCallButton = document.querySelector('.cancel-call')
    cancelCallButton.addEventListener('click', () => {
        cancelCall()
    })
    let cancelCall = () => {
        let callID = pc.currentCallID
        remoteVideo.srcObject = null
        cancelCallButton.style.display = 'none'
        // fetch('/webrtc/cancel', {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json'
        //     },
        //     body: JSON.stringify({ id: callID })
        // })
        pc.close()
        pc = newPeerConnection()
    }



    async function waitIceCanditates(caller) {
        let result = await fetch(`/webrtc/icecandidates?caller=${caller}`, {
            method: "GET"
        })
        let response = await result.json()
        console.log(response)
        response.forEach(c => {
            pc.addIceCandidate(c)
        })
    }
})()