"""
Video processing utilities for the synchronous pipeline.
Handles video upload, audio extraction, transcription, and AI structuring.
"""

import os
import uuid
import subprocess
import logging
from pathlib import Path
from typing import Optional, Dict, Any
import whisper
import google.generativeai as genai
from dotenv import load_dotenv
from prompts import STRUCTURING_PROMPT
from rag_utils import get_rag_pipeline

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

genai.configure(api_key=os.getenv('GEMINI_API_KEY'))


class ProcessingError(Exception):
    """Custom exception for processing errors."""
    pass


class VideoProcessor:
    """Handles the complete video processing pipeline."""
    
    def __init__(
        self,
        upload_folder: str = "uploads",
        processed_folder: str = "processed_transcripts",
        whisper_model: str = "base"
    ):
        """
        Initialize the video processor.
        
        Args:
            upload_folder: Folder for temporary video/audio files
            processed_folder: Folder for final transcripts
            whisper_model: Whisper model size (tiny, base, small, medium, large)
        """
        self.upload_folder = Path(upload_folder)
        self.processed_folder = Path(processed_folder)
        self.whisper_model_name = whisper_model
        
        self.upload_folder.mkdir(exist_ok=True)
        self.processed_folder.mkdir(exist_ok=True)
        
        logger.info(f"Loading Whisper model: {whisper_model}")
        self.whisper_model = whisper.load_model(whisper_model)
        logger.info("Whisper model loaded successfully")
        
        self.gemini_model = genai.GenerativeModel('gemini-flash-latest')
        logger.info("Gemini model initialized")
    
    def extract_audio(self, video_path: Path, audio_path: Path) -> None:
        """
        Extract audio from video file using FFmpeg.
        
        Args:
            video_path: Path to input video file
            audio_path: Path to output audio file
            
        Raises:
            ProcessingError: If audio extraction fails
        """
        logger.info(f"Extracting audio from {video_path.name}")
        
        try:
            command = [
                'ffmpeg',
                '-i', str(video_path),
                '-vn',
                '-acodec', 'pcm_s16le',
                '-ar', '16000',
                '-ac', '1',
                '-y',
                str(audio_path)
            ]
            
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                check=True
            )
            
            if not audio_path.exists() or audio_path.stat().st_size == 0:
                raise ProcessingError("Audio extraction produced empty file")
            
            logger.info(f"Audio extracted successfully: {audio_path.name} ({audio_path.stat().st_size / 1024:.2f} KB)")
            
        except subprocess.CalledProcessError as e:
            logger.error(f"FFmpeg error: {e.stderr}")
            raise ProcessingError(f"Failed to extract audio: {e.stderr}")
        except Exception as e:
            logger.error(f"Unexpected error during audio extraction: {str(e)}")
            raise ProcessingError(f"Audio extraction failed: {str(e)}")
    
    def transcribe_audio(self, audio_path: Path) -> str:
        """
        Transcribe audio file using Whisper.
        
        Args:
            audio_path: Path to audio file
            
        Returns:
            Raw transcript text
            
        Raises:
            ProcessingError: If transcription fails
        """
        logger.info(f"Transcribing audio: {audio_path.name}")
        
        try:
            result = self.whisper_model.transcribe(
                str(audio_path),
                language='en',
                task='transcribe',
                verbose=False
            )
            
            transcript = result['text'].strip()
            
            if not transcript:
                raise ProcessingError("Transcription produced empty text")
            
            logger.info(f"Transcription completed: {len(transcript)} characters")
            return transcript
            
        except Exception as e:
            logger.error(f"Transcription error: {str(e)}")
            raise ProcessingError(f"Failed to transcribe audio: {str(e)}")
    
    def structure_transcript(self, raw_transcript: str, max_retries: int = 3) -> str:
        """
        Structure raw transcript using Gemini AI.
        
        Args:
            raw_transcript: Raw transcript text
            max_retries: Maximum number of retry attempts
            
        Returns:
            Structured transcript
            
        Raises:
            ProcessingError: If structuring fails
        """
        logger.info("Structuring transcript with Gemini AI")
        
        prompt = STRUCTURING_PROMPT.format(transcript=raw_transcript)
        
        for attempt in range(max_retries):
            try:
                response = self.gemini_model.generate_content(
                    prompt,
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.3,
                        top_p=0.8,
                        top_k=40,
                        max_output_tokens=4096,
                    )
                )
                
                if not response.text:
                    raise ProcessingError("Gemini returned empty response")
                
                structured_text = response.text.strip()
                logger.info(f"Transcript structured successfully: {len(structured_text)} characters")
                return structured_text
                
            except Exception as e:
                logger.warning(f"Structuring attempt {attempt + 1} failed: {str(e)}")
                if attempt == max_retries - 1:
                    logger.error("All structuring attempts failed")
                    raise ProcessingError(f"Failed to structure transcript after {max_retries} attempts: {str(e)}")
        
        raise ProcessingError("Unexpected error in transcript structuring")
    
    def cleanup_temp_files(self, *file_paths: Path) -> None:
        """
        Clean up temporary files.
        
        Args:
            *file_paths: Paths to files to delete
        """
        for file_path in file_paths:
            try:
                if file_path.exists():
                    file_path.unlink()
                    logger.info(f"Deleted temporary file: {file_path}")
            except Exception as e:
                logger.warning(f"Failed to delete {file_path}: {str(e)}")


# Global video processor instance
_processor = None


def get_processor() -> VideoProcessor:
    """Get or create the global video processor instance."""
    global _processor
    if _processor is None:
        upload_folder = os.getenv("UPLOAD_FOLDER", "uploads")
        processed_folder = os.getenv("PROCESSED_FOLDER", "processed_transcripts")
        whisper_model = os.getenv("WHISPER_MODEL", "base")
        _processor = VideoProcessor(upload_folder, processed_folder, whisper_model)
    return _processor