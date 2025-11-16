// Main JavaScript file
/**
 * Meeting Intelligence MVP - Frontend JavaScript
 * Handles video upload, processing status, and chat interface
 */

// State management
const state = {
    currentSection: 'upload',
    selectedFile: null,
    transcriptId: null,
    isProcessing: false,
    isChatting: false
};

// DOM elements
const elements = {
    // Sections
    uploadSection: document.getElementById('upload-section'),
    processingSection: document.getElementById('processing-section'),
    chatSection: document.getElementById('chat-section'),
    
    // Upload
    uploadArea: document.getElementById('upload-area'),
    videoInput: document.getElementById('video-input'),
    fileInfo: document.getElementById('file-info'),
    fileName: document.getElementById('file-name'),
    fileSize: document.getElementById('file-size'),
    removeFileBtn: document.getElementById('remove-file'),
    processBtn: document.getElementById('process-btn'),
    
    // Processing
    processingStatus: document.getElementById('processing-status'),
    
    // Chat
    chatMessages: document.getElementById('chat-messages'),
    chatForm: document.getElementById('chat-form'),
    chatInput: document.getElementById('chat-input'),
    sendBtn: document.getElementById('send-btn'),
    viewTranscriptBtn: document.getElementById('view-transcript-btn'),
    
    // Modal
    transcriptModal: document.getElementById('transcript-modal'),
    transcriptContent: document.getElementById('transcript-content'),
    closeModalBtn: document.getElementById('close-modal')
};

// Utility functions
const utils = {
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    },
    
    showSection(sectionName) {
        Object.values(elements).forEach(el => {
            if (el && el.classList && el.classList.contains('section')) {
                el.classList.remove('active');
            }
        });
        
        const sectionMap = {
            'upload': elements.uploadSection,
            'processing': elements.processingSection,
            'chat': elements.chatSection
        };
        
        if (sectionMap[sectionName]) {
            sectionMap[sectionName].classList.add('active');
            state.currentSection = sectionName;
        }
    },
    
    showNotification(message, type = 'info') {
        // Simple notification system
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 2rem;
            right: 2rem;
            padding: 1rem 1.5rem;
            background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
            color: white;
            border-radius: 0.5rem;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            z-index: 9999;
            animation: slideInRight 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },
    
    createMessageElement(content, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user' : 'assistant'}`;
        
        messageDiv.innerHTML = `
            <div class="message-avatar">
                ${isUser ? `
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                ` : `
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M2 17L12 22L22 17" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M2 12L12 17L22 12" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                `}
            </div>
            <div class="message-content">
                ${utils.formatMessageContent(content)}
            </div>
        `;
        
        return messageDiv;
    },
    
    createTypingIndicator() {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message assistant typing';
        messageDiv.id = 'typing-indicator';
        
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M2 17L12 22L22 17" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M2 12L12 17L22 12" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <div class="message-content">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
        
        return messageDiv;
    },
    
    formatMessageContent(content) {
        // Convert markdown-like formatting to HTML
        let formatted = content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');
        
        // Wrap in paragraph tags
        formatted = '<p>' + formatted + '</p>';
        
        // Convert bullet points
        formatted = formatted.replace(/<p>- (.*?)<\/p>/g, '<li>$1</li>');
        if (formatted.includes('<li>')) {
            formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        }
        
        return formatted;
    }
};

// Upload functionality
const uploadHandlers = {
    init() {
        // File input change
        elements.videoInput.addEventListener('change', this.handleFileSelect.bind(this));
        
        // Drag and drop
        elements.uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        elements.uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        elements.uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        
        // Remove file
        elements.removeFileBtn.addEventListener('click', this.clearFile.bind(this));
        
        // Process button
        elements.processBtn.addEventListener('click', this.processVideo.bind(this));
    },
    
    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.setFile(file);
        }
    },
    
    handleDragOver(e) {
        e.preventDefault();
        elements.uploadArea.classList.add('dragover');
    },
    
    handleDragLeave(e) {
        e.preventDefault();
        elements.uploadArea.classList.remove('dragover');
    },
    
    handleDrop(e) {
        e.preventDefault();
        elements.uploadArea.classList.remove('dragover');
        
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('video/')) {
            this.setFile(file);
        } else {
            utils.showNotification('Please select a valid video file', 'error');
        }
    },
    
    setFile(file) {
        state.selectedFile = file;
        elements.fileName.textContent = file.name;
        elements.fileSize.textContent = utils.formatFileSize(file.size);
        elements.fileInfo.classList.remove('hidden');
        elements.processBtn.disabled = false;
    },
    
    clearFile() {
        state.selectedFile = null;
        elements.videoInput.value = '';
        elements.fileInfo.classList.add('hidden');
        elements.processBtn.disabled = true;
    },
    
    async processVideo() {
        if (!state.selectedFile || state.isProcessing) return;
        
        state.isProcessing = true;
        elements.processBtn.disabled = true;
        
        // Show processing section
        utils.showSection('processing');
        this.updateProcessingStatus('Uploading video...', 0);
        
        // Prepare form data
        const formData = new FormData();
        formData.append('video', state.selectedFile);
        
        try {
            // Simulate progress updates
            const progressInterval = this.simulateProgress();
            
            // Make request
            const response = await fetch('/process-video', {
                method: 'POST',
                body: formData
            });
            
            clearInterval(progressInterval);
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                state.transcriptId = data.transcript_id;
                this.updateProcessingStatus('Processing complete!', 4);
                
                setTimeout(() => {
                    utils.showSection('chat');
                    utils.showNotification('Video processed successfully!', 'success');
                }, 1000);
            } else {
                throw new Error(data.error || 'Processing failed');
            }
        } catch (error) {
            console.error('Processing error:', error);
            utils.showNotification(error.message || 'Failed to process video', 'error');
            utils.showSection('upload');
        } finally {
            state.isProcessing = false;
            elements.processBtn.disabled = false;
        }
    },
    
    simulateProgress() {
        let step = 1;
        const steps = [
            'Extracting audio from video...',
            'Transcribing with AI...',
            'Structuring transcript...',
            'Finalizing...'
        ];
        
        return setInterval(() => {
            if (step < steps.length) {
                this.updateProcessingStatus(steps[step], step + 1);
                step++;
            }
        }, 5000);
    },
    
    updateProcessingStatus(status, activeStep) {
        elements.processingStatus.textContent = status;
        
        // Update step indicators
        document.querySelectorAll('.step').forEach((stepEl, index) => {
            const stepNum = index + 1;
            stepEl.classList.remove('active', 'completed');
            
            if (stepNum < activeStep) {
                stepEl.classList.add('completed');
            } else if (stepNum === activeStep) {
                stepEl.classList.add('active');
            }
        });
    }
};

// Chat functionality
const chatHandlers = {
    init() {
        elements.chatForm.addEventListener('submit', this.handleSubmit.bind(this));
        elements.viewTranscriptBtn.addEventListener('click', this.viewTranscript.bind(this));
        
        // Suggestion chips
        document.querySelectorAll('.suggestion-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                elements.chatInput.value = e.target.textContent;
                elements.chatInput.focus();
            });
        });
    },
    
    async handleSubmit(e) {
        e.preventDefault();
        
        const query = elements.chatInput.value.trim();
        if (!query || state.isChatting) return;
        
        // Add user message
        this.addMessage(query, true);
        elements.chatInput.value = '';
        
        // Show typing indicator
        const typingIndicator = utils.createTypingIndicator();
        elements.chatMessages.appendChild(typingIndicator);
        this.scrollToBottom();
        
        state.isChatting = true;
        elements.sendBtn.disabled = true;
        
        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    transcript_id: state.transcriptId,
                    query: query
                })
            });
            
            const data = await response.json();
            
            // Remove typing indicator
            typingIndicator.remove();
            
            if (response.ok && data.success) {
                this.addMessage(data.answer, false);
            } else {
                throw new Error(data.error || 'Failed to get response');
            }
        } catch (error) {
            console.error('Chat error:', error);
            typingIndicator.remove();
            this.addMessage('Sorry, I encountered an error. Please try again.', false);
            utils.showNotification('Failed to get response', 'error');
        } finally {
            state.isChatting = false;
            elements.sendBtn.disabled = false;
            elements.chatInput.focus();
        }
    },
    
    addMessage(content, isUser) {
        const messageEl = utils.createMessageElement(content, isUser);
        elements.chatMessages.appendChild(messageEl);
        this.scrollToBottom();
    },
    
    scrollToBottom() {
        elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    },
    
    async viewTranscript() {
        if (!state.transcriptId) return;
        
        elements.transcriptModal.classList.add('active');
        elements.transcriptContent.innerHTML = '<p>Loading transcript...</p>';
        
        try {
            const response = await fetch(`/transcript/${state.transcriptId}`);
            const data = await response.json();
            
            if (response.ok && data.success) {
                elements.transcriptContent.innerHTML = utils.formatMessageContent(data.transcript);
            } else {
                throw new Error(data.error || 'Failed to load transcript');
            }
        } catch (error) {
            console.error('Transcript error:', error);
            elements.transcriptContent.innerHTML = '<p>Failed to load transcript.</p>';
            utils.showNotification('Failed to load transcript', 'error');
        }
    }
};

// Modal functionality
const modalHandlers = {
    init() {
        elements.closeModalBtn.addEventListener('click', this.closeModal.bind(this));
        elements.transcriptModal.addEventListener('click', (e) => {
            if (e.target === elements.transcriptModal) {
                this.closeModal();
            }
        });
    },
    
    closeModal() {
        elements.transcriptModal.classList.remove('active');
    }
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    uploadHandlers.init();
    chatHandlers.init();
    modalHandlers.init();
    
    console.log('Meeting Intelligence MVP initialized');
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);