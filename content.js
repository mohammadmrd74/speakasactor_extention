console.log("YouTube Subtitle Listener Loaded!");
var levenshtein = window.Levenshtein;
let video = document.querySelector("video");
let userText = "";
let warningText = "";
let lastSubtitle = "";
let say = "";
let subtitleInterval;
let userScore = 0;
let isListening = false;
let currentLang = "en-US";
let isActive = true;
let incorrectCount = 0;

function createModal() {
  let modal = document.createElement("div");
  modal.id = "speakasactor_modal";
  modal.style.position = "fixed";
  modal.style.top = "50%";
  modal.style.left = "50%";
  modal.style.transform = "translate(-50%, -50%)";
  modal.style.background = "rgba(0, 0, 0, 0.8)";
  modal.style.color = "white";
  modal.style.padding = "20px";
  modal.style.borderRadius = "10px";
  modal.style.fontSize = "20px";
  modal.style.zIndex = "9999";
  modal.style.display = "none"; // Hidden initially


  document.body.appendChild(modal);
}

// Function to show the modal
function showModal() {
  let modal = document.getElementById("speakasactor_modal");
  if (modal) {
    modal.style.display = "block";
    modal.innerHTML = `
      <p>Speak Now!</p>
      <p>${lastSubtitle}</p>
      <p style="margin-top:10px">what you said: ${userText}</p>
      <div>score: ${userScore}</div>
      <div style="margin-top:10px;color:red;">${warningText}</div>
  `;
  }
}

function closeModal() {
  let modal = document.getElementById("speakasactor_modal");
  if (modal) {
    modal.style.display = "none";
  }
}

function waitFor(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


async function getSubtitles() {
  if (isListening) return;
  if (!video) {
    console.log('video not loaded yet!');
    video = document.querySelector("video");
  };
  const subtitleElements = document.querySelectorAll(".ytp-caption-segment");
  let text = Array.from(subtitleElements).map(el => el.innerText.trim()).join(" ");
  if (text) {
    clearInterval(subtitleInterval);
    lastSubtitle = "";
    while (true) {
      const subtitleElements = document.querySelectorAll(".ytp-caption-segment");
      text = Array.from(subtitleElements).map(el => el.innerText.trim()).join(" ");
      let similarityScore = findSimilarity(text, lastSubtitle);
      console.log('text', text);
      console.log("lastSubtitle", lastSubtitle);
      if (lastSubtitle && similarityScore < 0.65) {
        console.log("lastSubtitle", lastSubtitle);
        video.pause();
        showModal();
        startSpeechRecognition(lastSubtitle);
        break;
      }

      lastSubtitle = text;
      await waitFor(500);
    }
  }
}

function findSimilarity(spokenText, expectedText) {
  let distance = levenshtein.get(spokenText.toLowerCase(), expectedText.toLowerCase());
  let maxLen = Math.max(spokenText.length, expectedText.length);
  return 1 - distance / maxLen;
}

function startSpeechRecognition(expectedText, repeat = 0) {
  isListening = true;
  clearInterval(subtitleInterval);

  const recognition = new webkitSpeechRecognition() || new SpeechRecognition();
  recognition.lang = currentLang;
  recognition.continuous = false;
  recognition.interimResults = false;
  if (!repeat) {
    userText = ""
    warningText = ""
    userScore = 0;
    showModal();
  }

  recognition.onresult = (event) => {


    let spokenText = event.results[event.results.length - 1][0].transcript.trim();
    userText = spokenText;
    let similarity = findSimilarity(spokenText, expectedText);
    userScore = Math.ceil(similarity * 10);
    chrome.storage.sync.get(["score"], (data) => {
      if (chrome.runtime.lastError) {
        console.error("Storage error:", chrome.runtime.lastError);
        return;
      }

      let currentScore = data.score || 0; // Default to 0 if score is not set
      let newScore = parseFloat(currentScore) + parseFloat(userScore) * 10;

      chrome.storage.sync.set({
        score: newScore
      }, () => {
        if (chrome.runtime.lastError) {
          console.error("Storage error:", chrome.runtime.lastError);
        } else {
          console.log("Score updated:", newScore);
        }
      });
    });
    showModal();
    if (similarity >= 0.8) {
      console.log("✅ Correct! Resuming...");
      incorrectCount = 0;
      warningText = "";
    } else {
      if (!incorrectCount) {
        warningText = "Incorrect. Repeat"
      } else {
        warningText = "Incorrect. video countiunes"
      }
      incorrectCount += 1;

    }
    showModal();
    recognition.abort();
  };

  recognition.onerror = (event) => {
    recognition.abort();
  };

  recognition.soundend = () => {
    recognition.abort();
  };

  recognition.onend = () => {
    if (isActive && incorrectCount !== 1) {
      setTimeout(() => {
        isListening = false;
        closeModal();
        video.play();
        subtitleInterval = setInterval(getSubtitles, 5000);
      }, 2000);
    } else {
      console.log("REPEAT");

      startSpeechRecognition(expectedText, 1)
    }
  };

  recognition.start();
}

// Start checking subtitles initially
chrome.storage.sync.get("isActive", (data) => {
  if (data.isActive) {
    chrome.storage.sync.get("language", (data) => {
      console.log("data.language", data.language);

      if (data.language) {
        currentLang = data.language
      }
      subtitleInterval = setInterval(getSubtitles, 5000);
    });
  } else {
    clearInterval(subtitleInterval);
    console.log("Extension is inactive, not running script.");
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "toggleActive") {
    console.log("Toggle state changed:", message.isActive);
    isActive = message.isActive;
    if (message.isActive) {
      subtitleInterval = setInterval(getSubtitles, 5000);
    } else {
      clearInterval(subtitleInterval);
      console.log("Extension turned off, stopping script.");
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "languageSelect") {
    console.log("languageSelect state changed:", message.language);
    currentLang = message.language
  }
});
createModal();
setTimeout(() => {
  const captionsButton = document.querySelector(".ytp-subtitles-button.ytp-button");
  if (captionsButton && captionsButton.getAttribute("aria-pressed") === "false") {
    captionsButton.click();
  }
}, 1500);