# Meetbuddy - Meeting Intelligence MVP

A streamlined web application that transforms meeting video recordings into structured transcripts with an AI-powered chat interface for querying meeting content.

## ⚠️ Important Limitations

**This is a synchronous MVP version** designed for:
- **Short videos only** (5-10 minutes maximum recommended)
- **Proof-of-concept and testing purposes**
- **Single-user scenarios**

**Key constraints:**
- Processing happens in a single HTTP request
- Users MUST keep their browser window open during processing
- Longer videos will likely cause server timeouts
- Not suitable for production use with longer meetings

For production deployments with longer videos, implement the asynchronous version with Celery/Redis.

## 🚀 Features

- **Video Upload**: Support for multiple video formats (MP4, AVI, MOV, MKV, WebM, FLV)
- **Audio Extraction**: Automatic audio extraction using FFmpeg
- **AI Transcription**: High-accuracy speech-to-text using OpenAI Whisper
- **Smart Structuring**: AI-powered transcript organization with Gemini
- **RAG-Powered Chat**: Ask questions about meeting content with semantic search
- **Modern UI**: Clean, responsive interface with real-time feedback

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.10 or higher**
- **FFmpeg** (for audio extraction)
- **Gemini API Key** (from Google AI Studio)

### Installing FFmpeg

**macOS:**
```bash
brew install ffmpeg
