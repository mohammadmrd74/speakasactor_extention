document.addEventListener("DOMContentLoaded", () => {
    const toggleSwitch = document.getElementById("toggle");
    const languageSelect = document.getElementById("language");
    const scoreElement = document.getElementById("score");

    // Load saved settings from Chrome storage
    chrome.storage.sync.get(["isActive", "language", "score"], (data) => {
        console.log(data.score);
        
        toggleSwitch.checked = data.isActive ?? false;
        languageSelect.value = data.language ?? "en";
        scoreElement.textContent = Math.floor(data.score) ?? 0;
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

    chrome.storage.onChanged.addListener((changes, areaName) => {
        chrome.storage.sync.get("score", (data) => {
            scoreElement.textContent = data.score ?? 0;
        })
    });

    languageSelect.addEventListener("change", () => {
        chrome.storage.sync.set({ language: languageSelect.value });
    });
});
