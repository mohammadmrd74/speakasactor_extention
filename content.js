console.log("YouTube Subtitle Listener Loaded!");
var levenshtein = window.Levenshtein;
let video = document.querySelector("video");
let lastSubtitle = "";
let say = "";
let subtitleInterval;
let isListening = false;

function getSubtitles() {
  if (isListening) return;
  if (!video) {
    console.log('video not loaded yet!');
    video = document.querySelector("video");
  };

  const subtitleElements = document.querySelectorAll(".ytp-caption-segment");
  let text = Array.from(subtitleElements).map(el => el.innerText.trim()).join(" ");
  console.log(text, '<====>', lastSubtitle);

  if (text && text !== lastSubtitle) {
    say = lastSubtitle
    lastSubtitle = text;
    console.log("Final Subtitle:", say);
    if (lastSubtitle.length > 20) {
      video.pause();
      if (say)
        startSpeechRecognition(say);
    }
  }
}

function startSpeechRecognition(expectedText) {
  isListening = true;
  clearInterval(subtitleInterval);

  const recognition = new webkitSpeechRecognition() || new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = false; // Keep listening continuously
  recognition.interimResults = false;

  recognition.onresult = (event) => {

    let spokenText = event.results[event.results.length - 1][0].transcript.trim();
    console.log("User Said:", spokenText);

    let distance = levenshtein.get(spokenText.toLowerCase(), expectedText.toLowerCase());
    let maxLen = Math.max(spokenText.length, expectedText.length);
    let similarity = 1 - distance / maxLen;

    console.log(`Similarity: ${similarity.toFixed(2)}`);

    if (similarity >= 0.8) {
      console.log("✅ Correct! Resuming...");
    } else {
      console.log("❌ Incorrect. Keep speaking...");
    }
    recognition.abort();
    // resumeSubtitleChecking();
  };

  recognition.onerror = (event) => {
    console.log("Speech Recognition Error:", event.error);
    recognition.abort();
    // resumeSubtitleChecking();
  };

  recognition.soundend = () => {
    console.log("sound end. aborting...");
    recognition.abort();
    // resumeSubtitleChecking();
  };

  recognition.onend = () => {
    console.log("⚠️ Speech recognition ended. resuming after 2 sec ...");
    setTimeout(() => {
      isListening = false;
      video.play();
      subtitleInterval = setInterval(getSubtitles, 1500);
    }, 2000);
  };

  recognition.start();
}

// function resumeSubtitleChecking() {
//   setTimeout(() => {
//     isListening = false;
//     video.play();
//     subtitleInterval = setInterval(getSubtitles, 1000);
//   }, 2000);
// }

// Start checking subtitles initially
chrome.storage.sync.get("isActive", (data) => {
  if (data.isActive) {
    subtitleInterval = setInterval(getSubtitles, 1500);
  } else {
    clearInterval(subtitleInterval);
    console.log("Extension is inactive, not running script.");
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "toggleActive") {
    console.log("Toggle state changed:", message.isActive);
    if (message.isActive) {
      subtitleInterval = setInterval(getSubtitles, 1500);
    } else {
      clearInterval(subtitleInterval);
      console.log("Extension turned off, stopping script.");
    }
  }
});