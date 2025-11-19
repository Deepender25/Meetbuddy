import React, { useState } from 'react';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import Layout from './components/Layout';
import UploadSection from './components/UploadSection';
import ProcessingStatus from './components/ProcessingStatus';
import ChatInterface from './components/ChatInterface';
import TranscriptModal from './components/TranscriptModal';

function App() {
  const [view, setView] = useState('upload'); // 'upload', 'processing', 'chat'
  const [transcriptId, setTranscriptId] = useState(null);
  const [processingStatus, setProcessingStatus] = useState('');
  const [messages, setMessages] = useState([]);
  const [isChatTyping, setIsChatTyping] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transcriptText, setTranscriptText] = useState(null);
  const [isTranscriptLoading, setIsTranscriptLoading] = useState(false);

  const handleUploadStart = async (file) => {
    setView('processing');
    setProcessingStatus('Uploading video...');

    const formData = new FormData();
    formData.append('video', file);

    try {
      // Simulate progress steps for better UX since backend is synchronous
      const progressInterval = setInterval(() => {
        setProcessingStatus(prev => {
          if (prev.includes('Uploading')) return 'Transcribing audio...';
          if (prev.includes('Transcribing')) return 'Structuring data...';
          if (prev.includes('Structuring')) return 'Finalizing...';
          return prev;
        });
      }, 5000);

      const response = await axios.post('/process', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      clearInterval(progressInterval);

      if (response.data.success) {
        setTranscriptId(response.data.transcript_id);
        setProcessingStatus('Processing complete!');
        setTimeout(() => {
          setView('chat');
        }, 1000);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setProcessingStatus('Error processing video. Please try again.');
      setTimeout(() => {
        setView('upload');
      }, 3000);
    }
  };

  const handleSendMessage = async (text) => {
    setMessages(prev => [...prev, { content: text, isUser: true }]);
    setIsChatTyping(true);

    try {
      const response = await axios.post('/chat', {
        transcript_id: transcriptId,
        query: text
      });

      if (response.data.success) {
        setMessages(prev => [...prev, { content: response.data.answer, isUser: false }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { content: "Sorry, I encountered an error. Please try again.", isUser: false }]);
    } finally {
      setIsChatTyping(false);
    }
  };

  const handleViewTranscript = async () => {
    setIsModalOpen(true);
    if (!transcriptText) {
      setIsTranscriptLoading(true);
      try {
        const response = await axios.get(`/transcript/${transcriptId}`);
        if (response.data.success) {
          setTranscriptText(response.data.transcript);
        }
      } catch (error) {
        console.error('Transcript error:', error);
        setTranscriptText('Failed to load transcript.');
      } finally {
        setIsTranscriptLoading(false);
      }
    }
  };

  const handleReset = () => {
    setView('upload');
    setTranscriptId(null);
    setMessages([]);
    setTranscriptText(null);
  };

  return (
    <Layout>
      <AnimatePresence mode="wait">
        {view === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <UploadSection onUploadStart={handleUploadStart} />
          </motion.div>
        )}

        {view === 'processing' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.3 }}
          >
            <ProcessingStatus status={processingStatus} />
          </motion.div>
        )}

        {view === 'chat' && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ChatInterface
              onSendMessage={handleSendMessage}
              messages={messages}
              isTyping={isChatTyping}
              onReset={handleReset}
              onViewTranscript={handleViewTranscript}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <TranscriptModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        transcript={transcriptText}
        isLoading={isTranscriptLoading}
      />
    </Layout>
  );
}

export default App;
