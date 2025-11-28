// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// DOM Elements
const triggerButton = document.getElementById('trigger-sos');
const descriptionInput = document.getElementById('emergency-description');
const locationInput = document.getElementById('location');
const loadingSection = document.getElementById('loading');
const assessmentSection = document.getElementById('assessment-section');
const errorSection = document.getElementById('error-section');
const newEmergencyButton = document.getElementById('new-emergency');
const retryButton = document.getElementById('retry-button');

// Event Listeners
triggerButton.addEventListener('click', handleEmergencyTrigger);
newEmergencyButton.addEventListener('click', resetForm);
retryButton.addEventListener('click', resetError);

// Handle Emergency Trigger
async function handleEmergencyTrigger() {
    const description = descriptionInput.value.trim();
    const location = locationInput.value.trim();

    // Validation
    if (!description) {
        showError('Please describe your emergency situation');
        return;
    }

    // Show loading state
    showLoading();

    try {
        // Call backend API
        const response = await fetch(`${API_BASE_URL}/emergency/trigger`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                description,
                location: location || 'Unknown'
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            displayAssessment(data.emergency, data.warning);
        } else {
            throw new Error(data.message || 'Unknown error occurred');
        }

    } catch (error) {
        console.error('Error triggering emergency:', error);
        showError(`Failed to process emergency: ${error.message}`);
    }
}

// Display Assessment Results
function displayAssessment(emergency, warning) {
    const assessment = emergency.assessment;

    // Hide loading and show assessment
    loadingSection.style.display = 'none';
    assessmentSection.style.display = 'block';
    errorSection.style.display = 'none';

    // Populate emergency type
    const typeElement = document.getElementById('emergency-type');
    typeElement.textContent = assessment.emergencyType || 'Unknown';

    // Populate severity level
    const severityElement = document.getElementById('severity-level');
    const severity = assessment.severityLevel || 3;
    severityElement.textContent = `Severity: ${severity}/5`;
    severityElement.className = `severity-badge severity-${severity}`;

    // Populate immediate risks
    const risksList = document.getElementById('risks-list');
    risksList.innerHTML = '';
    if (assessment.immediateRisks && assessment.immediateRisks.length > 0) {
        assessment.immediateRisks.forEach(risk => {
            const li = document.createElement('li');
            li.textContent = risk;
            risksList.appendChild(li);
        });
    } else {
        risksList.innerHTML = '<li>No immediate risks identified</li>';
    }

    // Populate recommended response
    const responseElement = document.getElementById('recommended-response');
    responseElement.textContent = assessment.recommendedResponse || 'Contact emergency services if needed';

    // Populate guidance steps
    const guidanceList = document.getElementById('guidance-list');
    guidanceList.innerHTML = '';
    if (assessment.guidance && assessment.guidance.length > 0) {
        assessment.guidance.forEach(step => {
            const li = document.createElement('li');
            li.textContent = step;
            guidanceList.appendChild(li);
        });
    }

    // Populate emergency resources (multi-agent)
    if (assessment.nearbyHospitals && assessment.nearbyHospitals.length > 0) {
        const resourcesSection = document.getElementById('resources-section');
        resourcesSection.style.display = 'block';

        document.getElementById('emergency-services').textContent = assessment.emergencyServices || '911';

        const hospitalsList = document.getElementById('hospitals-list');
        hospitalsList.innerHTML = '<p><strong>Nearby Resources:</strong></p><ul></ul>';
        const ul = hospitalsList.querySelector('ul');
        assessment.nearbyHospitals.forEach(hospital => {
            const li = document.createElement('li');
            li.textContent = hospital;
            ul.appendChild(li);
        });
    }

    // Populate multi-agent information
    if (assessment.multiAgent && assessment.agentsCalled) {
        const multiAgentInfo = document.getElementById('multi-agent-info');
        multiAgentInfo.style.display = 'block';

        const agentsText = assessment.agentsCalled
            .map(agent => agent.replace('_agent', '').replace('_', ' '))
            .join(', ');
        document.getElementById('agents-called').textContent = agentsText;
        document.getElementById('execution-time').textContent = `${assessment.executionTime}s`;
    }

    // Populate meta information
    document.getElementById('emergency-id').textContent = emergency.id;
    document.getElementById('ai-model').textContent = assessment.aiModel || 'Unknown';
    document.getElementById('ai-provider').textContent = assessment.aiProvider || 'Unknown';
    document.getElementById('triggered-at').textContent = new Date(emergency.triggeredAt).toLocaleString();

    // Show warning if using fallback
    if (warning) {
        const warningDiv = document.createElement('div');
        warningDiv.className = 'warning-message';
        warningDiv.style.cssText = 'background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; padding: 15px; margin-bottom: 20px;';
        warningDiv.innerHTML = `<strong>⚠️ Warning:</strong> ${warning}`;
        assessmentSection.querySelector('.assessment-card').prepend(warningDiv);
    }

    // Scroll to assessment
    assessmentSection.scrollIntoView({ behavior: 'smooth' });
}

// Show Loading State
function showLoading() {
    loadingSection.style.display = 'block';
    assessmentSection.style.display = 'none';
    errorSection.style.display = 'none';
    triggerButton.disabled = true;
}

// Show Error
function showError(message) {
    loadingSection.style.display = 'none';
    assessmentSection.style.display = 'none';
    errorSection.style.display = 'block';
    document.getElementById('error-message').textContent = message;
    triggerButton.disabled = false;
}

// Reset Form
function resetForm() {
    descriptionInput.value = '';
    locationInput.value = '';
    assessmentSection.style.display = 'none';
    errorSection.style.display = 'none';
    triggerButton.disabled = false;
    descriptionInput.focus();

    // Remove warning if exists
    const warning = document.querySelector('.warning-message');
    if (warning) {
        warning.remove();
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Reset Error
function resetError() {
    errorSection.style.display = 'none';
    triggerButton.disabled = false;
    descriptionInput.focus();
}

// Check backend health on load
window.addEventListener('load', async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        const data = await response.json();
        console.log('Backend status:', data);
    } catch (error) {
        console.error('Backend not reachable:', error);
        showError('Cannot connect to backend server. Please ensure the server is running on http://localhost:3000');
    }
});
