// Meeting Intelligence - Main Application JavaScript

class MeetingIntelligenceApp {
    constructor() {
        this.currentTranscript = '';
        this.currentSpeakers = [];
        this.speakerMapping = {};
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.showState(1); // Start with upload state
    }

    // State Management
    showState(stateNumber) {
        const states = document.querySelectorAll('.state');
        states.forEach(state => state.classList.remove('active'));

        const targetState = document.getElementById(`state-${stateNumber}-state`);
        if (targetState) {
            targetState.classList.add('active');
        }
    }

    showStateById(stateId) {
        const states = document.querySelectorAll('.state');
        states.forEach(state => state.classList.remove('active'));

        const targetState = document.getElementById(stateId);
        if (targetState) {
            targetState.classList.add('active');
        }
    }

    showError(message) {
        document.getElementById('error-message').textContent = message;
        this.showStateById('error-state');
    }

    // Event Listeners Setup
    setupEventListeners() {
        // File input handling
        const videoInput = document.getElementById('video-input');
        const uploadButton = document.getElementById('upload-button');

        videoInput.addEventListener('change', () => {
            const fileName = videoInput.files[0]?.name || 'Choose video file';
            const labelText = document.querySelector('.file-input-text');
            labelText.textContent = fileName;

            // Enable/disable upload button
            uploadButton.disabled = !videoInput.files[0];
        });

        // Upload form submission
        document.getElementById('upload-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleVideoUpload();
        });

        // Generate summary button
        document.getElementById('generate-summary-button').addEventListener('click', () => {
            this.generateSummary();
        });

        // Back/Start Over buttons
        document.getElementById('back-to-upload').addEventListener('click', () => {
            this.resetToUpload();
        });

        document.getElementById('start-over').addEventListener('click', () => {
            this.resetToUpload();
        });

        document.getElementById('retry-button').addEventListener('click', () => {
            this.resetToUpload();
        });

        // Copy summary button
        document.getElementById('copy-summary').addEventListener('click', () => {
            this.copySummaryToClipboard();
        });

        // Download summary button
        document.getElementById('download-summary').addEventListener('click', () => {
            this.downloadSummaryAsText();
        });
    }

    // Video Upload and Processing
    async handleVideoUpload() {
        const fileInput = document.getElementById('video-input');
        const file = fileInput.files[0];

        if (!file) {
            this.showError('Please select a video file first.');
            return;
        }

        // Validate file size (500MB limit)
        const maxSize = 500 * 1024 * 1024; // 500MB in bytes
        if (file.size > maxSize) {
            this.showError('File size exceeds 500MB limit. Please choose a smaller file.');
            return;
        }

        this.showState(2); // Show processing state
        this.animateProgress();

        const formData = new FormData();
        formData.append('video', file);

        try {
            const response = await fetch('/process-video', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.currentTranscript = result.transcript_text;
                this.currentSpeakers = result.speakers;
                this.showSpeakerNamingForm();
            } else {
                this.showError(result.error || 'Failed to process video. Please try again.');
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.showError('Network error occurred. Please check your connection and try again.');
        }
    }

    // Progress Animation
    animateProgress() {
        const steps = [
            { id: 'step1', delay: 0 },
            { id: 'step2', delay: 1000 },
            { id: 'step3', delay: 2500 },
            { id: 'step4', delay: 4000 }
        ];

        steps.forEach((step, index) => {
            setTimeout(() => {
                const element = document.getElementById(step.id);
                if (element) {
                    element.classList.add('active');
                }
            }, step.delay);
        });
    }

    // Speaker Naming Form
    showSpeakerNamingForm() {
        this.showState(3);

        const speakersForm = document.getElementById('speakers-form');
        const speakerCount = document.getElementById('speaker-count');

        // Update speaker count
        speakerCount.textContent = this.currentSpeakers.length;

        // Clear existing form
        speakersForm.innerHTML = '';

        // Create speaker input fields
        this.currentSpeakers.forEach((speaker, index) => {
            const speakerDiv = document.createElement('div');
            speakerDiv.className = 'speaker-input-group';

            const speakerLetter = String.fromCharCode(65 + index); // A, B, C, etc.

            speakerDiv.innerHTML = `
                <div class="speaker-info">
                    <div class="speaker-avatar">${speakerLetter}</div>
                    <div class="speaker-details">
                        <div class="speaker-label">Speaker ${speakerLetter}</div>
                        <div class="speaker-snippet">said: "${speaker.snippet}"</div>
                    </div>
                </div>
                <input type="text"
                       class="speaker-name-input"
                       data-speaker="${speaker.label}"
                       placeholder="Enter name"
                       maxlength="50"
                       required>
            `;

            speakersForm.appendChild(speakerDiv);
        });

        // Focus on first input
        const firstInput = speakersForm.querySelector('.speaker-name-input');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }

    // Generate Summary
    async generateSummary() {
        // Collect speaker names
        const speakerInputs = document.querySelectorAll('.speaker-name-input');
        this.speakerMapping = {};

        let allNamesFilled = true;
        speakerInputs.forEach(input => {
            const speakerLabel = input.dataset.speaker;
            const speakerName = input.value.trim();

            if (!speakerName) {
                allNamesFilled = false;
                input.classList.add('error');
            } else {
                input.classList.remove('error');
                this.speakerMapping[speakerLabel] = speakerName;
            }
        });

        if (!allNamesFilled) {
            this.showError('Please enter names for all speakers.');
            return;
        }

        // Show processing for summary generation
        this.showState(2);
        document.querySelector('.processing-description').textContent = 'Generating AI-powered summary...';

        // Reset progress animation
        document.querySelectorAll('.step-indicator').forEach(step => {
            step.classList.remove('active');
        });
        this.animateProgress();

        try {
            const response = await fetch('/generate-summary', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    transcript_text: this.currentTranscript,
                    speaker_mapping: this.speakerMapping
                })
            });

            const result = await response.json();

            if (result.success) {
                this.displaySummary(result.summary_markdown);
            } else {
                this.showError(result.error || 'Failed to generate summary. Please try again.');
            }
        } catch (error) {
            console.error('Summary generation error:', error);
            this.showError('Network error occurred while generating summary. Please try again.');
        }
    }

    // Display Summary
    displaySummary(markdownContent) {
        this.showState(4);

        const summaryContent = document.getElementById('summary-content');
        summaryContent.innerHTML = this.parseMarkdown(markdownContent);

        // Scroll to top of summary
        summaryContent.scrollTop = 0;
    }

    // Simple Markdown Parser
    parseMarkdown(markdown) {
        if (!markdown) return '';

        let html = markdown;

        // Headers (h1, h2, h3)
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

        // Bold text
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

        // Italic text
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

        // Lists (bullet points)
        html = html.replace(/^\* (.+)$/gim, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

        // Numbered lists
        html = html.replace(/^\d+\. (.+)$/gim, '<li>$1</li>');

        // Line breaks
        html = html.replace(/\n\n/g, '</p><p>');
        html = '<p>' + html + '</p>';

        // Clean up empty paragraphs
        html = html.replace(/<p><\/p>/g, '');
        html = html.replace(/<p>(<h[1-6]>)/g, '$1');
        html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
        html = html.replace(/<p>(<ul>|<\/ul>)/g, '$1');
        html = html.replace(/(<\/li><\/ul>)<\/p>/g, '$1');

        return html;
    }

    // Copy Summary to Clipboard
    async copySummaryToClipboard() {
        const summaryContent = document.getElementById('summary-content');
        const textContent = summaryContent.innerText || summaryContent.textContent;

        try {
            await navigator.clipboard.writeText(textContent);

            // Show temporary success feedback
            const copyButton = document.getElementById('copy-summary');
            const originalHTML = copyButton.innerHTML;
            copyButton.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            `;
            copyButton.classList.add('success');

            setTimeout(() => {
                copyButton.innerHTML = originalHTML;
                copyButton.classList.remove('success');
            }, 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
            this.showError('Failed to copy summary to clipboard.');
        }
    }

    // Download Summary as Text
    downloadSummaryAsText() {
        const summaryContent = document.getElementById('summary-content');
        const textContent = summaryContent.innerText || summaryContent.textContent;

        const blob = new Blob([textContent], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `meeting-summary-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        window.URL.revokeObjectURL(url);
    }

    // Reset to Upload State
    resetToUpload() {
        // Reset form data
        const videoInput = document.getElementById('video-input');
        const fileInputLabel = document.querySelector('.file-input-text');
        const uploadButton = document.getElementById('upload-button');

        videoInput.value = '';
        fileInputLabel.textContent = 'Choose video file';
        uploadButton.disabled = true;

        // Reset progress animation
        document.querySelectorAll('.step-indicator').forEach(step => {
            step.classList.remove('active');
        });

        // Reset processing description
        document.querySelector('.processing-description').textContent = 'This may take a few minutes...';

        // Clear stored data
        this.currentTranscript = '';
        this.currentSpeakers = [];
        this.speakerMapping = {};

        // Show upload state
        this.showState(1);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.meetingApp = new MeetingIntelligenceApp();
});