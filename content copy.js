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
  
  // Modern modal styling
  Object.assign(modal.style, {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 100%)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    color: "#333",
    padding: "32px",
    borderRadius: "20px",
    fontSize: "16px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
    zIndex: "999999",
    display: "none",
    boxShadow: "0 20px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.2)",
    minWidth: "400px",
    maxWidth: "500px",
    border: "1px solid rgba(255,255,255,0.3)",
    animation: "modalSlideIn 0.3s ease-out"
  });

  // Add animation keyframes
  if (!document.getElementById('speakasactor-styles')) {
    const style = document.createElement('style');
    style.id = 'speakasactor-styles';
    style.textContent = `
      @keyframes modalSlideIn {
        0% {
          opacity: 0;
          transform: translate(-50%, -60%);
        }
        100% {
          opacity: 1;
          transform: translate(-50%, -50%);
        }
      }
      
      @keyframes pulseGlow {
        0%, 100% {
          box-shadow: 0 0 20px rgba(79, 172, 254, 0.3);
        }
        50% {
          box-shadow: 0 0 30px rgba(79, 172, 254, 0.6);
        }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(modal);
}

// Function to show the modal
function showModal() {
  let modal = document.getElementById("speakasactor_modal");
  if (modal) {
    modal.style.display = "block";
    modal.innerHTML = `
      <div style="
        text-align: center;
        margin-bottom: 24px;
      ">
        <div style="
          font-size: 24px;
          font-weight: 700;
          color: #333;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        ">
          <span style="font-size: 28px;">🎤</span>
          Speak Now!
        </div>
        <div style="
          font-size: 14px;
          color: #666;
          opacity: 0.8;
        ">
          Pronounce the subtitle clearly
        </div>
      </div>

      <div style="
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px;
        border-radius: 16px;
        margin-bottom: 16px;
        box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
      ">
        <div style="
          font-size: 12px;
          opacity: 0.9;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        ">Expected Text</div>
        <div style="
          font-size: 18px;
          font-weight: 500;
          line-height: 1.4;
        ">${lastSubtitle}</div>
      </div>

      ${userText ? `
        <div style="
          background: rgba(255,255,255,0.7);
          border: 2px dashed rgba(102, 126, 234, 0.3);
          padding: 20px;
          border-radius: 16px;
          margin-bottom: 16px;
          transition: all 0.3s ease;
        ">
          <div style="
            font-size: 12px;
            color: #666;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          ">Your Response</div>
          <div style="
            font-size: 16px;
            color: #333;
            line-height: 1.4;
          ">${userText}</div>
        </div>
      ` : ''}

      ${userScore > 0 ? `
        <div style="
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          padding: 16px;
          border-radius: 12px;
          text-align: center;
          margin-bottom: 16px;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        ">
          <div style="
            font-size: 12px;
            opacity: 0.9;
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          ">Accuracy Score</div>
          <div style="
            font-size: 24px;
            font-weight: 700;
          ">${userScore}/10</div>
        </div>
      ` : ''}

      ${warningText ? `
        <div style="
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          padding: 16px;
          border-radius: 12px;
          text-align: center;
          margin-bottom: 16px;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        ">
          <span style="font-size: 16px;">⚠️</span>
          <span style="font-weight: 500;">${warningText}</span>
        </div>
      ` : ''}
    `;
  }
}

function showButton() {
  let modal = document.getElementById("speakasactor_modal");
  if (modal) {
    // Create main button container
    const buttonContainer = document.createElement("div");
    Object.assign(buttonContainer.style, {
      display: "flex",
      flexDirection: "column",
      gap: "16px",
      marginTop: "20px"
    });

    // Create secondary buttons container
    const secondaryButtonsContainer = document.createElement("div");
    Object.assign(secondaryButtonsContainer.style, {
      display: "flex",
      gap: "12px",
      justifyContent: "center"
    });

    // Continue button container with hint
    const continueContainer = document.createElement("div");
    Object.assign(continueContainer.style, {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "8px",
      width: "100%"
    });

    // Continue button
    button = document.createElement("button");
    button.textContent = "▶️ Continue";
    Object.assign(button.style, {
      padding: "16px 32px",
      border: "none",
      borderRadius: "12px",
      background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
      color: "white",
      cursor: "pointer",
      fontSize: "18px",
      fontWeight: "700",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
      boxShadow: "0 4px 15px rgba(79, 172, 254, 0.4)",
      transition: "all 0.2s ease",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      width: "100%",
      minHeight: "54px"
    });

    // Space key hint
    const spaceHint = document.createElement("div");
    spaceHint.innerHTML = "or press <kbd>Space</kbd>";
    Object.assign(spaceHint.style, {
      fontSize: "14px",
      color: "#666",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
    });

    // Style the kbd element
    const kbdStyle = document.createElement("style");
    kbdStyle.textContent = `
      kbd {
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        border: 1px solid #ced4da;
        border-radius: 6px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        color: #495057;
        display: inline-block;
        font-family: monospace;
        font-size: 12px;
        font-weight: 600;
        line-height: 1;
        padding: 4px 8px;
        text-transform: uppercase;
        white-space: nowrap;
      }
    `;
    if (!document.getElementById('kbd-styles')) {
      kbdStyle.id = 'kbd-styles';
      document.head.appendChild(kbdStyle);
    }

    // Hover effects
    button.onmouseover = () => {
      button.style.transform = "translateY(-2px)";
      button.style.boxShadow = "0 6px 20px rgba(79, 172, 254, 0.6)";
    };
    button.onmouseout = () => {
      button.style.transform = "translateY(0)";
      button.style.boxShadow = "0 4px 15px rgba(79, 172, 254, 0.4)";
    };

    function startVideo() {
      video.play();
      subtitleInterval = setInterval(getSubtitles, 5000);
      modal.style.display = "none";
      buttonContainer.remove();
    }

    button.onclick = startVideo;

    // Add space key listener for continue button
    const spaceKeyListener = (event) => {
      if (event.code === 'Space' && modal.style.display === 'block') {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        startVideo();
        document.removeEventListener('keydown', spaceKeyListener);
      }
    };
    document.addEventListener('keydown', spaceKeyListener, true);

    // Translate button
    const translateButton = document.createElement("button");
    translateButton.innerHTML = "🌐 Translate";
    Object.assign(translateButton.style, {
      padding: "14px 20px",
      border: "2px solid rgba(102, 126, 234, 0.3)",
      borderRadius: "12px",
      background: "rgba(255,255,255,0.7)",
      fontSize: "16px",
      fontWeight: "600",
      color: "#667eea",
      cursor: "pointer",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
      transition: "all 0.2s ease",
      display: "flex",
      alignItems: "center",
      gap: "8px"
    });

    // Hover effects for translate button
    translateButton.onmouseover = () => {
      translateButton.style.transform = "translateY(-2px)";
      translateButton.style.background = "rgba(102, 126, 234, 0.1)";
      translateButton.style.borderColor = "#667eea";
    };
    translateButton.onmouseout = () => {
      translateButton.style.transform = "translateY(0)";
      translateButton.style.background = "rgba(255,255,255,0.7)";
      translateButton.style.borderColor = "rgba(102, 126, 234, 0.3)";
    };

    translateButton.onclick = () => {
      showInlineTranslation(lastSubtitle, translateButton);
    };

    // Save difficult text button
    const saveButton = document.createElement("button");
    saveButton.innerHTML = "📚 Save";
    Object.assign(saveButton.style, {
      padding: "14px 20px",
      border: "2px solid #e67e22",
      borderRadius: "12px",
      background: "linear-gradient(135deg, #f39c12 0%, #e67e22 100%)",
      fontSize: "16px",
      fontWeight: "600",
      color: "white",
      cursor: "pointer",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
      transition: "all 0.2s ease",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      boxShadow: "0 4px 12px rgba(243, 156, 18, 0.3)"
    });

    // Hover effects for save button
    saveButton.onmouseover = () => {
      saveButton.style.transform = "translateY(-2px)";
      saveButton.style.background = "linear-gradient(135deg, #e67e22 0%, #d35400 100%)";
      saveButton.style.boxShadow = "0 6px 20px rgba(243, 156, 18, 0.5)";
    };
    saveButton.onmouseout = () => {
      saveButton.style.transform = "translateY(0)";
      saveButton.style.background = "linear-gradient(135deg, #f39c12 0%, #e67e22 100%)";
      saveButton.style.boxShadow = "0 4px 12px rgba(243, 156, 18, 0.3)";
    };

    saveButton.onclick = () => {
      // Check if there's a translation available
      const translationDiv = document.getElementById("translation-display");
      let translation = null;
      if (translationDiv) {
        const translationText = translationDiv.querySelector('div:last-child');
        if (translationText) {
          translation = translationText.textContent;
        }
      }
      
      saveDifficultText(lastSubtitle, translation);
      saveButton.innerHTML = "✅ Saved";
      saveButton.style.background = "linear-gradient(135deg, #10b981 0%, #059669 100%)";
      saveButton.style.borderColor = "#10b981";
      saveButton.style.color = "white";
      saveButton.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.3)";
      setTimeout(() => {
        saveButton.innerHTML = "📚 Save";
        saveButton.style.background = "linear-gradient(135deg, #f39c12 0%, #e67e22 100%)";
        saveButton.style.borderColor = "#e67e22";
        saveButton.style.color = "white";
        saveButton.style.boxShadow = "0 4px 12px rgba(243, 156, 18, 0.3)";
      }, 2000);
    };

    // Append button and hint to continue container
    continueContainer.appendChild(button);
    continueContainer.appendChild(spaceHint);
    
    // Add secondary buttons to their container
    secondaryButtonsContainer.appendChild(translateButton);
    secondaryButtonsContainer.appendChild(saveButton);
    
    // Add containers to main button container
    buttonContainer.appendChild(continueContainer);
    buttonContainer.appendChild(secondaryButtonsContainer);
    modal.appendChild(buttonContainer);
  }
}

async function showInlineTranslation(text, button) {
  const originalHTML = button.innerHTML;
  button.innerHTML = "⏳ Translating...";
  button.disabled = true;

  try {
    // First try MyMemory API (free, no key required)
    const translation = await translateText(text);
    
    if (translation) {
      // Create translation display
      const modal = document.getElementById("speakasactor_modal");
      let translationDiv = document.getElementById("translation-display");
      
      if (!translationDiv) {
        translationDiv = document.createElement("div");
        translationDiv.id = "translation-display";
        Object.assign(translationDiv.style, {
          background: "linear-gradient(135deg, #0d055aff 0%, #071c49ff 100%)",
          color: "white",
          padding: "16px",
          borderRadius: "12px",
          marginBottom: "16px",
          marginTop: "16px",
          boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)"
        });
        modal.appendChild(translationDiv);
      }
      
      translationDiv.innerHTML = `
        <div style="
          font-size: 12px;
          opacity: 0.9;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        ">Translation</div>
        <div style="
          font-size: 16px;
          line-height: 1.4;
        ">${translation}</div>
      `;
      
      button.innerHTML = "✅ Translated";
      setTimeout(() => {
        button.innerHTML = originalHTML;
        button.disabled = false;
      }, 3000);
    } else {
      throw new Error("Translation failed");
    }
  } catch (error) {
    console.error("Translation error:", error);
    button.innerHTML = "❌ Failed";
    setTimeout(() => {
      button.innerHTML = originalHTML;
      button.disabled = false;
    }, 2000);
  }
}

async function translateText(text) {
  try {
    // Method 1: Try MyMemory with selected language
    const sourceLanguage = detectLanguageForAPI(text);
    if (sourceLanguage && sourceLanguage !== 'en') {
      try {
        const myMemoryResponse = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLanguage}|en`);
        const myMemoryData = await myMemoryResponse.json();
        
        if (myMemoryData.responseStatus === 200 && myMemoryData.responseData?.translatedText) {
          const translation = myMemoryData.responseData.translatedText;
          if (translation !== text) {
            return translation;
          }
        }
      } catch (e) {
        console.log("MyMemory failed, trying next method");
      }
    }
    
    // Method 2: Dictionary lookup for single words
    if (text.split(' ').length === 1) {
      try {
        const dictResponse = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(text)}`);
        if (dictResponse.ok) {
          const dictData = await dictResponse.json();
          if (dictData[0]?.meanings?.[0]?.definitions?.[0]?.definition) {
            return `Definition: ${dictData[0].meanings[0].definitions[0].definition}`;
          }
        }
      } catch (e) {
        console.log("Dictionary API failed");
      }
    }

    // Method 3: Simple linguistic patterns (basic fallback)
    const simpleTranslation = getSimpleTranslation(text);
    if (simpleTranslation) {
      return simpleTranslation;
    }
    
    return "Translation not available";
  } catch (error) {
    console.error("Translation API error:", error);
    return "Translation failed";
  }
}

function detectLanguageForAPI(text) {
  // Use the currently selected language from dropdown
  // Map dropdown language codes to API-compatible codes
  const apiLangMap = {
    'en-US': 'en',
    'en-GB': 'en',
    'de-DE': 'de',
    'es-ES': 'es',
    'fr-FR': 'fr',
    'it-IT': 'it',
    'pt-PT': 'pt',
    'ja-JP': 'ja',
    'ko-KR': 'ko',
    'zh-CN': 'zh'
  };
  return apiLangMap[currentLang] || 'en';
}

function detectLanguage(text) {
  // Simple language detection based on common patterns
  const commonWords = {
    'es': ['el', 'la', 'de', 'que', 'y', 'es', 'en', 'un', 'se', 'no', 'te', 'lo', 'le', 'da', 'su', 'por', 'son', 'con', 'para', 'una', 'sur', 'también'],
    'fr': ['le', 'de', 'et', 'à', 'un', 'il', 'être', 'et', 'en', 'avoir', 'que', 'pour', 'dans', 'ce', 'son', 'une', 'sur', 'avec', 'ne', 'se', 'pas', 'tout', 'plus', 'par'],
    'de': ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich', 'des', 'auf', 'für', 'ist', 'im', 'dem', 'nicht', 'ein', 'eine', 'als', 'auch', 'es', 'an'],
    'it': ['il', 'di', 'che', 'e', 'la', 'per', 'un', 'in', 'con', 'del', 'da', 'a', 'al', 'le', 'si', 'dei', 'sul', 'una', 'sono', 'della', 'nel', 'alla'],
    'pt': ['de', 'a', 'o', 'que', 'e', 'do', 'da', 'em', 'um', 'para', 'é', 'com', 'não', 'uma', 'os', 'no', 'se', 'na', 'por', 'mais', 'as', 'dos'],
    'ja': ['の', 'に', 'は', 'を', 'た', 'が', 'で', 'て', 'と', 'し', 'れ', 'さ', 'ある', 'いる', 'も', 'する', 'から', 'な', 'こと', 'として'],
    'ko': ['이', '그', '에', '의', '는', '로', '을', '와', '한', '하다', '있다', '되다', '수', '없다', '않다', '같다', '것', '들', '많다', '크다'],
    'zh': ['的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去'],
    'ru': ['в', 'и', 'не', 'на', 'я', 'быть', 'он', 'с', 'что', 'а', 'по', 'это', 'она', 'этот', 'к', 'но', 'они', 'мы', 'как', 'из']
  };
  
  const words = text.toLowerCase().split(/\s+/);
  let maxMatches = 0;
  let detectedLang = null;
  
  for (const [lang, commonList] of Object.entries(commonWords)) {
    const matches = words.filter(word => commonList.includes(word)).length;
    if (matches > maxMatches && matches > 0) {
      maxMatches = matches;
      detectedLang = lang;
    }
  }
  
  // If no language detected or text is likely English, return null
  if (!detectedLang || /^[a-zA-Z\s.,!?'"]+$/.test(text)) {
    return null;
  }
  
  return detectedLang;
}

function getSimpleTranslation(text) {
  // Basic phrase translations for common expressions
  const simpleTranslations = {
    'hola': 'hello',
    'gracias': 'thank you',
    'por favor': 'please',
    'lo siento': 'I am sorry',
    'bonjour': 'hello',
    'merci': 'thank you',
    's\'il vous plaît': 'please',
    'je suis désolé': 'I am sorry',
    'guten tag': 'good day',
    'danke': 'thank you',
    'bitte': 'please',
    'entschuldigung': 'excuse me',
    'ciao': 'hello',
    'grazie': 'thank you',
    'prego': 'please',
    'scusa': 'excuse me',
    'こんにちは': 'hello',
    'ありがとう': 'thank you',
    'すみません': 'excuse me',
    '안녕하세요': 'hello',
    '감사합니다': 'thank you',
    '죄송합니다': 'I am sorry'
  };
  
  const lowerText = text.toLowerCase().trim();
  return simpleTranslations[lowerText] || null;
}

function saveDifficultText(text, translation = null) {
  const timestamp = new Date().toISOString();
  const videoTitle = document.querySelector('h1.ytd-video-primary-info-renderer')?.textContent || 'Unknown Video';
  const videoUrl = window.location.href;
  
  const difficultText = {
    text: text,
    translation: translation,
    timestamp: timestamp,
    videoTitle: videoTitle,
    videoUrl: videoUrl,
    language: currentLang
  };

  chrome.storage.sync.get(['difficultTexts'], (data) => {
    const difficultTexts = data.difficultTexts || [];
    difficultTexts.push(difficultText);
    
    // Keep only the last 100 entries to avoid storage limits
    if (difficultTexts.length > 100) {
      difficultTexts.splice(0, difficultTexts.length - 100);
    }
    
    chrome.storage.sync.set({ difficultTexts }, () => {
      if (chrome.runtime.lastError) {
        console.error("Storage error:", chrome.runtime.lastError);
      } else {
        console.log("Difficult text saved:", text);
      }
    });
  });
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
      let newScore = parseFloat(currentScore) + parseFloat(userScore);

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