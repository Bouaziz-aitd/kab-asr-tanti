import React, { useState, useRef } from 'react';

// The URL of our new Flask backend server
const BACKEND_URL = 'http://127.0.0.1:5000/transcribe';

const App = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Ready to transcribe Kabyle.');
  const [transcription, setTranscription] = useState('');
  const [audioURL, setAudioURL] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = event => {
        audioChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        stream.getTracks().forEach(track => track.stop()); // Stop microphone stream
        handleTranscription(audioBlob);
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setStatusMessage('Recording started... Click again to stop.');
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setStatusMessage('Error: Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setStatusMessage('Recording stopped. Processing audio...');
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const audioBlob = new Blob([file], { type: file.type });
      const url = URL.createObjectURL(audioBlob);
      setAudioURL(url);
      handleTranscription(audioBlob);
    }
  };

  const handleTranscription = async (audioBlob) => {
    setIsLoading(true);
    setStatusMessage('Transcribing audio...');
    setTranscription('');

    const transcribedText = await sendAudioToServer(audioBlob);
    
    // Check if the transcription was successful
    if (transcribedText && !transcribedText.startsWith("Error:")) {
        // The server is now responsible for post-processing, so we display the text as-is.
        setTranscription(transcribedText);
        setStatusMessage('Transcription complete.');
    } else {
        setTranscription(transcribedText);
        setStatusMessage('Transcription failed.');
    }

    setIsLoading(false);
  };

  // --- THIS IS THE NEW FUNCTION THAT SENDS AUDIO TO THE FLASK SERVER ---
  const sendAudioToServer = async (audioBlob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.wav');

    try {
      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.transcription;
    } catch (error) {
      console.error("Error sending audio to server:", error);
      return `Error: Failed to get transcription from server. ${error.message}`;
    }
  };
  
  const handlePlayAudio = () => {
    const audio = new Audio(audioURL);
    audio.play();
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center font-sans p-4">
      <style>
        {`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
          .animate-spin {
            animation: spin 1s linear infinite;
          }
        `}
      </style>
      <div className="bg-white shadow-xl rounded-2xl p-8 max-w-2xl w-full text-center space-y-6">
        <h1 className="text-4xl font-extrabold text-gray-800">Kabyle ASR Web App</h1>
        <p className="text-gray-600">Record or upload audio to get a transcription.</p>

        <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4 mt-6">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`flex items-center justify-center px-6 py-3 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-md
              ${isRecording ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            disabled={isLoading}
          >
            {isRecording ? (
              <>
                <svg className="w-6 h-6 mr-2 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a4 4 0 01-4-4V5a4 4 0 118 0v4a4 4 0 01-4 4z"></path>
                </svg>
                Stop Recording
              </>
            ) : (
              <>
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a4 4 0 01-4-4V5a4 4 0 118 0v4a4 4 0 01-4 4z"></path>
                </svg>
                Start Recording
              </>
            )}
          </button>
          
          <label htmlFor="file-upload" className={`flex items-center justify-center px-6 py-3 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-md
            bg-gray-200 text-gray-800 hover:bg-gray-300 cursor-pointer ${isLoading || isRecording ? 'opacity-50 pointer-events-none' : ''}`}>
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
            </svg>
            Upload Audio
            <input 
              id="file-upload" 
              type="file" 
              accept="audio/*" 
              className="hidden" 
              onChange={handleFileUpload}
              disabled={isLoading || isRecording}
            />
          </label>
        </div>

        {audioURL && (
            <div className="flex items-center justify-center mt-4">
                <button
                    onClick={handlePlayAudio}
                    className="flex items-center px-4 py-2 rounded-lg bg-green-500 text-white font-semibold shadow-md hover:bg-green-600 transition-colors"
                >
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path>
                    </svg>
                    Play Audio
                </button>
            </div>
        )}
        
        <div className="mt-6 text-xl font-medium text-gray-700 h-8">
          {isLoading ? (
            <div className="flex items-center justify-center">
              <svg className="w-6 h-6 animate-spin text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.418 5v5h.582M18 10V4.5a2.5 2.5 0 00-2.5-2.5h-8A2.5 2.5 0 005 4.5V10m13 0l-3 3m0 0l-3 3m3-3v14m0-14H10"></path>
              </svg>
              <span className="text-blue-500">{statusMessage}</span>
            </div>
          ) : (
            <span className="text-gray-500">{statusMessage}</span>
          )}
        </div>

        {transcription && (
          <div className="mt-8 p-6 bg-gray-50 rounded-xl shadow-inner text-left">
            <h3 className="text-2xl font-bold text-gray-800 flex items-center mb-4">
                <svg className="w-6 h-6 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Transcription
            </h3>
            <p className="text-gray-800 text-xl leading-relaxed">{transcription}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;