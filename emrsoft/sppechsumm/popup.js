document.addEventListener('DOMContentLoaded', function () {
    const recordButton = document.getElementById('recordButton');
    const processBtn = document.getElementById('processBtn');
    const audioPlayer = document.getElementById('audioPlayer');
    const resultsPanel = document.getElementById('results');
    const pauseButton = document.getElementById('pauseButton');
    const cancelProcessBtn = document.getElementById('cancelProcessBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const uploadButton = document.getElementById('uploadButton');
    const uploadAudio = document.getElementById('uploadAudio');
    const dashboardBtn = document.getElementById('dashboardBtn'); // New dashboard button

    let isPaused = false;
    let abortController = null;

    let mediaRecorder;
    let audioChunks = [];
    let isRecording = false;

    // Redirect to dashboard when the dashboard button is clicked
    dashboardBtn.addEventListener('click', () => {
        // Replace with your dashboard URL
        window.open('http://localhost:8000/api/dashboard/', '_blank');
    });

    // Helper function to format time
    function formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    // Helper function to create a custom audio player
    function createCustomAudioPlayer(audioUrl) {
        const audioElement = audioPlayer.querySelector('audio');
        const sourceElement = audioPlayer.querySelector('#audioSource');

        sourceElement.src = audioUrl;
        audioElement.load();
        audioElement.play();

        // Show the audio player
        showElement(audioPlayer);
    }

    // Show an element with animation
    function showElement(element, animation = 'fadeIn') {
        element.style.display = 'block';
        element.classList.add('animate__animated', `animate__${animation}`);
        element.addEventListener('animationend', () => {
            element.classList.remove('animate__animated', `animate__${animation}`);
        }, { once: true });
    }

    // Hide an element with animation
    function hideElement(element, animation = 'fadeOut') {
        element.classList.add('animate__animated', `animate__${animation}`);
        element.addEventListener('animationend', () => {
            element.style.display = 'none';
            element.classList.remove('animate__animated', `animate__${animation}`);
        }, { once: true });
    }

    // Update the recording state
    function updateRecordingState(isRecording, isPaused) {
        if (isRecording) {
            // Always show the stop icon when recording
            recordButton.querySelector('i').className = 'fas fa-stop';
            recordButton.classList.add('recording');

            if (isPaused) {
                // Paused state: stop the pulsating animation
                recordButton.classList.add('paused');
                pauseButton.querySelector('i').className = 'fas fa-play'; // Pause button shows play icon
            } else {
                // Recording state: resume pulsating animation
                recordButton.classList.remove('paused');
                pauseButton.querySelector('i').className = 'fas fa-pause'; // Pause button shows pause icon
            }

            // Show the pause button
            pauseButton.classList.add('visible');
        } else {
            // Stop recording: reset everything
            recordButton.classList.remove('recording', 'paused');
            recordButton.querySelector('i').className = 'fas fa-microphone'; // Reset to microphone icon
            pauseButton.classList.remove('visible');
        }
    }

    // Handle record button click
    if (recordButton) {
        recordButton.addEventListener('click', async () => {
            if (!isRecording) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({
                        audio: {
                            echoCancellation: true,
                            noiseSuppression: true,
                            sampleRate: 44100,
                        },
                    });

                    mediaRecorder = new MediaRecorder(stream);
                    audioChunks = [];

                    // Show the audio player before starting recording
                    showElement(audioPlayer);

                    mediaRecorder.addEventListener('dataavailable', (event) => {
                        audioChunks.push(event.data);
                    });

                    mediaRecorder.addEventListener('stop', () => {
                        stream.getTracks().forEach((track) => track.stop());
                        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                        const audioUrl = URL.createObjectURL(audioBlob);
                        createCustomAudioPlayer(audioUrl);
                        processBtn.disabled = false;
                        updateRecordingState(false, false);
                    });

                    mediaRecorder.start();
                    isRecording = true;
                    isPaused = false;
                    updateRecordingState(true, false);
                } catch (error) {
                    console.error('Error accessing microphone:', error);
                    if (error.name === 'NotAllowedError') {
                        alert('Please allow microphone access to record audio.');
                    } else if (error.name === 'NotFoundError') {
                        alert('No microphone found. Please check your device settings.');
                    } else {
                        alert('Error accessing microphone: ' + error.message);
                    }
                }
            } else {
                stopRecording();
            }
        });
    }

    // Stop the recording
    function stopRecording() {
        mediaRecorder.stop();
        isRecording = false;
        recordButton.classList.remove('recording');
    }

    // Handle pause button click
    if (pauseButton) {
        pauseButton.addEventListener('click', () => {
            if (isRecording) {
                if (!isPaused) {
                    mediaRecorder.pause();
                    isPaused = true;
                } else {
                    mediaRecorder.resume();
                    isPaused = false;
                }
                updateRecordingState(true, isPaused);
            }
        });
    }

    // Handle upload button click
    uploadButton.addEventListener('click', () => {
        uploadAudio.click();
    });

    // Handle file upload
    uploadAudio.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file && file.type.startsWith('audio/')) {
            const audioUrl = URL.createObjectURL(file);
            createCustomAudioPlayer(audioUrl);
            audioChunks = [file]; // Store the file for processing
            processBtn.disabled = false;
        } else {
            alert('Please upload a valid audio file.');
        }
    });

    // Show an error message
    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i>${message}`;
        document.querySelector('.main-container').appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 3000);
    }

    // Create a card for medical information
    function createMedicalCard(title, content) {
        const card = document.createElement('div');
        card.className = 'result-card';

        const cardHeader = document.createElement('h2');
        cardHeader.textContent = title;
        card.appendChild(cardHeader);

        const cardContent = document.createElement('div');
        cardContent.className = 'result-content';
        cardContent.contentEditable = true;

        // Format the content based on the title
        if (title === 'Patient Symptoms') {
            cardContent.innerHTML = `
                <p><strong>Main Complaint:</strong> ${content.main_complaint || 'N/A'}</p>
                <p><strong>Other Symptoms:</strong> ${content.other_symptoms || 'N/A'}</p>
                <p><strong>Duration:</strong> ${content.duration || 'N/A'}</p>
            `;
        } else if (title === 'Medical History') {
            cardContent.innerHTML = `
                <p><strong>Allergies:</strong> ${content.allergies || 'N/A'}</p>
                <p><strong>Conditions:</strong> ${content.conditions || 'N/A'}</p>
                <p><strong>Medications:</strong> ${content.medications || 'N/A'}</p>
            `;
        } else if (title === 'Current Assessment') {
            cardContent.innerHTML = `
                <p><strong>Symptoms Detail:</strong> ${content.symptoms_detail || 'N/A'}</p>
                <p><strong>Severity:</strong> ${content.severity || 'N/A'}</p>
                <p><strong>Triggers:</strong> ${content.triggers || 'N/A'}</p>
            `;
        } else if (title === 'Diagnosis') {
            cardContent.innerHTML = `
                <p><strong>Likely Condition:</strong> ${content.likely_condition || 'N/A'}</p>
                <p><strong>Other Possibilities:</strong> ${content.other_possibilities || 'N/A'}</p>
                <p><strong>Reasoning:</strong> ${content.reasoning || 'N/A'}</p>
                <p><strong>Suggested Tests:</strong> ${content.suggested_tests || 'N/A'}</p>
            `;
        } else {
            // Fallback for unknown sections
            cardContent.textContent = JSON.stringify(content, null, 2);
        }

        card.appendChild(cardContent);
        return card;
    }

    // Handle process button click
    if (processBtn) {
        processBtn.addEventListener('click', async () => {
            if (audioChunks.length === 0) {
                showError('Please record or upload audio first');
                return;
            }

            processBtn.disabled = true;
            processBtn.classList.add('processing');
            processBtn.innerHTML = 'Processing...';

            // Show cancel button
            cancelProcessBtn.style.display = 'flex';
            cancelProcessBtn.classList.add('visible');

            // Create new AbortController for this request
            abortController = new AbortController();

            try {
                // Stop any playing audio and release resources
                const audio = audioPlayer.querySelector('audio');
                if (audio) {
                    audio.pause();
                    audio.src = '';
                }

                const audioBlob = audioChunks[0] instanceof Blob ? audioChunks[0] : new Blob(audioChunks, { type: 'audio/wav' });
                const formData = new FormData();
                formData.append('audio', audioBlob, 'recording.wav');

                console.log('Sending request to server...');
                const response = await fetch('http://localhost:8000/api/process-audio/', {
                    method: 'POST',
                    body: formData,
                    headers: {
                        Accept: 'application/json',
                    },
                    signal: abortController.signal,
                });

                console.log('Response status:', response.status);
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Server error response:', errorText);
                    throw new Error(`Server error: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                console.log('Response data:', data);

                // Clear existing results
                resultsPanel.innerHTML = '';

                // Create cards for each section of the medical information
                if (data.patient_symptoms) {
                    const symptomsCard = createMedicalCard('Patient Symptoms', data.patient_symptoms);
                    resultsPanel.appendChild(symptomsCard);
                }

                if (data.medical_history) {
                    const historyCard = createMedicalCard('Medical History', data.medical_history);
                    resultsPanel.appendChild(historyCard);
                }

                if (data.current_assessment) {
                    const assessmentCard = createMedicalCard('Current Assessment', data.current_assessment);
                    resultsPanel.appendChild(assessmentCard);
                }

                if (data.diagnosis) {
                    const diagnosisCard = createMedicalCard('Diagnosis', data.diagnosis);
                    resultsPanel.appendChild(diagnosisCard);
                }

                showElement(resultsPanel);

                // Show the download button after processing is complete
                downloadBtn.style.display = 'flex';
            } catch (error) {
                console.error('Fetch error:', error);
                if (error.name !== 'AbortError') {
                    alert('Error processing audio. Please ensure the server is running. ' + error.message);
                }
            } finally {
                processBtn.disabled = false;
                processBtn.classList.remove('processing');
                processBtn.innerHTML = 'Process Audio';
                cancelProcessBtn.classList.remove('visible');
                setTimeout(() => {
                    cancelProcessBtn.style.display = 'none';
                }, 300);
                abortController = null;
            }
        });
    }

    // Handle download button click
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            // Get the content from all cards
            const cards = document.querySelectorAll('.result-card');
            let content = '';

            cards.forEach(card => {
                const title = card.querySelector('h2').textContent;
                const cardContent = card.querySelector('.result-content').textContent;
                content += `${title}:\n${cardContent}\n\n`;
            });

            // Create a Blob with the content
            const blob = new Blob([content], { type: 'text/plain' });

            // Create a download link
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'medical_record.txt'; // File name
            document.body.appendChild(a);
            a.click(); // Trigger the download

            // Clean up
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    // Handle cancel process button click
    if (cancelProcessBtn) {
        cancelProcessBtn.addEventListener('click', () => {
            if (abortController) {
                abortController.abort();
                processBtn.innerHTML = 'Process Audio';
                processBtn.disabled = false;
                processBtn.classList.remove('processing');
                cancelProcessBtn.classList.remove('visible');
                setTimeout(() => {
                    cancelProcessBtn.style.display = 'none';
                }, 300);
            }
        });
    }
});