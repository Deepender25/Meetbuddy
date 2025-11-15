import os
import json
import uuid
import time
from datetime import datetime
from werkzeug.utils import secure_filename
from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
import whisperx
import google.generativeai as genai
from moviepy.editor import VideoFileClip
from prompts import MASTER_PROMPT_TEMPLATE

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configuration
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB max file size
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['ALLOWED_EXTENSIONS'] = {'mp4', 'mov', 'webm'}

# Ensure upload directories exist
os.makedirs('uploads/videos', exist_ok=True)
os.makedirs('uploads/audio', exist_ok=True)

# Initialize Gemini
try:
    genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
    gemini_model = genai.GenerativeModel('gemini-pro')
except Exception as e:
    print(f"Warning: Failed to initialize Gemini: {e}")

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def extract_audio_from_video(video_path, audio_path):
    """Extract audio from video file using moviepy"""
    try:
        video = VideoFileClip(video_path)
        video.audio.write_audiofile(
            audio_path,
            codec='pcm_s16le',
            ffmpeg_params=['-ar', '16000']  # Set sample rate to 16kHz
        )
        video.close()
        return True
    except Exception as e:
        print(f"Error extracting audio: {e}")
        return False

def process_transcription_and_diarization(audio_path):
    """Process audio with whisperX for transcription and speaker diarization"""
    try:
        # Load whisperX model
        device = "cuda" if os.getenv("WHISPER_DEVICE", "cpu") == "cuda" else "cpu"
        model = whisperx.load_model("base.en", device=device)

        # Transcribe audio
        result = model.transcribe(audio_path)

        # Align words
        model_a, metadata = whisperx.load_align_model(language_code="en", device=device)
        result = whisperx.align(result["segments"], model_a, metadata, audio_path, device)

        # Diarize (if Hugging Face token is available)
        diarize_model = None
        if os.getenv('HUGGING_FACE_TOKEN'):
            try:
                diarize_model = whisperx.DiarizationModel(use_auth_token=os.getenv('HUGGING_FACE_TOKEN'), device=device)
                diarize_segments = diarize_model(audio_path)
                result = whisperx.assign_word_speakers(diarize_segments, result)
            except Exception as e:
                print(f"Warning: Diarization failed: {e}")
                # Continue without diarization

        return result
    except Exception as e:
        print(f"Error in transcription/diarization: {e}")
        return None

def extract_speaker_info(transcription_result):
    """Extract unique speakers and their first sentences"""
    speakers = {}
    transcript_lines = []

    if not transcription_result or 'segments' not in transcription_result:
        return speakers, ""

    for segment in transcription_result['segments']:
        speaker = segment.get('speaker', 'SPEAKER_UNKNOWN')
        text = segment.get('text', '').strip()

        if text:
            # Add to transcript
            transcript_lines.append(f"{speaker}: {text}")

            # Extract first sentence for each speaker
            if speaker not in speakers:
                # Get first sentence (split by common sentence terminators)
                sentences = [s.strip() for s in text.replace('.', '. ').replace('!', '! ').replace('?', '? ').split('. ') if s.strip()]
                first_sentence = sentences[0] if sentences else text[:100] + "..." if len(text) > 100 else text
                speakers[speaker] = {
                    'label': speaker,
                    'snippet': first_sentence[:100] + "..." if len(first_sentence) > 100 else first_sentence
                }

    transcript_text = '\n'.join(transcript_lines)
    return list(speakers.values()), transcript_text

@app.route('/')
def index():
    """Serve the main application page"""
    return render_template('index.html')

@app.route('/process-video', methods=['POST'])
def process_video():
    """Process uploaded video file for transcription and diarization"""
    try:
        # Check if file is in request
        if 'video' not in request.files:
            return jsonify({'success': False, 'error': 'No video file provided'}), 400

        file = request.files['video']

        if file.filename == '':
            return jsonify({'success': False, 'error': 'No file selected'}), 400

        if not allowed_file(file.filename):
            return jsonify({'success': False, 'error': 'Invalid file type. Allowed: mp4, mov, webm'}), 400

        # Generate unique filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        video_filename = f"{timestamp}_{secure_filename(file.filename)}"
        audio_filename = f"{timestamp}.wav"

        video_path = os.path.join('uploads/videos', video_filename)
        audio_path = os.path.join('uploads/audio', audio_filename)

        # Save video file
        file.save(video_path)

        # Extract audio
        if not extract_audio_from_video(video_path, audio_path):
            return jsonify({'success': False, 'error': 'Failed to extract audio from video'}), 500

        # Process transcription and diarization
        transcription_result = process_transcription_and_diarization(audio_path)

        if transcription_result is None:
            return jsonify({'success': False, 'error': 'Transcription failed'}), 500

        # Extract speaker information and transcript
        speakers, transcript_text = extract_speaker_info(transcription_result)

        # Clean up temporary files
        try:
            os.remove(video_path)
            os.remove(audio_path)
        except:
            pass

        return jsonify({
            'success': True,
            'transcript_text': transcript_text,
            'speakers': speakers
        })

    except Exception as e:
        print(f"Error in process_video: {e}")
        return jsonify({'success': False, 'error': 'An unexpected error occurred during processing'}), 500

@app.route('/generate-summary', methods=['POST'])
def generate_summary():
    """Generate meeting summary using Gemini API"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400

        transcript_text = data.get('transcript_text', '').strip()
        speaker_mapping = data.get('speaker_mapping', {})

        if not transcript_text:
            return jsonify({'success': False, 'error': 'Transcript text is required'}), 400

        if not speaker_mapping:
            return jsonify({'success': False, 'error': 'Speaker mapping is required'}), 400

        # Format speaker mapping for prompt
        formatted_mapping = '\n'.join([f"- {speaker}: {name}" for speaker, name in speaker_mapping.items()])

        # Create prompt using template
        prompt = MASTER_PROMPT_TEMPLATE.format(
            transcript_text=transcript_text,
            speaker_mapping=formatted_mapping
        )

        # Generate summary using Gemini
        try:
            response = gemini_model.generate_content(prompt)
            summary_markdown = response.text
        except Exception as e:
            print(f"Gemini API error: {e}")
            return jsonify({'success': False, 'error': 'Failed to generate summary with AI service'}), 500

        return jsonify({
            'success': True,
            'summary_markdown': summary_markdown
        })

    except Exception as e:
        print(f"Error in generate_summary: {e}")
        return jsonify({'success': False, 'error': 'An unexpected error occurred while generating summary'}), 500

@app.errorhandler(413)
def too_large(e):
    """Handle file too large error"""
    return jsonify({'success': False, 'error': 'File too large. Maximum size is 500MB'}), 413

@app.errorhandler(404)
def not_found(e):
    """Handle 404 errors"""
    return jsonify({'success': False, 'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(e):
    """Handle 500 errors"""
    return jsonify({'success': False, 'error': 'Internal server error'}), 500

if __name__ == '__main__':
    # Check for required environment variables
    if not os.getenv('GEMINI_API_KEY'):
        print("Warning: GEMINI_API_KEY not set in environment variables")

    if not os.getenv('HUGGING_FACE_TOKEN'):
        print("Warning: HUGGING_FACE_TOKEN not set. Speaker diarization may not work properly")

    # Run the Flask app
    app.run(host='0.0.0.0', port=5000, debug=True)