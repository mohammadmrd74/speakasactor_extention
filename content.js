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
let button = '';

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
      <div style="
        font-size: 22px;
        text-align: center;
        font-weight: 700;
      ">Speak Now!</div>
      <div style="
        margin-top: 7px;
        border: 1px solid;
        padding: 11px;
        border-radius: 8px;
        ">${lastSubtitle}</div>
      <div style="margin-top:10px;margin-top: 11px;border: 1px dashed;padding: 11px;color: #dbdfe7;border-radius: 8px;">You said: ${userText}</div>
      <div 
        style="text-align: center;
        margin-top: 12px;
        font-size: 30px;"
        >score: ${userScore}</div>
      <div style="margin-top:10px;color:red;">${warningText}</div>
  `;
  }
}

function showButton() {
  let modal = document.getElementById("speakasactor_modal");
  if (modal) {
    button = document.createElement("button");
    button.textContent = "Continue";
    button.style.marginTop = "10px";
    button.style.padding = "8px 16px";
    button.style.border = "none";
    button.style.borderRadius = "5px";
    button.style.background = "#ffffff";
    button.style.color = "#000";
    button.style.cursor = "pointer";

    function startVideo() {
      video.play();
      subtitleInterval = setInterval(getSubtitles, 5000);
      modal.style.display = "none";
      button.remove();
    }

    button.onclick = startVideo;

    translateButton = document.createElement("a");
    translateButton.innerHTML = "Translate";
    translateButton.style.marginTop = "10px";
    translateButton.style.marginLeft = "5px";
    translateButton.style.marginRight = "5px";
    translateButton.style.padding = "8px 16px";
    translateButton.style.border = "none";
    translateButton.style.borderRadius = "5px";
    translateButton.style.background = "#ffffff";
    translateButton.style.textDecoration = "none";
    translateButton.style.fontSize = "13px";
    translateButton.style.color = "#000";
    translateButton.style.cursor = "pointer";
    translateButton.setAttribute('href', `https://translate.google.com/?sl=auto&tl=en&text=${lastSubtitle}&op=translate`);
    translateButton.setAttribute('target', `_blank`);

    modal.appendChild(button);
    modal.appendChild(translateButton);
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
  if (text && text.length > 9) {
    clearInterval(subtitleInterval);
    lastSubtitle = "";
    while (true) {
      const subtitleElements = document.querySelectorAll(".ytp-caption-segment");
      text = Array.from(subtitleElements).map(el => el.innerText.trim()).join(" ");
      let similarityScore = findSimilarity(text, lastSubtitle);
      if (lastSubtitle && similarityScore < 0.65) {
        video.pause();
        showModal();
        startSpeechRecognition(lastSubtitle);
        break;
      }

      lastSubtitle = text.replace(/–/g, "");
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
    if (similarity >= 0.7) {
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
        // closeModal();
        // video.play();
        // subtitleInterval = setInterval(getSubtitles, 5000);
        showButton();
      }, 1000);
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