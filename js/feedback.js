// /frontend/js/feedback.js

class FeedbackService {
    static #API_URL = '/api/feedback'; // Will be handled by backend

    // Initialize AI feedback processing
    static async generateFeedbackSummary(feedbackData) {
        try {
            const response = await fetch(this.#API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await this.getAuthToken()}`
                },
                body: JSON.stringify({
                    technicalSkills: feedbackData.technicalSkills,
                    communicationSkills: feedbackData.communicationSkills,
                    notes: feedbackData.notes,
                    interviewId: feedbackData.interviewId
                })
            });

            if (!response.ok) {
                throw new Error('Failed to generate feedback summary');
            }

            const data = await response.json();
            return data.summary;
        } catch (error) {
            console.error('Error generating feedback:', error);
            throw error;
        }
    }

    // Get authentication token for API requests
    static async getAuthToken() {
        try {
            const user = firebase.auth().currentUser;
            if (!user) {
                throw new Error('No authenticated user');
            }
            return await user.getIdToken();
        } catch (error) {
            console.error('Error getting auth token:', error);
            throw error;
        }
    }

    // Save feedback to Firestore
    static async saveFeedback(interviewId, feedbackData) {
        try {
            const db = firebase.firestore();
            await db.collection('interviews').doc(interviewId).update({
                feedback: {
                    ...feedbackData,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedBy: firebase.auth().currentUser.uid
                }
            });
        } catch (error) {
            console.error('Error saving feedback:', error);
            throw error;
        }
    }

    // Load existing feedback
    static async loadFeedback(interviewId) {
        try {
            const db = firebase.firestore();
            const doc = await db.collection('interviews').doc(interviewId).get();
            
            if (!doc.exists) {
                throw new Error('Interview not found');
            }

            return doc.data().feedback || null;
        } catch (error) {
            console.error('Error loading feedback:', error);
            throw error;
        }
    }

    // Initialize feedback form
    static initializeFeedbackForm(interviewId) {
        const form = document.getElementById('feedbackForm');
        const aiSummary = document.getElementById('aiSummary');
        const spinner = aiSummary.querySelector('.spinner-border');
        let debounceTimer;

        // Update rating display
        ['technical', 'communication'].forEach(type => {
            const input = document.getElementById(`${type}Skills`);
            const value = document.getElementById(`${type}Value`);
            
            input.addEventListener('input', () => {
                value.textContent = `${input.value}/5`;
            });
        });

        // Handle notes input with debounce
        const notesInput = document.getElementById('interviewNotes');
        notesInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            
            if (notesInput.value.length >= 50) {
                debounceTimer = setTimeout(async () => {
                    try {
                        spinner.classList.remove('d-none');
                        aiSummary.textContent = 'Generating summary...';

                        const feedbackData = {
                            interviewId,
                            technicalSkills: document.getElementById('technicalSkills').value,
                            communicationSkills: document.getElementById('communicationSkills').value,
                            notes: notesInput.value
                        };

                        const summary = await this.generateFeedbackSummary(feedbackData);
                        aiSummary.textContent = summary;
                    } catch (error) {
                        aiSummary.textContent = 'Error generating summary. Please try again.';
                        console.error('Error:', error);
                    } finally {
                        spinner.classList.add('d-none');
                    }
                }, 1000);
            } else {
                aiSummary.textContent = 'Enter at least 50 characters to generate AI summary...';
            }
        });

        // Save feedback
        document.getElementById('saveFeedback').addEventListener('click', async () => {
            if (!form.checkValidity()) {
                form.classList.add('was-validated');
                return;
            }

            try {
                const feedbackData = {
                    technicalSkills: parseInt(document.getElementById('technicalSkills').value),
                    communicationSkills: parseInt(document.getElementById('communicationSkills').value),
                    notes: notesInput.value,
                    aiSummary: aiSummary.textContent
                };

                await this.saveFeedback(interviewId, feedbackData);
                
                const modal = bootstrap.Modal.getInstance(document.getElementById('feedbackModal'));
                modal.hide();
                
                // Show success notification (assuming showNotification function exists)
                window.showNotification('Feedback saved successfully', 'success');
            } catch (error) {
                window.showNotification('Error saving feedback', 'error');
                console.error('Error:', error);
            }
        });

        // Load existing feedback if any
        this.loadFeedback(interviewId).then(feedback => {
            if (feedback) {
                document.getElementById('technicalSkills').value = feedback.technicalSkills;
                document.getElementById('communicationSkills').value = feedback.communicationSkills;
                document.getElementById('interviewNotes').value = feedback.notes;
                aiSummary.textContent = feedback.aiSummary;
                
                // Update displays
                document.getElementById('technicalValue').textContent = `${feedback.technicalSkills}/5`;
                document.getElementById('communicationValue').textContent = `${feedback.communicationSkills}/5`;
            }
        });
    }
}

// Export for use in other files
window.FeedbackService = FeedbackService;