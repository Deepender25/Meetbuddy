# Meeting Intelligence

Transform your meeting videos into professional, AI-powered summaries with speaker identification and intelligent analysis.

## Features

- **Video Upload & Processing**: Upload meeting videos (.mp4, .mov, .webm) up to 500MB
- **Speaker Diarization**: Automatically identify and label different speakers in meeting
- **AI-Powered Summaries**: Generate professional meeting summaries using Google's Gemini AI
- **Interactive Interface**: Clean, modern web interface with step-by-step guidance
- **Speaker Naming**: Easily identify speakers by name for personalized summaries
- **Export Options**: Copy summaries to clipboard or download as text files

## Technology Stack

- **Backend**: Python with Flask
- **AI Processing**: WhisperX for transcription and speaker diarization
- **Summarization**: Google Gemini API
- **Video Processing**: MoviePy with FFmpeg
- **Frontend**: HTML5, CSS3, and vanilla JavaScript
- **Design**: Professional responsive UI with modern animations

## Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.8+** - Download from [python.org](https://www.python.org/downloads/)
- **FFmpeg** - Required for video/audio processing
  - **macOS**: `brew install ffmpeg`
  - **Ubuntu/Debian**: `sudo apt update && sudo apt install ffmpeg`
  - **Windows**: Download from [ffmpeg.org](https://ffmpeg.org/download.html)
- **Git** - For cloning the repository

## Quick Start

### 1. Clone Repository

```bash
git clone <repository-url>
cd meeting-intelligence
```

### 2. Create Virtual Environment

```bash
python -m venv venv

# On Windows:
venv\Scripts\activate

# On macOS/Linux:
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Set Up Environment Variables

Create a `.env` file from the provided template:

```bash
cp .env.example .env
```

Edit the `.env` file and add your API keys:

```env
# Google Gemini API Key (free tier)
GEMINI_API_KEY=your_gemini_api_key_here

# Hugging Face Token for pyannote speaker diarization
HUGGING_FACE_TOKEN=your_hugging_face_token_here

# Flask Configuration
FLASK_ENV=development
SECRET_KEY=your_secret_key_here
```

### 5. Get Your API Keys

#### Google Gemini API Key (Free)
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and add it to your `.env` file

#### Hugging Face Token (Free)
1. Create an account at [Hugging Face](https://huggingface.co/join)
2. Go to [Settings > Access Tokens](https://huggingface.co/settings/tokens)
3. Click "New token"
4. Select "Read" access and create the token
5. Copy the token and add it to your `.env` file

### 6. Run the Application

```bash
flask run --host=0.0.0.0 --port=5000
```

Open your browser and navigate to: **http://127.0.0.1:5000**

## Usage Guide

### Step 1: Upload Your Meeting Video
1. Click "Choose video file" or drag and drop a video file
2. Supported formats: .mp4, .mov, .webm
3. Maximum file size: 500MB
4. Click "Upload & Analyze"

### Step 2: Processing
The application will:
- Extract audio from your video
- Transcribe speech to text
- Identify different speakers
- This typically takes 2-5 minutes depending on video length

### Step 3: Name Your Speakers
1. Review identified speakers and their first spoken sentences
2. Enter real names for each speaker
3. Click "Generate Summary"

### Step 4: Review and Export
1. View your AI-generated meeting summary
2. Copy to clipboard or download as a text file
3. Start over to analyze another meeting

## Project Structure

```
meeting-intelligence/
├── app.py                      # Main Flask application
├── requirements.txt            # Python dependencies
├── .env.example               # Environment variables template
├── prompts.py                 # Gemini AI prompt templates
├── README.md                  # This file
│
├── uploads/                   # Temporary storage
│   ├── videos/               # Uploaded video files
│   └── audio/                # Extracted audio files
│
├── static/                   # Frontend assets
│   ├── css/
│   │   └── style.css        # Main stylesheet
│   └── js/
│       └── main.js          # Frontend JavaScript
│
└── templates/
    └── index.html           # Main application UI
```

## API Endpoints

### POST /process-video
Processes uploaded video files for transcription and speaker diarization.

**Request:** Multipart form data with video file
**Response:** JSON with transcript and speaker information

```json
{
  "success": true,
  "transcript_text": "SPEAKER_00: Hello team...",
  "speakers": [
    {
      "label": "SPEAKER_00",
      "snippet": "Hello team, let's start the meeting."
    }
  ]
}
```

### POST /generate-summary
Generates an AI-powered meeting summary using the Gemini API.

**Request:** JSON with transcript and speaker mapping
**Response:** JSON with formatted summary

```json
{
  "success": true,
  "summary_markdown": "## 📝 Executive Summary\n..."
}
```

## Troubleshooting

### Common Issues

#### FFmpeg Not Found
**Error:** `FFmpeg not found in path`
**Solution:** Install FFmpeg and ensure it's in your system's PATH

#### Large File Uploads
**Error:** File upload fails
**Solution:**
- Check file size is under 500MB
- Ensure sufficient disk space
- Verify video file format is supported

#### WhisperX Model Download
**Error:** Model download fails on first run
**Solution:** Ensure a stable internet connection and sufficient disk space for models

#### API Key Issues
**Error:** Authentication failures
**Solution:** Verify your API keys are correctly set in the `.env` file

#### Memory Issues
**Error:** Processing fails on long videos
**Solution:**
- Try shorter video segments
- Close other applications to free memory
- Consider using a machine with more RAM

### Performance Tips

- **Video Length:** Shorter videos process faster
- **Audio Quality:** Clear audio improves transcription accuracy
- **Background Noise**: Minimal background noise yields better results
- **Internet Speed**: Required for model downloads and API calls

## Development

### Running in Development Mode

```bash
export FLASK_ENV=development
flask run --host=0.0.0.0 --port=5000 --debug
```

### Code Structure

- **app.py**: Main Flask application with API endpoints
- **prompts.py**: AI prompt templates for Gemini
- **static/js/main.js**: Frontend application logic and state management
- **static/css/style.css**: Professional styling and responsive design
- **templates/index.html**: Single-page application UI

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Production Deployment

### Environment Setup

1. Set production environment variables:
```env
FLASK_ENV=production
SECRET_KEY=your_secure_random_string
```

2. Use a production WSGI server:
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

### Security Considerations

- Use HTTPS in production
- Set strong secret keys
- Implement rate limiting
- Sanitize user inputs
- Monitor disk usage for uploaded files

### File Cleanup

The application automatically cleans up temporary files after processing. For production deployment, consider implementing:

- Scheduled cleanup of orphaned files
- Disk usage monitoring
- File retention policies

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

If you encounter any issues or have questions:

1. Check the troubleshooting section above
2. Review error logs in your console
3. Verify your API keys are correctly configured
4. Ensure all dependencies are properly installed

## Changelog

### Version 1.0.0
- Initial release
- Video upload and processing
- Speaker diarization with WhisperX
- AI-powered summaries with Gemini
- Professional web interface
- Export functionality

---

**Meeting Intelligence** - Powered by AI, Built for Productivity 🚀