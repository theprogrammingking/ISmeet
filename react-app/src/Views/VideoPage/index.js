import React, { useEffect, useRef, useState,useCallback } from "react";
import {useLocation} from "react-router-dom";
import io from 'socket.io-client';
import Peer, { Instance, SignalData } from 'simple-peer';
import { Redirect } from 'react-router-dom';
import { connect } from 'react-redux'
import { useHistory } from 'react-router-dom';
import VideoCallBar from '../../Components/VideoCallBar'
import { VideoFrame } from '../../Components/VideoFrame'
import Grid from '@material-ui/core/Grid';
import bg0 from '../../Assets/bg0.jpeg'
import bg1 from '../../Assets/bg1.png'
import bg2 from '../../Assets/bg2.jpeg'
import './videopage.css'


export const VideoPage = (props) => {
 
  const userVideo = useRef(document.createElement('video'))
  const userStream = useRef()

    const socketRef = useRef();
    const peersRef = useRef([]);
   
    const { auth, location } = props
    const history = useHistory()
console.log(location.state)
    //get query parameter
   const search = useLocation().search;
   const params = new URLSearchParams(search);

   const [peers, setPeers] = useState([]);
   const [audio, setAudio] = useState(true);
   const [video, setVideo] = useState(true);
   const inputRef = useRef(null)
   const [chats, setChats] = useState([])
  const [ roomID, setRoomId] =useState();
   const [bg, setBg] = useState(bg0)

   useEffect(() => {
    init()
}, [])
const init = useCallback(async() => {
  socketRef.current = io.connect("http://localhost:5000")
 
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
 
  //const userstream = await navigator.mediaDevices.getUserMedia({ audio: audio, video: video })
  userVideo.current.srcObject = userStream.current = stream;
 
      if(params.get('host') && !params.get('room')){
       console.log(localStorage.getItem('meetname'))
        socketRef.current.emit("start meet", {token : localStorage.getItem('idToken') , meetname :localStorage.getItem('meetname') } )
        socketRef.current.on("roomID", (roomID) => {
            console.log(roomID)
            setRoomId(roomID)
            window.history.replaceState("", "", `?room=${roomID}`);
           
        })
      }else{
          if(params.get('host') || !params.get('room')|| typeof params.get('room') !== 'string') {
            alert("Enter a valid url")
                return;
          }
          socketRef.current.emit("join room", {roomID: params.get('room'), token: localStorage.getItem('idToken') })

          socketRef.current.on("invalid room", () => {
            alert("Invalid room")
            return;
        })
        socketRef.current.on("room full", () => {
          alert("Room full")
          return;
      })
      }
    

      //get all member details and create peers
      socketRef.current.on("all members", (members) => {
        console.log(members)
        const peers = members.map(member => {
         
          
            const peer = createPeer(member.id, socketRef.current.id, stream);
            console.log("stream", stream)
           
          
            const peerObj = {
                peerID: member.id,
                peer,
                username: member.username
            }
            peersRef.current.push(peerObj)
            return peerObj
        })
        console.log(peers)
            setPeers(peers)
        })
    
        socketRef.current.on("user joined", (payload) => {
          console.log("user joined")
          const { signal, id, username } = payload
          console.log(signal)
          const peer = addPeer(signal, id, stream)
          const peerObj = {
              peerID: id,
              peer,
              username
          }
          peersRef.current.push(peerObj)
          addPeerVideo(peerObj)
          addToChat({message : username +" joined the meet "})
         
       
     
      })

      socketRef.current.on("receiving returned signal", (payload) => {
          console.log("receiving returned signal")
          const { signal, id } = payload
          const item = peersRef.current.find((p) => p.peerID === id);
        
          if(item){
              item.peer.signal(signal)
          }
      })
      socketRef.current.on("unauthorized", (message) => {
        alert(message)
        exit()
    })

    socketRef.current.on("disconnected", ({ id, username }) => {
        disconnected({ id, username })
    })

    socketRef.current.on("something broke", (message) => {
        alert(message)
        exit()
    })
    
  
    }, []);
    
  
    const createPeer = useCallback((userToSignal, callerID, stream) => {
      // console.log("create peer")
      const peer = new Peer({
          initiator: true,
          trickle: false,
          config: {
            'iceServers': [
                { 'urls': 'stun:stun.l.google.com:19302' },
            ]},
            stream
      })
     

      peer.on("signal", (signal) => {
          socketRef.current.emit("sending signal", { userToSignal, callerID, signal })
      })

      return peer
  }, [])

  const addPeer = useCallback((incomingSignal, callerID, stream) => {
      // console.log("add peer")
      const peer = new Peer({
          initiator: false,
          trickle: false,
          stream
      })
     
      peer.on("signal", (signal) => {
          console.log(signal)
          socketRef.current.emit("returning signal", { signal, callerID })
      })

      peer.signal(incomingSignal)
      return peer
  }, [])

  const addPeerVideo = useCallback((peerObj) => {
      setPeers(peers => [...peers, peerObj])
     
     
  }, [])

  const removePeerVideo = useCallback((id) => {
      setPeers(peers => peers.filter(peer => peer.peerID !== id))
  }, [])

  const exit = useCallback(() => {
      socketRef.current.disconnect()
      history.replace("/")
      userStream.current?.getTracks().forEach((track) => {
          track.stop();
      });
  }, [])

  const disconnected = useCallback(({ id, username }) => {
      alert(username + "left the chat")
      addToChat({message : username +" left the chat"})
      peersRef.current = peersRef.current.filter(peer => peer.peerID !== id)
      removePeerVideo(id)
  }, [])
  
  useEffect(() => {
    socketRef.current.on("receive-message", (payload) => {
    console.log("read..")
    console.log(payload)
       addToChat(payload)
    })
}, [])
const sendMessage = useCallback((e) => {
    e.preventDefault()
    console.log("send")
    if(inputRef.current && inputRef.current?.value !== ""){
        const val = inputRef.current?.value
        socketRef.current.emit("message", val)
        const chatObj = {
            sender: auth.displayName,
            message: val,
            id:'me'
        }
        addToChat(chatObj)
        inputRef.current.value = ""
    }
}, [])
const addToChat = useCallback((chatObj) => {
    console.log(chatObj)
    console.log("add")
    setChats(chats => [...chats, chatObj])
}, [])
  
const audioHandler = () => {
    console.log(audio)
    setAudio(!audio)
    userStream.current.getAudioTracks()[0].enabled = !(userStream.current.getAudioTracks()[0].enabled);
   
}

const videoHandler = () => {
    console.log(video)
    setVideo(!video)
    userStream.current.getVideoTracks()[0].enabled = !(userStream.current.getVideoTracks()[0].enabled);
}
   

const bgHandler = () => {setBg(bg0)}
const bg1Handler = () => {setBg(bg1)}
const bg2Handler = () => {setBg(bg2)}

    if(!auth.uid && auth.isLoaded){
        return <Redirect to="/login" />
      }
    return (
        
        
        <div className="main-container" style={{backgroundImage: `url(${bg})`}}>
            <canvas id="canvas" hidden></canvas>
            {console.log(socketRef)}
          
        <VideoCallBar 
        exit={exit} 
        roomID={roomID}
        audio={audio} 
        video={video} 
        peers={peers} 
        inputRef={inputRef}
        sendMessage={sendMessage} 
        chats={chats} 
        socketId={auth.displayName} 
        audioHandler={audioHandler} 
        videoHandler={videoHandler} 
        bgHandler={bgHandler} bg1Handler={bg1Handler} bg2Handler={bg2Handler}
        />
      
        <Grid container spacing={1} alignItems="center" justify="center" style={{ minHeight: '90vh' }}>

        {peers.map((peer, index) => (
            <Grid item xs={12} sm={4}>
            <p id="overlay">{peer.username}</p>
            <VideoFrame key={index} peer={peer.peer} />
            </Grid>
        ))}    
         <Grid item xs={12}  sm={4}>
         <p id="overlay">{auth.displayName}</p>
        <video id="my-video" muted  autoPlay ref={userVideo}  playsInline ></video>
        </Grid>
       

       </Grid>

       

        </div>
    )
}
const mapStateToProps = ({auth, firebase}) => {
    return {
      auth: firebase.auth,
      authError: auth.authError
    }
  }
  export default connect(mapStateToProps)(VideoPage)
