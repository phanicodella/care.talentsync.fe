// /frontend/js/app.js

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCtqnl-95_iYESTBHu_FlFtj80Ab4zMqZk",
    authDomain: "talentsync-70bbb.firebaseapp.com",
    projectId: "talentsync-70bbb",
    storageBucket: "talentsync-70bbb.firebasestorage.app",
    messagingSenderId: "13476679191",
    appId: "1:13476679191:web:f328102e1b692d07b51652"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Auth and Firestore
const auth = firebase.auth();
const db = firebase.firestore();

// Check authentication state
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log('User is signed in:', user.email);
        document.body.classList.add('logged-in');
        loadInterviews();
    } else {
        console.log('User is signed out');
        document.body.classList.remove('logged-in');
        if (!window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
    }
});

// Handle interview scheduling form submission
document.getElementById('scheduleForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        const candidateName = document.getElementById('candidateName').value;
        const candidateEmail = document.getElementById('candidateEmail').value;
        const date = document.getElementById('interviewDate').value;
        const time = document.getElementById('interviewTime').value;

        // Validate date is not in the past
        const interviewDateTime = new Date(`${date}T${time}`);
        const now = new Date();
        if (interviewDateTime <= now) {
            throw new Error('Please select a future date and time');
        }

        // Generate a Jitsi meeting link
        const meetingLink = `https://meet.jit.si/${generateMeetingId()}`;

        // Add to Firestore
        const docRef = await db.collection('interviews').add({
            candidateName,
            candidateEmail,
            date: firebase.firestore.Timestamp.fromDate(interviewDateTime),
            status: 'scheduled',
            meetingLink,
            interviewerId: auth.currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Get the created interview data for calendar
        const interview = {
            id: docRef.id,
            candidateName,
            candidateEmail,
            date: firebase.firestore.Timestamp.fromDate(interviewDateTime),
            meetingLink
        };

        // Generate calendar invite
        sendCalendarInvite(interview);

        // Close modal and reset form
        const modal = bootstrap.Modal.getInstance(document.getElementById('scheduleModal'));
        modal.hide();
        document.getElementById('scheduleForm').reset();

        // Refresh interviews list
        loadInterviews();

        // Show success notification
        showNotification('Interview scheduled successfully!', 'success');

    } catch (error) {
        console.error('Error scheduling interview:', error);
        showNotification(error.message || 'Error scheduling interview. Please try again.', 'error');
    }
});

// Function to generate a unique meeting ID
// Update this function in app.js
function generateMeetingId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const meetingId = `talentsync-${timestamp}-${random}`;
    return `${window.location.origin}/meeting.html?id=${meetingId}`;
}

// Function to load interviews
async function loadInterviews() {
    try {
        const snapshot = await db.collection('interviews')
            .where('interviewerId', '==', auth.currentUser.uid)
            .orderBy('date', 'asc')
            .get();

        const interviewsList = document.getElementById('interviewsList');
        interviewsList.innerHTML = '';

        if (snapshot.empty) {
            interviewsList.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center">No interviews scheduled</td>
                </tr>
            `;
            return;
        }

        snapshot.forEach((doc) => {
            const interview = { id: doc.id, ...doc.data() };
            const date = interview.date.toDate();
            const isPast = date < new Date();
            
            interviewsList.innerHTML += `
                <tr${isPast ? ' class="table-secondary"' : ''}>
                    <td>${interview.candidateName}</td>
                    <td>${date.toLocaleString()}</td>
                    <td><span class="badge bg-${interview.status === 'cancelled' ? 'danger' : 'primary'}">${interview.status}</span></td>
                    <td>
                        ${!isPast && interview.status !== 'cancelled' ? `
                            <a href="${interview.meetingLink}" target="_blank" class="btn btn-sm btn-success">Join</a>
                            <button onclick="copyLink('${interview.meetingLink}')" class="btn btn-sm btn-secondary">Copy Link</button>
                            <button onclick="cancelInterview('${doc.id}')" class="btn btn-sm btn-danger">Cancel</button>
                        ` : ''}
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('Error loading interviews:', error);
        showNotification('Error loading interviews. Please refresh the page.', 'error');
    }
}

// Function to copy meeting link
function copyLink(link) {
    navigator.clipboard.writeText(link)
        .then(() => showNotification('Link copied to clipboard!', 'success'))
        .catch(err => {
            console.error('Error copying link:', err);
            showNotification('Error copying link', 'error');
        });
}

// Function to cancel interview
async function cancelInterview(interviewId) {
    if (!confirm('Are you sure you want to cancel this interview?')) {
        return;
    }

    try {
        await db.collection('interviews').doc(interviewId).update({
            status: 'cancelled',
            cancelledAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        loadInterviews();
        showNotification('Interview cancelled successfully', 'success');
    } catch (error) {
        console.error('Error cancelling interview:', error);
        showNotification('Error cancelling interview', 'error');
    }
}

// Function to show notifications
function showNotification(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    document.body.appendChild(alertDiv);
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Initialize UI when document loads
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the schedule modal
    const scheduleModal = new bootstrap.Modal(document.getElementById('scheduleModal'));
    
    // Show modal when schedule button is clicked
    document.getElementById('scheduleBtn').addEventListener('click', () => {
        scheduleModal.show();
    });

    // Set minimum date for interview scheduling
    const dateInput = document.getElementById('interviewDate');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateInput.min = tomorrow.toISOString().split('T')[0];

    // Add logout functionality
    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'btn btn-outline-light ms-auto';
    logoutBtn.textContent = 'Logout';
    logoutBtn.addEventListener('click', () => {
        auth.signOut().then(() => {
            window.location.href = 'login.html';
        }).catch((error) => {
            console.error('Error signing out:', error);
            showNotification('Error signing out', 'error');
        });
    });
    document.querySelector('.navbar-nav').appendChild(logoutBtn);
});