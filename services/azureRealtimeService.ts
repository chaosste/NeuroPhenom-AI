export interface AzureRealtimeCallbacks {
  onOpen: () => void;
  onClose: () => void;
  onError: (message: string) => void;
  onAiTranscriptDelta: (delta: string) => void;
  onAiTurnDone: () => void;
  onUserTurn: (text: string) => void;
}

export interface AzureRealtimeSessionHandle {
  close: () => void;
}

interface TokenResponse {
  token: string;
  callsUrl: string;
}

const readEventText = (event: any): string => {
  if (typeof event?.transcript === "string") return event.transcript;
  if (typeof event?.delta === "string") return event.delta;
  if (typeof event?.text === "string") return event.text;
  return "";
};

export const connectAzureRealtimeSession = async (
  instructions: string,
  voice: string,
  callbacks: AzureRealtimeCallbacks
): Promise<AzureRealtimeSessionHandle> => {
  const tokenResponse = await fetch("/api/realtime/client-secret", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ instructions, voice })
  });

  const tokenData = (await tokenResponse.json().catch(() => ({}))) as Partial<TokenResponse> & {
    error?: string;
  };
  if (!tokenResponse.ok || !tokenData.token || !tokenData.callsUrl) {
    throw new Error(tokenData.error || "Failed to initialize Azure Realtime session.");
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const connection = new RTCPeerConnection();
  const remoteAudio = new Audio();
  remoteAudio.autoplay = true;

  stream.getTracks().forEach((track) => connection.addTrack(track, stream));
  connection.ontrack = (event) => {
    const [remoteStream] = event.streams;
    if (remoteStream) remoteAudio.srcObject = remoteStream;
  };

  const dataChannel = connection.createDataChannel("realtime-events");
  dataChannel.onopen = () => {
    callbacks.onOpen();
    dataChannel.send(
      JSON.stringify({
        type: "response.create",
        response: {
          modalities: ["audio", "text"],
          instructions: "Begin with a concise welcome prompt."
        }
      })
    );
  };

  dataChannel.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      if (message.type === "response.output_audio_transcript.delta") {
        const delta = readEventText(message);
        if (delta) callbacks.onAiTranscriptDelta(delta);
        return;
      }
      if (message.type === "response.output_audio_transcript.done") {
        callbacks.onAiTurnDone();
        return;
      }
      if (
        message.type === "conversation.item.input_audio_transcription.completed"
      ) {
        const text = readEventText(message);
        if (text) callbacks.onUserTurn(text);
        return;
      }
      if (message.type === "error") {
        const detail =
          message?.error?.message || "Realtime data channel returned an error.";
        callbacks.onError(detail);
      }
    } catch {
      callbacks.onError("Failed to parse realtime event payload.");
    }
  };
  dataChannel.onerror = () => callbacks.onError("Realtime data channel error.");
  dataChannel.onclose = () => callbacks.onClose();

  const offer = await connection.createOffer();
  await connection.setLocalDescription(offer);
  const sdpResponse = await fetch(tokenData.callsUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenData.token}`,
      "Content-Type": "application/sdp"
    },
    body: offer.sdp
  });

  const answerSdp = await sdpResponse.text();
  if (!sdpResponse.ok || !answerSdp) {
    throw new Error("Azure Realtime SDP negotiation failed.");
  }

  await connection.setRemoteDescription({
    type: "answer",
    sdp: answerSdp
  });

  return {
    close: () => {
      try {
        dataChannel.close();
      } catch {}
      stream.getTracks().forEach((track) => track.stop());
      connection.getSenders().forEach((sender) => sender.track?.stop());
      connection.close();
      callbacks.onClose();
    }
  };
};
