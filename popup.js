document.addEventListener("DOMContentLoaded", () => {
    const toggleSwitch = document.getElementById("toggle");
    const languageSelect = document.getElementById("language");
    const scoreElement = document.getElementById("score");

    // Load saved settings from Chrome storage
    chrome.storage.sync.get(["isActive", "language"], (data) => {
        toggleSwitch.checked = data.isActive ?? false;
        languageSelect.value = data.language ?? "en";
    });

    // Save settings when changed
    toggleSwitch.addEventListener("change", () => {
        const isActive = toggleSwitch.checked;
        chrome.storage.sync.set({ isActive });

        // Send message to content.js
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, { action: "toggleActive", isActive });
            }
        });
    });

    languageSelect.addEventListener("change", () => {
        chrome.storage.sync.set({ language: languageSelect.value });
    });

    // Fetch user score from API
    // async function fetchScore() {
    //     try {
    //         const response = await fetch("https://your-api.com/user-score");
    //         const data = await response.json();
    //         scoreElement.textContent = data.score ?? "N/A";
    //     } catch (error) {
    //         scoreElement.textContent = "Error";
    //     }
    // }

    // fetchScore();
});
