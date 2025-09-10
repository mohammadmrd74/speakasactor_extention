document.addEventListener("DOMContentLoaded", () => {
    const searchBox = document.getElementById("searchBox");
    const textsContainer = document.getElementById("textsContainer");
    const emptyState = document.getElementById("emptyState");
    const totalCount = document.getElementById("totalCount");
    const languageCount = document.getElementById("languageCount");
    const recentCount = document.getElementById("recentCount");
    const clearAllBtn = document.getElementById("clearAll");
    const filterButtons = document.querySelectorAll(".filter-btn");

    let allTexts = [];
    let filteredTexts = [];
    let currentFilter = "all";

    // Load saved texts
    chrome.storage.sync.get(["difficultTexts"], (data) => {
        allTexts = data.difficultTexts || [];
        updateStats();
        filterTexts();
    });

    // Search functionality
    searchBox.addEventListener("input", () => {
        filterTexts();
    });

    // Filter buttons
    filterButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            filterButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentFilter = btn.dataset.filter;
            filterTexts();
        });
    });

    // Clear all functionality
    clearAllBtn.addEventListener("click", () => {
        if (confirm("Are you sure you want to delete all saved texts? This action cannot be undone.")) {
            chrome.storage.sync.set({ difficultTexts: [] }, () => {
                allTexts = [];
                updateStats();
                filterTexts();
            });
        }
    });

    function updateStats() {
        totalCount.textContent = allTexts.length;

        // Count unique languages
        const uniqueLanguages = new Set(allTexts.map(text => text.language));
        languageCount.textContent = uniqueLanguages.size;

        // Count texts from this week
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const thisWeekTexts = allTexts.filter(text => new Date(text.timestamp) > oneWeekAgo);
        recentCount.textContent = thisWeekTexts.length;
    }

    function filterTexts() {
        let filtered = [...allTexts];

        // Apply search filter
        const searchTerm = searchBox.value.toLowerCase().trim();
        if (searchTerm) {
            filtered = filtered.filter(text => 
                text.text.toLowerCase().includes(searchTerm) ||
                text.videoTitle.toLowerCase().includes(searchTerm) ||
                text.language.toLowerCase().includes(searchTerm) ||
                (text.translation && text.translation.toLowerCase().includes(searchTerm))
            );
        }

        // Apply time filter
        const now = new Date();
        switch (currentFilter) {
            case "recent":
                const threeDaysAgo = new Date();
                threeDaysAgo.setDate(now.getDate() - 3);
                filtered = filtered.filter(text => new Date(text.timestamp) > threeDaysAgo);
                break;
            case "week":
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(now.getDate() - 7);
                filtered = filtered.filter(text => new Date(text.timestamp) > oneWeekAgo);
                break;
        }

        // Sort by timestamp (newest first)
        filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        filteredTexts = filtered;
        displayTexts();
    }

    function displayTexts() {
        if (filteredTexts.length === 0) {
            textsContainer.style.display = "none";
            emptyState.style.display = "block";
            return;
        }

        textsContainer.style.display = "grid";
        emptyState.style.display = "none";

        textsContainer.innerHTML = filteredTexts.map((text, index) => {
            const date = new Date(text.timestamp);
            const formattedDate = date.toLocaleDateString();
            const formattedTime = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            const relativeTime = getRelativeTime(date);

            return `
                <div class="text-item" data-index="${index}">
                    <div class="text-content">"${text.text}"</div>
                    ${text.translation ? `
                        <div class="translation-display" style="
                            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                            color: white;
                            padding: 16px;
                            border-radius: 8px;
                            margin-top: 16px;
                            margin-bottom: 16px;
                            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
                        ">
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
                            ">${text.translation}</div>
                        </div>
                    ` : ''}
                    <div class="text-meta">
                        <div class="meta-info">
                            <strong>${text.videoTitle}</strong><br>
                            <span>🌐 ${getLanguageName(text.language)} • 📅 ${formattedDate} ${formattedTime}</span><br>
                            <span style="color: #667eea;">${relativeTime}</span>
                        </div>
                        <div class="text-actions">
                            <a href="${text.videoUrl}" target="_blank" class="action-btn video-btn">
                                <span>📺</span> Watch
                            </a>
                            ${!text.translation ? `
                                <button class="action-btn translate-btn" data-text="${text.text.replace(/"/g, '&quot;')}" data-index="${index}">
                                    <span>🌐</span> Translate
                                </button>
                            ` : ''}
                            <button class="action-btn delete-btn" data-original-index="${allTexts.indexOf(text)}">
                                <span>🗑️</span> Delete
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Add event listeners to buttons
        textsContainer.querySelectorAll('.translate-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
                const text = this.getAttribute('data-text');
                const index = this.getAttribute('data-index');
                await showInlineTranslation(text, this, parseInt(index));
            });
        });

        textsContainer.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const originalIndex = parseInt(this.getAttribute('data-original-index'));
                deleteText(originalIndex);
            });
        });
    }

    function getLanguageName(code) {
        const languages = {
            'en-US': '🇺🇸 English (US)',
            'en-GB': '🇬🇧 English (UK)',
            'de-DE': '🇩🇪 German',
            'es-ES': '🇪🇸 Spanish',
            'fr-FR': '🇫🇷 French',
            'it-IT': '🇮🇹 Italian',
            'pt-PT': '🇵🇹 Portuguese',
            'ja-JP': '🇯🇵 Japanese',
            'ko-KR': '🇰🇷 Korean',
            'zh-CN': '🇨🇳 Chinese (Simplified)'
        };
        return languages[code] || code;
    }

    function getRelativeTime(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor(diffMs / (1000 * 60));

        if (diffDays > 0) {
            return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        } else if (diffHours > 0) {
            return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        } else if (diffMinutes > 0) {
            return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
        } else {
            return 'Just now';
        }
    }

    function deleteText(originalIndex) {
        if (confirm("Are you sure you want to delete this text?")) {
            allTexts.splice(originalIndex, 1);
            chrome.storage.sync.set({ difficultTexts: allTexts }, () => {
                updateStats();
                filterTexts();
            });
        }
    }

    async function showInlineTranslation(text, button, index) {
        const originalHTML = button.innerHTML;
        button.innerHTML = '<span>⏳</span> Translating...';
        button.disabled = true;

        try {
            const translation = await translateText(text);
            
            if (translation) {
                // Find the text item container
                const textItem = button.closest('.text-item');
                let translationDiv = textItem.querySelector('.translation-display');
                
                if (!translationDiv) {
                    translationDiv = document.createElement('div');
                    translationDiv.className = 'translation-display';
                    translationDiv.style.cssText = `
                        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                        color: white;
                        padding: 16px;
                        border-radius: 12px;
                        margin-top: 16px;
                        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
                    `;
                    textItem.appendChild(translationDiv);
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
                
                button.innerHTML = '<span>✅</span> Translated';
                setTimeout(() => {
                    button.innerHTML = originalHTML;
                    button.disabled = false;
                }, 3000);
            } else {
                throw new Error("Translation failed");
            }
        } catch (error) {
            console.error("Translation error:", error);
            button.innerHTML = '<span>❌</span> Failed';
            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.disabled = false;
            }, 2000);
        }
    }

    async function translateText(text) {
        try {
            // Method 1: Try LibreTranslate API (free, no key needed)
            try {
                const libreResponse = await fetch('https://libretranslate.de/translate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        q: text,
                        source: 'auto',
                        target: 'en',
                        format: 'text'
                    })
                });
                
                if (libreResponse.ok) {
                    const libreData = await libreResponse.json();
                    if (libreData.translatedText && libreData.translatedText !== text) {
                        return libreData.translatedText;
                    }
                }
            } catch (e) {
                console.log("LibreTranslate failed, trying next method");
            }

            // Method 2: Try MyMemory with language detection
            const sourceLanguage = detectLanguage(text);
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
            
            // Method 3: Dictionary lookup for single words
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

            // Method 4: Simple linguistic patterns (basic fallback)
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

    // Listen for storage changes (in case data is updated from other parts of the extension)
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.difficultTexts) {
            allTexts = changes.difficultTexts.newValue || [];
            updateStats();
            filterTexts();
        }
    });
});