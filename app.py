# Main application file
"""
Flask application for Meeting Intelligence MVP.
Synchronous video processing with RAG-powered chat interface.
"""

import os
import logging
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
app.config['MAX_CONTENT_LENGTH'] = int(os.getenv('MAX_VIDEO_SIZE_MB', 100)) * 1024 * 1024
app.config['UPLOAD_FOLDER'] = os.getenv('UPLOAD_FOLDER', 'uploads')
app.config['PROCESSED_FOLDER'] = os.getenv('PROCESSED_FOLDER', 'processed_transcripts')

# Enable CORS
CORS(app)

# Allowed file extensions
ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv', 'webm', 'flv'}

# Configure Gemini
genai.configure(api_key=os.getenv('GEMINI_API_KEY'))

# In-memory storage for vector stores (transcript_id -> (index, chunks))
vector_stores = {}


def allowed_file(filename: str) -> bool:
    """Check if file extension is allowed."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/')
def index():
    """Serve the main application page."""
    return render_template('index.html')


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'service': 'Meeting Intelligence MVP',
        'version': '1.0.0'
    })


@app.route('/process-video', methods=['POST'])
def process_video():
    """
    Main processing endpoint - handles the entire pipeline synchronously.
    This is a long-running request that blocks until processing is complete.
    """
    logger.info("Received video processing request")
    
    # Validate request
    if 'video' not in request.files:
        logger.warning("No video file in request")
        return jsonify({'success': False, 'error': 'No video file provided'}), 400
    
    file = request.files['video']
    
    if file.filename == '':
        logger.warning("Empty filename")
        return jsonify({'success': False, 'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        logger.warning(f"Invalid file type: {file.filename}")
        return jsonify({
            'success': False,
            'error': f'Invalid file type. Allowed types: {", ".join(ALLOWED_EXTENSIONS)}'
        }), 400
    
    try:
        # Save uploaded file
        filename = secure_filename(file.filename)
        upload_folder = Path(app.config['UPLOAD_FOLDER'])
        upload_folder.mkdir(exist_ok=True)
        
        # Create unique filename
        import uuid
        unique_filename = f"{uuid.uuid4()}_{filename}"
        file_path = upload_folder / unique_filename
        
        logger.info(f"Saving uploaded file: {unique_filename}")
        file.save(str(file_path))
        
        file_size_mb = file_path.stat().st_size / (1024 * 1024)
        logger.info(f"File saved successfully ({file_size_mb:.2f} MB)")
        
        # Run processing pipeline (this blocks until complete)
        logger.info("Starting processing pipeline...")
        processor = get_processor()
        result = processor.run_processing_pipeline(str(file_path))
        
        logger.info(f"Processing completed successfully: {result['transcript_id']}")
        
        return jsonify(result), 200
        
    except ProcessingError as e:
        logger.error(f"Processing error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Failed to process video. Please try again with a shorter video.'
        }), 500
        
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': 'An unexpected error occurred. Please try again.'
        }), 500


@app.route('/chat', methods=['POST'])
def chat():
    """
    Handle chat queries using RAG pipeline.
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        transcript_id = data.get('transcript_id')
        query = data.get('query')
        
        if not transcript_id or not query:
            return jsonify({
                'success': False,
                'error': 'Missing transcript_id or query'
            }), 400
        
        logger.info(f"Chat request for transcript {transcript_id}: {query[:50]}...")
        
        # Load transcript
        transcript_path = Path(app.config['PROCESSED_FOLDER']) / f"{transcript_id}.txt"
        
        if not transcript_path.exists():
            logger.error(f"Transcript not found: {transcript_id}")
            return jsonify({
                'success': False,
                'error': 'Transcript not found'
            }), 404
        
        with open(transcript_path, 'r', encoding='utf-8') as f:
            transcript_text = f.read()
        
        # Get or create vector store for this transcript
        if transcript_id not in vector_stores:
            logger.info(f"Creating vector store for transcript {transcript_id}")
            rag = get_rag_pipeline()
            chunks = rag.chunk_text(transcript_text)
            index, chunks = rag.create_vector_store(chunks)
            vector_stores[transcript_id] = (index, chunks)
            logger.info(f"Vector store created with {len(chunks)} chunks")
        else:
            logger.info(f"Using cached vector store for transcript {transcript_id}")
        
        # Retrieve context
        index, chunks = vector_stores[transcript_id]
        rag = get_rag_pipeline()
        context = rag.get_context_for_query(index, chunks, query, top_k=3)
        
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