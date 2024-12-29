// /frontend/js/meeting.js

class MeetingRoom {
    constructor() {
        this.api = null;
        this.meetingId = null;
        this.participantName = null;
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.meetingInfo = document.getElementById('meetingInfo');
        this.leaveButton = document.getElementById('leaveButton');
        
        this.initializeMeetingRoom();
    }

    async initializeMeetingRoom() {
        try {
            await this.setupMeeting();
        } catch (error) {
            this.handleError(error);
        }
    }

    async setupMeeting() {
        // Get meeting ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        this.meetingId = urlParams.get('id');

        if (!this.meetingId) {
            throw new Error('Invalid meeting link');
        }

        // Initialize Jitsi Meet
        const domain = 'meet.jit.si';
        const options = {
            roomName: this.meetingId,
            width: '100%',
            height: '100%',
            parentNode: document.querySelector('#jitsiContainer'),
            configOverwrite: {
                startWithAudioMuted: true,
                startWithVideoMuted: false,
                disableDeepLinking: true,
                prejoinPageEnabled: false,
                hideConferenceSubject: true,
                defaultLanguage: 'en',
                enableClosePage: false,
                disableThirdPartyRequests: true,
                analytics: {
                    disabled: true
                }
            },
            interfaceConfigOverwrite: {
                TOOLBAR_BUTTONS: [
                    'microphone', 'camera', 'desktop', 'fullscreen',
                    'fodeviceselection', 'hangup', 'chat',
                    'settings', 'raisehand', 'videoquality', 
                    'filmstrip', 'tileview'
                ],
                SHOW_JITSI_WATERMARK: false,
                SHOW_WATERMARK_FOR_GUESTS: false,
                DEFAULT_BACKGROUND: '#ffffff',
                DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
                MOBILE_APP_PROMO: false,
                PROVIDER_NAME: 'TalentSync'
            },
            userInfo: {
                displayName: 'TalentSync Interview'
            }
        };

        // Create Jitsi Meet API instance
        this.api = new JitsiMeetExternalAPI(domain, options);
        this.setupEventListeners();
        this.hideLoadingOverlay();
    }

    setupEventListeners() {
        // Jitsi Events
        this.api.addEventListeners({
            readyToClose: () => this.handleMeetingClose(),
            videoConferenceJoined: (event) => this.handleParticipantJoined(event),
            participantJoined: (event) => this.handleOtherParticipantJoined(event),
            participantLeft: (event) => this.handleParticipantLeft(event),
            audioMuteStatusChanged: (event) => this.handleAudioStatusChange(event),
            videoMuteStatusChanged: (event) => this.handleVideoStatusChange(event),
            screenSharingStatusChanged: (event) => this.handleScreenShareStatusChange(event),
            connectionEstablished: () => this.handleConnectionEstablished(),
            connectionFailed: () => this.handleConnectionFailed(),
            deviceListChanged: (devices) => this.handleDeviceListChanged(devices)
        });

        // UI Events
        this.leaveButton.addEventListener('click', () => this.handleLeaveClick());

        // Handle browser back button
        window.addEventListener('popstate', () => this.handleBrowserBack());

        // Handle page refresh
        window.addEventListener('beforeunload', (e) => this.handlePageRefresh(e));
    }

    handleMeetingClose() {
        window.location.href = '/';
    }

    handleParticipantJoined(event) {
        this.participantName = event.displayName;
        this.meetingInfo.textContent = `Meeting ID: ${this.meetingId}`;
    }

    handleOtherParticipantJoined(event) {
        // Could implement participant joined notification
    }

    handleParticipantLeft(event) {
        // Could implement participant left notification
    }

    handleAudioStatusChange(event) {
        // Update UI based on audio status
    }

    handleVideoStatusChange(event) {
        // Update UI based on video status
    }

    handleScreenShareStatusChange(event) {
        // Update UI based on screen sharing status
    }

    handleConnectionEstablished() {
        this.hideLoadingOverlay();
    }

    handleConnectionFailed() {
        this.handleError(new Error('Connection to meeting room failed'));
    }

    handleDeviceListChanged(devices) {
        // Handle device changes
    }

    handleLeaveClick() {
        if (confirm('Are you sure you want to leave the meeting?')) {
            this.api.executeCommand('hangup');
        }
    }

    handleBrowserBack() {
        if (confirm('Are you sure you want to leave the meeting?')) {
            window.location.href = '/';
        } else {
            history.pushState(null, '', window.location.href);
        }
    }

    handlePageRefresh(event) {
        event.preventDefault();
        event.returnValue = 'Are you sure you want to leave the meeting?';
        return event.returnValue;
    }

    handleError(error) {
        console.error('Meeting room error:', error);
        const errorModal = new bootstrap.Modal(document.getElementById('errorModal'));
        document.getElementById('errorMessage').textContent = error.message;
        errorModal.show();
    }

    hideLoadingOverlay() {
        this.loadingOverlay.classList.add('fade-out');
        setTimeout(() => {
            this.loadingOverlay.classList.add('d-none');
        }, 500);
    }

    // Meeting control methods
    executeCommand(command) {
        try {
            this.api.executeCommand(command);
        } catch (error) {
            console.error(`Error executing command ${command}:`, error);
        }
    }
}

// Initialize meeting room when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.meetingRoom = new MeetingRoom();
});