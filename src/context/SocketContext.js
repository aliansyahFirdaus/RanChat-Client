import { createContext, useState, useRef, useEffect } from "react";
import { io } from "socket.io-client";
import Peer from "simple-peer";
import { useSelector, useDispatch } from "react-redux";
import {
  createGuest,
  deleteGuest,
  fetchRoomDetail,
} from "../actions/guestAction";
const SocketContext = createContext();

const socket = io(
  process.env.NODE_ENV === "production"
    ? "https://ranchat-app.herokuapp.com"
    : "http://localhost:4001"
);

const ContextProvider = ({ children }) => {
  const [stream, setStream] = useState(null);
  const [me, setMe] = useState("");
  const [call, setCall] = useState({});
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [name, setName] = useState("");

  const roomId = useSelector((state) => state.guest.room);

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();

  const dispatch = useDispatch();
  const guest = useSelector((state) => state.guest.guest);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((currentStream) => {
        setStream(currentStream);

        myVideo.current.srcObject = currentStream;
      });

    socket.on("me", (id) => {
      setMe(id);
      dispatch(createGuest(id));
    });

    socket.on("calluser", ({ from, name: callerName, signal }) => {
      setCall({ isReceivedCall: true, from, name: callerName, signal });
    });
  }, []);

  useEffect(() => {
    socket.on("disconnected", () => {
      dispatch(deleteGuest(guest.mongoId));
    });
  }, [socket]);

  const answerCall = () => {
    setCallAccepted(true);

    // const peer = new Peer({ initiator: false, trickle: false, stream });
    const peer = new Peer({
      config: {
        iceServers: [
          { url: "stun:stun.l.google.com:19302" },
          {
            url: "turn:numb.viagenie.ca",
            credential: "muazkh",
            username: "webrtc@live.com",
          },
        ],
      },
      initiator: false,
      trickle: false,
      stream,
    });

    peer.on("signal", (data) => {
      socket.emit("answercall", { signal: data, to: call.from });
    });
    dispatch(fetchRoomDetail(roomId)); //room id di line 26
    console.log("jawab dulu telfonnya ya");

    peer.on("stream", (currentStream) => {
      userVideo.current.srcObject = currentStream;
    });

    peer.signal(call.signal);

    connectionRef.current = peer;
  };
  const callUser = (id) => {
    const peer = new Peer({ initiator: true, trickle: false, stream });
    // const peer = new Peer({
    //   config: {
    //     iceServers: [
    //       { url: "stun:stun.l.google.com:19302" },
    //       {
    //         url: "turn:numb.viagenie.ca",
    //         credential: "muazkh",
    //         username: "webrtc@live.com",
    //       },
    //     ],
    //   },
    //   initiator: false,
    //   trickle: false,
    //   stream,
    // });

    console.log(id, "halohalo bengkel mobil");

    peer.on("signal", (data) => {
      socket.emit("calluser", {
        userToCall: id,
        signalData: data,
        from: me,
        name,
      });
    });

    peer.on("stream", (currentStream) => {
      userVideo.current.srcObject = currentStream;
    });

    socket.on("callaccepted", (signal) => {
      setCallAccepted(true);

      peer.signal(signal);
    });

    connectionRef.current = peer;
  };
  const leaveCall = () => {
    setCallEnded(true);
    connectionRef.current.destroy();

    window.location.reload();
  };

  // const sendMessage = () => {
  //   socket.emit("sendMessageFromVideo", { username, message, room });
  //   setMessage([...message, { sender: "you", message }]);
  // };

  return (
    <SocketContext.Provider
      value={{
        call,
        callAccepted,
        myVideo,
        userVideo,
        stream,
        name,
        setName,
        callEnded,
        me,
        callUser,
        leaveCall,
        answerCall,
        setCallAccepted,
        socket,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export { ContextProvider, SocketContext };
