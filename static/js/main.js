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
            if (el && el.classList && el.classList.contains('view-section')) {
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
        // Modern notification system
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        // Dynamic colors based on type
        let bg = 'rgba(59, 130, 246, 0.9)'; // info blue
        if (type === 'success') bg = 'rgba(16, 185, 129, 0.9)'; // success green
        if (type === 'error') bg = 'rgba(239, 68, 68, 0.9)'; // error red

        notification.style.cssText = `
            position: fixed;
            top: 2rem;
            right: 2rem;
            padding: 1rem 1.5rem;
            background: ${bg};
            backdrop-filter: blur(8px);
            color: white;
            border-radius: 1rem;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
            z-index: 9999;
            font-weight: 500;
            border: 1px solid rgba(255, 255, 255, 0.1);
            animation: slideInRight 0.3s ease-out;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },

    createMessageElement(content, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user' : 'system-message'}`;

        messageDiv.innerHTML = `
            <div class="avatar ${isUser ? '' : 'system-avatar'}">
                ${isUser ? `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                ` : `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                `}
            </div>
            <div class="bubble ${isUser ? '' : 'system-bubble'}">
                ${utils.formatMessageContent(content)}
            </div>
        `;

        return messageDiv;
    },

    createTypingIndicator() {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message system-message typing';
        messageDiv.id = 'typing-indicator';

        messageDiv.innerHTML = `
            <div class="avatar system-avatar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <div class="bubble system-bubble">
                <div style="display: flex; gap: 4px; padding: 4px 0;">
                    <div style="width: 6px; height: 6px; background: #94a3b8; border-radius: 50%; animation: typing 1.4s infinite;"></div>
                    <div style="width: 6px; height: 6px; background: #94a3b8; border-radius: 50%; animation: typing 1.4s infinite 0.2s;"></div>
                    <div style="width: 6px; height: 6px; background: #94a3b8; border-radius: 50%; animation: typing 1.4s infinite 0.4s;"></div>
                </div>
            </div>
        `;

        // Add keyframes if not exists
        if (!document.getElementById('typing-keyframes')) {
            const style = document.createElement('style');
            style.id = 'typing-keyframes';
            style.textContent = `
                @keyframes typing {
                    0%, 60%, 100% { transform: translateY(0); }
                    30% { transform: translateY(-4px); }
                }
            `;
            document.head.appendChild(style);
        }

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

        // Click to upload
        elements.uploadArea.addEventListener('click', () => elements.videoInput.click());

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

    clearFile(e) {
        if (e) e.stopPropagation(); // Prevent triggering upload area click
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

        try {
            const formData = new FormData();
            formData.append('video', state.selectedFile);

            this.updateProcessingStatus('Uploading and processing video... This may take a while.', 0);

            const response = await fetch('/process', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok && data.success) {
                state.transcriptId = data.transcript_id;
                this.updateProcessingStatus('Processing complete!', 100);
                utils.showNotification('Video processed successfully', 'success');

                // Switch to chat
                setTimeout(() => {
                    utils.showSection('chat');
                    state.isProcessing = false;
                    elements.processBtn.disabled = false;
                }, 1000);
            } else {
                throw new Error(data.error || 'Processing failed');
            }
        } catch (error) {
            console.error('Processing error:', error);
            this.updateProcessingStatus('Error: ' + error.message, 0);
            utils.showNotification(error.message, 'error');
            state.isProcessing = false;
            elements.processBtn.disabled = false;

            // Go back to upload after error
            setTimeout(() => {
                utils.showSection('upload');
            }, 3000);
        }
    },

    updateProcessingStatus(message, progress) {
        if (elements.processingStatus) {
            elements.processingStatus.textContent = message;
        }

        // Update timeline steps based on message content (simple heuristic)
        const steps = document.querySelectorAll('.step-item');
        steps.forEach(s => s.classList.remove('active'));

        if (message.includes('Uploading')) steps[0].classList.add('active');
        else if (message.includes('Transcribing')) steps[1].classList.add('active');
        else if (message.includes('Structuring') || message.includes('Analyzing')) steps[2].classList.add('active');
        else if (message.includes('complete')) steps[3].classList.add('active');
        else steps[0].classList.add('active'); // Default
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