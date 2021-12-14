package controller

import (
	"fmt"
	"net/http"
	"sync"

	"app/shared/session"
	"app/shared/view"
	"encoding/json"
)

//Init page
func WebrtcGET(w http.ResponseWriter, r *http.Request) {
	session := session.Instance(r)

	if session.Values["id"] != nil {
		v := view.New(r)
		v.Name = "webrtc/webrtc"
		v.Vars["username"] = session.Values["username"]
		v.Vars["user_id"] = session.Values["id"]
		v.Render(w)
	} else {
		// Display the view
		v := view.New(r)
		v.Name = "index/invite"
		v.Render(w)
		return
	}
}

/* WEBRTC API */

type Offer struct {
	Type string `json:"type"`
	Sdp  string `json:"sdp"`
}

type Call struct {
	ID            string                    `json:"id"`
	Caller        string                    `json:"caller"`
	Callee        string                    `json:"callee"`
	Offer         Offer                     `json:"offer"`
	Accept        chan Call                 `json:"-"`
	Type          string                    `json:"type"` //offer,answer or cancel
	IceCandidates map[string][]IceCandidate `json:"-"`
	IceMutex      *sync.RWMutex             `json:"-"`
}

func (c *Call) Cancel() {
	pendingMutex.Lock()
	defer pendingMutex.Unlock()
	for i := range PendingCalls {
		if PendingCalls[i] == c {
			PendingCalls[i] = PendingCalls[len(PendingCalls)-1]
			PendingCalls[len(PendingCalls)-1] = nil
			PendingCalls = PendingCalls[:len(PendingCalls)-1]
		}
	}
	c.Type = "cancel"
}

var PendingCalls = []*Call{}
var pendingMutex = &sync.RWMutex{}

type IceCandidate struct {
	CallID        string `json:"callid"`
	User          string
	Candidate     string `json:"candidate"`
	SdpMid        string `json:"sdpMid"`
	SdpMLineIndex int    `json:"sdpMLineIndex"`
}

type WebrtcSubscriber struct {
	Name          string
	Incoming      chan Call //TODO
	IceCandidates chan IceCandidate
	Reject        chan Call
}

var WebrtcSubscribers = map[string]*WebrtcSubscriber{}
var subscribersMutex = &sync.RWMutex{}

func WebrtcListenningGET(w http.ResponseWriter, r *http.Request) {
	notifier, _ := w.(http.CloseNotifier)
	session := session.Instance(r)

	user_name := session.Values["username"].(string)

	subscriber := WebrtcSubscriber{
		Name:          user_name,
		Incoming:      make(chan Call),
		IceCandidates: make(chan IceCandidate),
		Reject:        make(chan Call),
	}

	subscribersMutex.Lock()
	WebrtcSubscribers[user_name] = &subscriber
	subscribersMutex.Unlock()

	select {
	case call := <-subscriber.Incoming:
		j, _ := json.Marshal(call)
		w.Write(j)
	case reject := <-subscriber.Reject:
		j, _ := json.Marshal(reject)
		w.Write(j)
	case <-notifier.CloseNotify():
		subscribersMutex.Lock()
		delete(WebrtcSubscribers, user_name)
		subscribersMutex.Unlock()
	}
}

//Accept call from user to target user
func WebrtcOfferPOST(w http.ResponseWriter, r *http.Request) {
	notifier, _ := w.(http.CloseNotifier)
	session := session.Instance(r)

	call := Call{}
	dec := json.NewDecoder(r.Body)
	err := dec.Decode(&call)
	if err != nil {
		return //TODO
	}

	//Does calee online?
	if WebrtcSubscribers[call.Callee] == nil {
		w.WriteHeader(204)
		return
	}

	call.Caller = session.Values["username"].(string)
	call.Type = "offer"
	call.Accept = make(chan Call)
	call.IceCandidates = map[string][]IceCandidate{}
	call.IceMutex = &sync.RWMutex{}

	pendingMutex.Lock()
	PendingCalls = append(PendingCalls, &call)
	pendingMutex.Unlock()

	WebrtcSubscribers[call.Callee].Incoming <- call

	select {
	case <-notifier.CloseNotify():
		call.Cancel()
		WebrtcSubscribers[call.Callee].Incoming <- call
	case answer := <-call.Accept:
		j, _ := json.Marshal(&answer)
		w.Write(j)
		return
	}
}

func WebrtcAnswerPOST(w http.ResponseWriter, r *http.Request) {
	//notifier, _ := w.(http.CloseNotifier)
	session := session.Instance(r)

	call := Call{}
	dec := json.NewDecoder(r.Body)
	err := dec.Decode(&call)
	if err != nil {
		return //TODO
	}

	call.Callee = session.Values["username"].(string)

	pendingMutex.Lock()
	for _, c := range PendingCalls {
		if c.ID == call.ID {
			c.Accept <- call
		}
	}
	pendingMutex.Unlock()
}

func IceCandidatesGET(w http.ResponseWriter, r *http.Request) {
	callId := r.URL.Query().Get("callid")
	notifier, _ := w.(http.CloseNotifier)
	session := session.Instance(r)
	user := session.Values["username"].(string)

	var call *Call
	pendingMutex.Lock()
	for _, c := range PendingCalls {
		if c.ID == callId {
			call = c
		}
	}
	pendingMutex.Unlock()

	if call != nil {
		iceCandidates := call.IceCandidates[user]
		if len(iceCandidates) > 0 {
			call.IceMutex.Lock()
			call.IceCandidates[user] = []IceCandidate{}
			call.IceMutex.Unlock()
			j, _ := json.Marshal(iceCandidates)
			w.Write(j)
			return
		}

	}

	select {
	case iceCandidate := <-WebrtcSubscribers[user].IceCandidates:
		iceCandidates := []IceCandidate{}
		iceCandidates = append(iceCandidates, iceCandidate)
		j, _ := json.Marshal(iceCandidates)
		w.Write(j)
	case <-notifier.CloseNotify():
		return
	}
}

func IceCandidatesPOST(w http.ResponseWriter, r *http.Request) {
	session := session.Instance(r)

	iceCandidate := IceCandidate{}
	dec := json.NewDecoder(r.Body)
	err := dec.Decode(&iceCandidate)
	if err != nil {
		return
	}
	user := session.Values["username"].(string)
	iceCandidate.User = user

	var call *Call
	pendingMutex.Lock()
	for _, c := range PendingCalls {
		if c.ID == iceCandidate.CallID {
			call = c
		}
	}
	pendingMutex.Unlock()
	if call != nil {
		var target string
		if user == call.Caller {
			target = call.Callee
		} else {
			target = call.Caller
		}
		if target != "" && WebrtcSubscribers[target] != nil && WebrtcSubscribers[target].IceCandidates != nil {
			select {
			case WebrtcSubscribers[target].IceCandidates <- iceCandidate:

				return
			default:
				call.IceMutex.Lock()
				call.IceCandidates[target] = append(call.IceCandidates[target], iceCandidate)
				call.IceMutex.Unlock()

			}
		}
	}

}

func WebrtcCancelGET(w http.ResponseWriter, r *http.Request) {
	session := session.Instance(r)
	callId := r.URL.Query().Get("callid")
	user := session.Values["username"].(string)

	fmt.Println(callId, user)

	var call *Call
	pendingMutex.Lock()
	for _, c := range PendingCalls {
		if c.ID == callId {
			call = c
		}
	}
	pendingMutex.Unlock()
	if call != nil {

		cancel := Call{
			ID:   call.ID,
			Type: "cancel",
		}
		if call.Caller == user && WebrtcSubscribers[call.Callee] != nil && WebrtcSubscribers[call.Callee].Reject != nil {
			WebrtcSubscribers[call.Callee].Reject <- cancel
		}
		if call.Callee == user && WebrtcSubscribers[call.Caller] != nil && WebrtcSubscribers[call.Caller].Reject != nil {
			WebrtcSubscribers[call.Caller].Reject <- cancel

		}
	}

}
