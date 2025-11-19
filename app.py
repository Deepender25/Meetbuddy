# Main application file
"""
Flask application for Meeting Intelligence MVP.
Synchronous video processing with RAG-powered chat interface.
"""

import os
import logging
import uuid
from pathlib import Path
from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
import google.generativeai as genai

from processing_utils import get_processor, ProcessingError
from rag_utils import get_rag_pipeline
from prompts import RAG_PROMPT, FALLBACK_RESPONSE

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['MAX_CONTENT_LENGTH'] = int(os.getenv('MAX_VIDEO_SIZE_MB', 4096)) * 1024 * 1024
app.config['UPLOAD_FOLDER'] = os.getenv('UPLOAD_FOLDER', 'uploads')
app.config['PROCESSED_FOLDER'] = os.getenv('PROCESSED_FOLDER', 'processed_transcripts')

# Enable CORS
CORS(app)


@app.route('/')
def index():
    """Serve the main page."""
    return render_template('index.html')


@app.route('/process', methods=['POST'])
def process_video():
    """
    Handle video upload and processing.
    """
    if 'video' not in request.files:
        return jsonify({'success': False, 'error': 'No video file provided'}), 400
    
    video_file = request.files['video']
    if video_file.filename == '':
        return jsonify({'success': False, 'error': 'No selected file'}), 400
        
    try:
        # Save uploaded file
        filename = secure_filename(video_file.filename)
        video_path = Path(app.config['UPLOAD_FOLDER']) / filename
        video_file.save(video_path)
        
        # Process video
        processor = get_processor()
        
        # Extract audio
        audio_path = video_path.with_suffix('.wav')
        processor.extract_audio(video_path, audio_path)
        
        # Transcribe
        transcript_text = processor.transcribe_audio(audio_path)
        
        # Structure
        structured_transcript = processor.structure_transcript(transcript_text)
        
        # Save transcript
        transcript_id = str(uuid.uuid4())
        transcript_path = Path(app.config['PROCESSED_FOLDER']) / f"{transcript_id}.txt"
        with open(transcript_path, 'w', encoding='utf-8') as f:
            f.write(structured_transcript)
            
        # Cleanup
        processor.cleanup_temp_files(video_path, audio_path)
        
        return jsonify({
            'success': True,
            'transcript_id': transcript_id,
            'message': 'Video processed successfully'
        })
        
    except ProcessingError as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    except Exception as e:
        logger.error(f"Processing error: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': 'Internal server error'}), 500


@app.route('/chat', methods=['POST'])
def chat():
    """
    Handle chat queries about the processed video.
    """
    try:
        data = request.get_json()
        transcript_id = data.get('transcript_id')
        query = data.get('query')
        
        if not transcript_id or not query:
            return jsonify({
                'success': False,
                'error': 'Missing transcript_id or query'
            }), 400
            
        # Get transcript
        transcript_path = Path(app.config['PROCESSED_FOLDER']) / f"{transcript_id}.txt"
        if not transcript_path.exists():
            return jsonify({
                'success': False,
                'error': 'Transcript not found'
            }), 404
            
        with open(transcript_path, 'r', encoding='utf-8') as f:
            transcript_text = f.read()
            
        # Get RAG pipeline
        rag = get_rag_pipeline()
        
        # Create vector store (in-memory for MVP)
        chunks = rag.chunk_text(transcript_text)
        index, _ = rag.create_vector_store(chunks)
        
        # Get context
        context = rag.get_context_for_query(index, chunks, query)
        
        if not context:
            logger.warning("No relevant context found for query")
            return jsonify({
                'success': True,
                'answer': FALLBACK_RESPONSE
            })
        
        # Generate answer using Gemini
        logger.info("Generating answer with Gemini")
        prompt = RAG_PROMPT.format(context=context, query=query)
        
        model = genai.GenerativeModel('gemini-flash-latest')
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.4,
                top_p=0.8,
                top_k=40,
                max_output_tokens=1024,
            )
        )
        
        answer = response.text.strip() if response.text else FALLBACK_RESPONSE
        
        logger.info(f"Answer generated successfully ({len(answer)} characters)")
        
        return jsonify({
            'success': True,
            'answer': answer,
            'transcript_id': transcript_id
        })
        
    except Exception as e:
        logger.error(f"Chat error: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Failed to generate answer',
            'message': str(e)
        }), 500


@app.route('/transcript/<transcript_id>', methods=['GET'])
def get_transcript(transcript_id):
    """
    Retrieve the full structured transcript.
    """
    try:
        transcript_path = Path(app.config['PROCESSED_FOLDER']) / f"{transcript_id}.txt"
        
        if not transcript_path.exists():
            return jsonify({
                'success': False,
                'error': 'Transcript not found'
            }), 404
        
        with open(transcript_path, 'r', encoding='utf-8') as f:
            transcript_text = f.read()
        
        return jsonify({
            'success': True,
            'transcript_id': transcript_id,
            'transcript': transcript_text
        })
        
    except Exception as e:
        logger.error(f"Error retrieving transcript: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve transcript'
        }), 500


@app.errorhandler(413)
def too_large(e):
    """Handle file too large error."""
    max_size = app.config['MAX_CONTENT_LENGTH'] / (1024 * 1024)
    return jsonify({
        'success': False,
        'error': f'File too large. Maximum size is {max_size} MB'
    }), 413


@app.errorhandler(500)
def internal_error(e):
    """Handle internal server error."""
    logger.error(f"Internal server error: {str(e)}")
    return jsonify({
        'success': False,
        'error': 'Internal server error'
    }), 500


if __name__ == '__main__':
    # Ensure required directories exist
    Path(app.config['UPLOAD_FOLDER']).mkdir(exist_ok=True)
    Path(app.config['PROCESSED_FOLDER']).mkdir(exist_ok=True)
    
    # Run Flask app
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV') == 'development'
    
    logger.info(f"Starting Flask application on port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)