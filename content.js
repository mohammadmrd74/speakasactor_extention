console.log("YouTube Subtitle Listener Loaded!");
var levenshtein = window.Levenshtein;
let video = document.querySelector("video");
let text = "";
let userText = "";
let lastSubtitle = "";
let say = "";
let subtitleInterval;
let userScore = 0;
let isListening = false;

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
      <p>${text}</p>
      <p style="margin-top:10px">what you said: ${userText}</p>
      <div>score: ${userScore}</div>
  `;
  }
}

function closeModal() {
  let modal = document.getElementById("speakasactor_modal");
  if (modal) {
    modal.style.display = "none";
  }
}



function getSubtitles() {
  if (isListening) return;
  if (!video) {
    console.log('video not loaded yet!');
    video = document.querySelector("video");
  };


  clearInterval(subtitleInterval);
  let intervalId = setInterval(() => {
    const subtitleElements = document.querySelectorAll(".ytp-caption-segment");
    text = Array.from(subtitleElements).map(el => el.innerText.trim()).join(" ");
    let similarityScore = findSimilarity(text, lastSubtitle);
    console.log('text', text);
    console.log("lastSubtitle", lastSubtitle);

    if (similarityScore < 0.5) {
      if (text && text.length > 20) {

        clearInterval(intervalId);
        lastSubtitle = text;
        video.pause();
        showModal();
        startSpeechRecognition(text);
      }

    }
  }, 500);
}

function findSimilarity(spokenText, expectedText) {
  let distance = levenshtein.get(spokenText.toLowerCase(), expectedText.toLowerCase());
  let maxLen = Math.max(spokenText.length, expectedText.length);
  return 1 - distance / maxLen;
}

function startSpeechRecognition(expectedText) {
  isListening = true;
  clearInterval(subtitleInterval);

  const recognition = new webkitSpeechRecognition() || new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = false;
  userText = ""
  userScore = 0;
  showModal();

  recognition.onresult = (event) => {


    let spokenText = event.results[event.results.length - 1][0].transcript.trim();
    userText = spokenText;
    let similarity = findSimilarity(spokenText, expectedText);
    userScore = Math.ceil(similarity * 10);
    chrome.storage.sync.get("score", (data) => {
      chrome.storage.sync.set({
        score: data.score || data.score === 0 ? parseFloat(data.score) + parseFloat(userScore) * 10 : 0
      });
    });
    showModal();
    if (similarity >= 0.8) {
      console.log("✅ Correct! Resuming...");
    } else {
      console.log("❌ Incorrect. Keep speaking...");
    }
    recognition.abort();
  };

  recognition.onerror = (event) => {
    recognition.abort();
  };

  recognition.soundend = () => {
    recognition.abort();
  };

  recognition.onend = () => {
    setTimeout(() => {
      isListening = false;
      closeModal();
      video.play();
      subtitleInterval = setInterval(getSubtitles, 5000);
    }, 4000);
  };

  recognition.start();
}

// Start checking subtitles initially
chrome.storage.sync.get("isActive", (data) => {
  if (data.isActive) {
    subtitleInterval = setInterval(getSubtitles, 5000);
  } else {
    clearInterval(subtitleInterval);
    console.log("Extension is inactive, not running script.");
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "toggleActive") {
    console.log("Toggle state changed:", message.isActive);
    if (message.isActive) {
      subtitleInterval = setInterval(getSubtitles, 5000);
    } else {
      clearInterval(subtitleInterval);
      console.log("Extension turned off, stopping script.");
    }
  }
});
createModal();
setTimeout(() => {
  const captionsButton = document.querySelector(".ytp-subtitles-button.ytp-button");
  if (captionsButton && captionsButton.getAttribute("aria-pressed") === "false") {
    captionsButton.click();
  }
}, 1500);