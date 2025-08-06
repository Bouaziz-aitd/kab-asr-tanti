# app.py - Flask server to handle ASR requests using the NeMo model (Corrected)

import os
import tempfile
import logging
import sys
from flask import Flask, request, jsonify
from flask_cors import CORS
import nemo.collections.asr as nemo_asr
from pydub import AudioSegment
import re
import datetime

# --- Suppress verbose NeMo logging ---
logging.getLogger('nemo_logger').setLevel(logging.ERROR)

app = Flask(__name__)
CORS(app)

# --- Post-processing function to correct annexation in Kabyle transcription ---
def post_process_kabyle_text(text):
    """
    Corrects annexation in Kabyle transcription by replacing spaces with dashes.
    This version uses regular expressions for more robust pattern matching.
    """
    # Defensive check to ensure 'text' is a string before processing
    if not isinstance(text, str):
        print(f"Warning: Expected string for post-processing, but received type: {type(text)}. Skipping post-processing.")
        return text

    if not text:
        return ""
    
    # Ensure text is lowercase for consistent matching
    text = text.lower()
    
    # Define the sets of particles
    PoPro = {'inu', 'inem', 'ines', 'nneɣ', 'ntex', 'nwen', 'nwent', 'nsen', 'nsent',
             'iw', 'ik', 'im', 'is', 'w', 'k', 'm', 's', 'tneɣ', 'tentex', 'tsen', 'tsent'}
    SpWo = {'deg', 'gar', 'ɣer', 'ɣur', 'fell', 'ɣef', 'ddaw', 'nnig', 'ɣid', 'aql', 'sɣur', 'sennig', 'deffir', 'sdat'}
    StPaSp = {'i', 'am', 'at', 's', 'neɣ', 'aɣ'}
    StPa = {'ak', 'as', 'aneɣ', 'anteɣ', 'awen', 'awent', 'asen', 'asent',
            'k', 'm', 'ntex', 'wen', 'went', 'sen', 'sent', 'akem', 'att',
            'aken', 'akent', 'aten', 'atent'}
    DePa = {'a', 'agi', 'nni', 'ihin', 'nniden'}
    DiPa = {'id', 'in'}
    FuPa = {'ad', 'ara'}
    DiObPa = {'yi', 'k', 'kem', 't', 'tt', 'ay', 'ken', 'kent', 'ten', 'tent',
              'iyi', 'ik', 'ikem', 'it', 'itt', 'iken', 'ikent', 'iten', 'itent'}
    InObPa = {'yi', 'yak', 'yam', 'yas', 'yaɣ', 'yawen', 'yawent', 'yasen', 'yasent'}

    # Combine all particles that can be annexed.
    all_annexable_particles = PoPro.union(SpWo, StPa, StPaSp, DePa, DiPa, FuPa, DiObPa, InObPa)
    sorted_all_annexable = sorted(list(all_annexable_particles), key=len, reverse=True)
    
    # Create a single regex pattern to handle all annexations in one go.
    annexation_pattern = r'\b(\w{2,})\s+(' + '|'.join(sorted_all_annexable) + r')\b'
    text = re.sub(annexation_pattern, r'\1-\2', text)
    
    # Final cleanup for any remaining double spaces or trailing hyphens
    text = re.sub(r'\s+', ' ', text).strip()
    text = re.sub(r'-+', '-', text)
    
    return text

# --- Load the ASR model once at the beginning to avoid reloading on every request ---
print("Loading NeMo ASR model...")
try:
    asr_model = nemo_asr.models.EncDecRNNTBPEModel.from_pretrained("nvidia/stt_kab_conformer_transducer_large")
    print("NeMo ASR model loaded successfully.")
except Exception as e:
    print(f"Error loading NeMo ASR model: {e}")
    print("Please check your internet connection and ensure nemo_toolkit[asr] is correctly installed.")
    asr_model = None

@app.route('/transcribe', methods=['POST'])
def transcribe():
    if asr_model is None:
        return jsonify({"error": "ASR model is not loaded."}), 503

    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    audio_file = request.files['audio']
    if audio_file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    temp_input_file = None
    processed_file_path = None
    try:
        # Save the uploaded file to a temporary location
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_audio:
            audio_file.save(tmp_audio.name)
            temp_input_file = tmp_audio.name

        try:
            # The model requires the audio to be in a specific format (16kHz mono).
            input_audio = AudioSegment.from_file(temp_input_file)
            processed_audio = input_audio.set_frame_rate(16000).set_channels(1)

            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as processed_tmp:
                processed_audio.export(processed_tmp.name, format="wav")
                processed_file_path = processed_tmp.name
        except Exception as audio_e:
            print(f"Error during audio processing with pydub: {audio_e}", file=sys.stderr)
            return jsonify({"error": "Failed to process audio file. Please ensure it's a valid audio format."}), 500

        try:
            # Transcribe the processed file using the loaded model
            transcription_list = asr_model.transcribe([processed_file_path])
        except Exception as asr_e:
            print(f"Error during transcription with NeMo model: {asr_e}", file=sys.stderr)
            return jsonify({"error": "Transcription failed due to a model error."}), 500

        if transcription_list and transcription_list[0] and hasattr(transcription_list[0], 'text'):
            raw_transcription = transcription_list[0].text
            final_transcription = post_process_kabyle_text(raw_transcription)
            
            return jsonify({"transcription": final_transcription})
        else:
            print("ASR model returned an empty, invalid, or unexpected transcription object.")
            return jsonify({"error": "Transcription failed. No text returned."}), 500

    except Exception as e:
        print(f"An unhandled server error occurred: {e}", file=sys.stderr)
        return jsonify({"error": "An internal server error occurred."}), 500
    finally:
        # Cleanup temporary files
        if temp_input_file and os.path.exists(temp_input_file):
            os.remove(temp_input_file)
        if processed_file_path and os.path.exists(processed_file_path):
            os.remove(processed_file_path)

if __name__ == '__main__':
    print("Starting Flask server...")
    print("Server running at http://127.0.0.1:5000")
    app.run(debug=True)
