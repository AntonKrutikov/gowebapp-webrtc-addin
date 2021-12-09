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
		v.Vars["first_name"] = session.Values["first_name"]
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
	ID     string     `json:"id"`
	Caller string     `json:"caller"`
	Callee string     `json:"callee"`
	Offer  Offer      `json:"offer"`
	Accept chan Offer `json:"-"`
	Type   string     `json:"type"` //new or cancel
}

func (c *Call) Cancel() {
	for i := range PendingCalls {
		if PendingCalls[i] == c {
			pendingMutex.Lock()
			PendingCalls[i] = PendingCalls[len(PendingCalls)-1]
			PendingCalls[len(PendingCalls)-1] = nil
			PendingCalls = PendingCalls[:len(PendingCalls)-1]
			pendingMutex.Unlock()
		}
	}
	c.Type = "cancel"
}

var PendingCalls = []*Call{}
var pendingMutex = &sync.RWMutex{}

type IceCandidate struct {
	Candidate     string `json:"candidate"`
	SdpMid        string `json:"sdpMid"`
	SdpMLineIndex int    `json:"sdpMLineIndex"`
}

type WebrtcSubscriber struct {
	Name          string
	Incoming      chan Call //TODO
	IceCandidates []IceCandidate
}

var WebrtcSubscribers = map[string]*WebrtcSubscriber{}
var subscribersMutex = &sync.RWMutex{}

func WebrtcListenningGET(w http.ResponseWriter, r *http.Request) {
	notifier, _ := w.(http.CloseNotifier)
	session := session.Instance(r)

	user_name := session.Values["first_name"].(string)

	subscriber := WebrtcSubscriber{
		Name:     user_name,
		Incoming: make(chan Call),
	}

	subscribersMutex.Lock()
	WebrtcSubscribers[user_name] = &subscriber
	subscribersMutex.Unlock()

	select {
	case <-notifier.CloseNotify():
		subscribersMutex.Lock()
		delete(WebrtcSubscribers, user_name)
		subscribersMutex.Unlock()
	case call := <-subscriber.Incoming:
		j, _ := json.Marshal(call)
		w.Write(j)
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

	call.Caller = session.Values["first_name"].(string)
	call.Type = "new"
	call.Accept = make(chan Offer)

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
	}
}

func WebrtcAnswerPOST(w http.ResponseWriter, r *http.Request) {
	//notifier, _ := w.(http.CloseNotifier)
	//session := session.Instance(r)

	call := Call{}
	dec := json.NewDecoder(r.Body)
	err := dec.Decode(&call)
	if err != nil {
		return //TODO
	}

	for _, c := range PendingCalls {
		if c.ID == call.ID {
			c.Accept <- call.Offer
		}
	}
}

func IceCandidatesGET(w http.ResponseWriter, r *http.Request) {
	caller := r.URL.Query().Get("caller")

	if caller != "" && WebrtcSubscribers[caller] != nil {
		j, _ := json.Marshal(WebrtcSubscribers[caller].IceCandidates)
		w.Write(j)
	}
}

func IceCandidatesPOST(w http.ResponseWriter, r *http.Request) {
	session := session.Instance(r)

	// iceCandidates := []IceCandidate{}
	// dec := json.NewDecoder(r.Body)
	// err := dec.Decode(&iceCandidates)
	// if err != nil {
	// 	return
	// }

	// user := session.Values["first_name"].(string)
	// if WebrtcSubscribers[user] != nil {
	// 	WebrtcSubscribers[user].IceCandidates = iceCandidates
	// }

	iceCandidate := IceCandidate{}
	dec := json.NewDecoder(r.Body)
	err := dec.Decode(&iceCandidate)
	if err != nil {
		return
	}
	user := session.Values["first_name"].(string)
	if WebrtcSubscribers[user] != nil {
		WebrtcSubscribers[user].IceCandidates = append(WebrtcSubscribers[user].IceCandidates, iceCandidate)
	}
	fmt.Println("Recieved ICE from", user)
}
