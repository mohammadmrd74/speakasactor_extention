document.addEventListener("DOMContentLoaded", () => {
    const toggleSwitch = document.getElementById("toggle");
    const languageSelect = document.getElementById("language");
    const scoreElement = document.getElementById("score");
    const statusIndicator = document.getElementById("statusIndicator");

    function updateStatusIndicator(isActive) {
        statusIndicator.className = `status-indicator ${isActive ? 'active' : 'inactive'}`;
    }

    function formatScore(score) {
        if (score === undefined || score === null) return '0';
        return Math.floor(score).toLocaleString();
    }

    // Load saved settings from Chrome storage
    chrome.storage.sync.get(["isActive", "language", "score"], (data) => {
        const isActive = data.isActive ?? false;
        toggleSwitch.checked = isActive;
        languageSelect.value = data.language ?? "en-US";
        scoreElement.textContent = formatScore(data.score);
        updateStatusIndicator(isActive);
    });

    // Save settings when toggle changed
    toggleSwitch.addEventListener("change", () => {
        const isActive = toggleSwitch.checked;
        chrome.storage.sync.set({ isActive });
        updateStatusIndicator(isActive);

        // Send message to content.js
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, { action: "toggleActive", isActive });
            }
        });
    });

    // Save settings when language changed
    languageSelect.addEventListener("change", () => {
        const language = languageSelect.value;
        chrome.storage.sync.set({ language });

        // Send message to content.js
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, { action: "languageSelect", language });
            }
        });
    });

    // Listen for score updates
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.score) {
            scoreElement.textContent = formatScore(changes.score.newValue);
        }
        if (changes.isActive) {
            updateStatusIndicator(changes.isActive.newValue);
        }
    });

    // View saved texts functionality
    const viewSavedTextsBtn = document.getElementById("viewSavedTexts");

    viewSavedTextsBtn.addEventListener("click", () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('saved-texts.html') });
    });
});
