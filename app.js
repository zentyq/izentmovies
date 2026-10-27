/**
 * iZent Cinema - Next-Gen In-Browser YouTube Streaming Experience
 * Powered by YouTube Data API v3 & Cohere AI
 */

(function () {
  'use strict';

  // --- Runtime Configuration (from Coolify Container Environment or fallback) ---
  const env = window.__ENV__ || {};
  const CONFIG = {
    // API Keys are injected dynamically at runtime via env-config.js (Docker/Coolify)
    // or loaded from localStorage if provided locally. Never commit secrets to code.
    YOUTUBE_API_KEY: env.YOUTUBE_API_KEY || localStorage.getItem('IZENT_YOUTUBE_API_KEY') || '',
    COHERE_API_KEY: env.COHERE_API_KEY || localStorage.getItem('IZENT_COHERE_API_KEY') || '',
    ADSENSE_CLIENT_ID: env.ADSENSE_CLIENT_ID || 'ca-pub-9444948713845341',
    ADSENSE_SLOT_SIDEBAR: env.ADSENSE_SLOT_SIDEBAR || '4825913350',
    ADSENSE_SLOT_SOLO: env.ADSENSE_SLOT_SOLO || '5680876206',
    ADSENSE_SLOT_SOLOG: env.ADSENSE_SLOT_SOLOG || '8757963709',
    YOUTUBE_BASE_URL: 'https://www.googleapis.com/youtube/v3',
    COHERE_CHAT_URL: 'https://api.cohere.com/v1/chat',
    STORAGE_KEY_FAVS: 'izent_saved_videos',
    STORAGE_KEY_HISTORY: 'izent_watch_history_v2',
    STORAGE_KEY_THEATER: 'izent_theater_mode',
    STORAGE_KEY_GLOW: 'izent_ambient_glow',
    DEFAULT_REGION: env.DEFAULT_REGION || 'US',
    MAX_RESULTS: 18
  };

  // Curated Fallback Videos (Blockbusters, 4K Demos, Trailers)
  const CURATED_FALLBACK = [
    {
      id: 'ZRTYqleaQMY',
      title: 'Marvel Studios Avengers: Secret Wars - Official Teaser Trailer',
      channelTitle: 'Marvel Entertainment',
      description: 'Witness the ultimate culmination of the multiverse. In theaters worldwide. Starring all legendary Marvel heroes.',
      publishedAt: '2026-08-15T18:00:00Z',
      viewCount: '24890000',
      thumbnail: 'https://i.ytimg.com/vi/ZRTYqleaQMY/hqdefault.jpg'
    },
    {
      id: 'bwteSD1jmNQ',
      title: 'Avatar 3: Fire and Ash - Official Extended 4K Trailer',
      channelTitle: '20th Century Studios',
      description: 'Return to Pandora. Directed by James Cameron. Exploring the fire and ash biomes with visual mastery.',
      publishedAt: '2026-07-20T14:30:00Z',
      viewCount: '19450000',
      thumbnail: 'https://i.ytimg.com/vi/bwteSD1jmNQ/hqdefault.jpg'
    },
    {
      id: 'UfNu7pcR0e8',
      title: 'Cyberpunk 2077 - Next Dimension 8K Unreal Engine 5 Cinematic',
      channelTitle: 'CyberArts Digital',
      description: 'Ultra high-definition cinematic demo running on next-generation ray tracing hardware in Night City.',
      publishedAt: '2026-09-02T12:00:00Z',
      viewCount: '6320000',
      thumbnail: 'https://i.ytimg.com/vi/UfNu7pcR0e8/hqdefault.jpg'
    },
    {
      id: 'L_LUpnjgPso',
      title: 'Interstellar - Main Theme (Extra Extended Soundtrack)',
      channelTitle: 'Cinematic Soundtracks',
      description: 'Composed by Hans Zimmer. Complete ambient orchestral journey into the wormhole and Gargantua black hole.',
      publishedAt: '2025-11-18T16:20:00Z',
      viewCount: '48200000',
      thumbnail: 'https://i.ytimg.com/vi/L_LUpnjgPso/hqdefault.jpg'
    },
    {
      id: 'jfKfPfyJRdk',
      title: 'lofi hip hop radio 📚 - beats to relax/study to',
      channelTitle: 'Lofi Girl',
      description: 'Peaceful lofi hip hop beats. Stream 24/7 relaxing chill music for studying, working, and unwinding.',
      publishedAt: '2026-01-01T00:00:00Z',
      viewCount: '89100000',
      thumbnail: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg'
    }
  ];

  // --- State ---
  let state = {
    currentVideo: null,
    currentQuery: '',
    currentCategory: 'trending',
    nextPageToken: null,
    isLoading: false,
    favorites: loadFavorites(),
    history: loadHistory(),
    theaterMode: localStorage.getItem(CONFIG.STORAGE_KEY_THEATER) === 'true',
    ambientGlow: localStorage.getItem(CONFIG.STORAGE_KEY_GLOW) !== 'false',
    lightsDimmed: false,
    aiCopilotOpen: false,
    aiChatHistory: [],
    activeDrawerTab: 'saved', // 'saved' or 'history'
    activeGridItems: [],
    sleepTimerEnd: null,
    sleepTimerInterval: null
  };

  // --- DOM Elements ---
  const el = {
    // Header & Search
    searchForm: document.getElementById('searchForm'),
    searchInput: document.getElementById('searchInput'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    openAiMoodBtn: document.getElementById('openAiMoodBtn'),
    catAiVibeBtn: document.getElementById('catAiVibeBtn'),
    categoriesTrack: document.getElementById('categoriesTrack'),
    lightsToggleBtn: document.getElementById('lightsToggleBtn'),
    theaterModeHeaderBtn: document.getElementById('theaterModeHeaderBtn'),
    bookmarksToggleBtn: document.getElementById('bookmarksToggleBtn'),
    libraryCountBadge: document.getElementById('libraryCountBadge'),
    cinemaDimmer: document.getElementById('cinemaDimmer'),

    // Player Stage
    stageContainer: document.getElementById('stageContainer'),
    playerStageSection: document.getElementById('playerStageSection'),
    mainVideoPlayer: document.getElementById('mainVideoPlayer'),
    playerPlaceholder: document.getElementById('playerPlaceholder'),
    startTrendingBtn: document.getElementById('startTrendingBtn'),
    placeholderAiBtn: document.getElementById('placeholderAiBtn'),
    ambientGlow: document.getElementById('ambientGlow'),
    playingBadge: document.getElementById('playingBadge'),
    ambientToggleBtn: document.getElementById('ambientToggleBtn'),
    theaterModeInlineBtn: document.getElementById('theaterModeInlineBtn'),
    theaterBtnText: document.getElementById('theaterBtnText'),
    favoriteVideoBtn: document.getElementById('favoriteVideoBtn'),
    favBtnText: document.getElementById('favBtnText'),
    shareVideoBtn: document.getElementById('shareVideoBtn'),
    closePlayerBtn: document.getElementById('closePlayerBtn'),

    // AI Copilot & Sleep Timer in Toolbar
    aiCopilotToggleBtn: document.getElementById('aiCopilotToggleBtn'),
    sleepTimerBtn: document.getElementById('sleepTimerBtn'),
    sleepTimerDropdown: document.getElementById('sleepTimerDropdown'),
    sleepTimerBadge: document.getElementById('sleepTimerBadge'),
    sleepTimerCountdown: document.getElementById('sleepTimerCountdown'),
    sleepTimerBtnText: document.getElementById('sleepTimerBtnText'),

    // AI Copilot Hub Card
    aiCopilotCard: document.getElementById('aiCopilotCard'),
    closeAiCardBtn: document.getElementById('closeAiCardBtn'),
    generateSummaryBtn: document.getElementById('generateSummaryBtn'),
    aiSummaryContent: document.getElementById('aiSummaryContent'),
    aiChatHistoryContainer: document.getElementById('aiChatHistory'),
    aiChatChips: document.getElementById('aiChatChips'),
    aiChatForm: document.getElementById('aiChatForm'),
    aiChatInput: document.getElementById('aiChatInput'),
    generateCriticBtn: document.getElementById('generateCriticBtn'),
    aiCriticContent: document.getElementById('aiCriticContent'),
    generateChaptersBtn: document.getElementById('generateChaptersBtn'),
    aiChaptersContent: document.getElementById('aiChaptersContent'),

    // Video Meta Card & Chapters Quickbar
    videoMetaCard: document.getElementById('videoMetaCard'),
    activeVideoTitle: document.getElementById('activeVideoTitle'),
    channelAvatar: document.getElementById('channelAvatar'),
    channelName: document.getElementById('channelName'),
    channelSubtext: document.getElementById('channelSubtext'),
    viewsText: document.getElementById('viewsText'),
    dateText: document.getElementById('dateText'),
    chaptersQuickbar: document.getElementById('chaptersQuickbar'),
    chaptersQuickbarTrack: document.getElementById('chaptersQuickbarTrack'),
    descriptionBox: document.getElementById('descriptionBox'),
    descriptionText: document.getElementById('descriptionText'),
    descToggleBtn: document.getElementById('descToggleBtn'),

    // Sidebar
    sidebarQueueList: document.getElementById('sidebarQueueList'),

    // Catalog Grid
    catalogHeading: document.getElementById('catalogHeading'),
    catalogSubheading: document.getElementById('catalogSubheading'),
    resultsCountBadge: document.getElementById('resultsCountBadge'),
    videoGrid: document.getElementById('videoGrid'),
    gridLoader: document.getElementById('gridLoader'),
    gridLoaderText: document.getElementById('gridLoaderText'),
    loadMoreContainer: document.getElementById('loadMoreContainer'),
    loadMoreBtn: document.getElementById('loadMoreBtn'),

    // Drawer (Saved & History)
    libraryDrawer: document.getElementById('libraryDrawer'),
    drawerOverlay: document.getElementById('drawerOverlay'),
    drawerCloseBtn: document.getElementById('drawerCloseBtn'),
    tabDrawerSaved: document.getElementById('tabDrawerSaved'),
    tabDrawerHistory: document.getElementById('tabDrawerHistory'),
    drawerSavedCount: document.getElementById('drawerSavedCount'),
    drawerHistoryCount: document.getElementById('drawerHistoryCount'),
    libraryItemsList: document.getElementById('libraryItemsList'),
    clearLibraryBtn: document.getElementById('clearLibraryBtn'),

    // AI Mood Search Modal
    aiMoodModal: document.getElementById('aiMoodModal'),
    closeMoodModalBtn: document.getElementById('closeMoodModalBtn'),
    aiMoodForm: document.getElementById('aiMoodForm'),
    aiMoodInput: document.getElementById('aiMoodInput'),
    submitMoodBtn: document.getElementById('submitMoodBtn'),

    // Modals & Toast
    toastNotification: document.getElementById('toastNotification'),
    toastMsg: document.getElementById('toastMsg'),
    shortcutsModal: document.getElementById('shortcutsModal'),
    closeModalBtn: document.getElementById('closeModalBtn'),

    // Footer actions
    footerAiMoodLink: document.getElementById('footerAiMoodLink'),
    footerShortcutsLink: document.getElementById('footerShortcutsLink'),
    footerScrollTop: document.getElementById('footerScrollTop'),
    footerOpenLibrary: document.getElementById('footerOpenLibrary'),
    brandLogo: document.getElementById('brandLogo')
  };

  // --- Helper Functions ---

  function decodeHTMLEntities(str) {
    if (!str) return '';
    const txt = document.createElement('textarea');
    txt.innerHTML = str;
    return txt.value;
  }

  function formatViews(views) {
    if (!views) return 'Featured';
    const num = parseInt(views, 10);
    if (isNaN(num)) return views;
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M views';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K views';
    return num.toLocaleString() + ' views';
  }

  function formatTimeAgo(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    if (isNaN(seconds)) return 'Recently';

    const intervals = [
      { label: 'yr', secs: 31536000 },
      { label: 'mo', secs: 2592000 },
      { label: 'wk', secs: 604800 },
      { label: 'day', secs: 86400 },
      { label: 'hr', secs: 3600 },
      { label: 'min', secs: 60 }
    ];

    for (const interval of intervals) {
      const count = Math.floor(seconds / interval.secs);
      if (count >= 1) {
        return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
      }
    }
    return 'Just now';
  }

  function extractYouTubeId(urlOrQuery) {
    if (!urlOrQuery) return null;
    const str = urlOrQuery.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(str)) {
      return str;
    }
    const watchMatch = str.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    if (watchMatch && watchMatch[1]) {
      return watchMatch[1];
    }
    const shortsMatch = str.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i);
    if (shortsMatch && shortsMatch[1]) {
      return shortsMatch[1];
    }
    return null;
  }

  function showToast(message, icon = '✨') {
    if (!el.toastNotification) return;
    el.toastMsg.textContent = message;
    const iconEl = el.toastNotification.querySelector('.toast-icon');
    if (iconEl) iconEl.textContent = icon;
    el.toastNotification.classList.add('show');
    clearTimeout(el.toastNotification._timer);
    el.toastNotification._timer = setTimeout(() => {
      el.toastNotification.classList.remove('show');
    }, 3200);
  }

  function loadFavorites() {
    try {
      const saved = localStorage.getItem(CONFIG.STORAGE_KEY_FAVS);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }

  function saveFavorites(favs) {
    try {
      localStorage.setItem(CONFIG.STORAGE_KEY_FAVS, JSON.stringify(favs));
    } catch (e) {}
  }

  function loadHistory() {
    try {
      const saved = localStorage.getItem(CONFIG.STORAGE_KEY_HISTORY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }

  function saveHistory(history) {
    try {
      localStorage.setItem(CONFIG.STORAGE_KEY_HISTORY, JSON.stringify(history.slice(0, 40)));
    } catch (e) {}
  }

  function updateLibraryBadges() {
    if (el.libraryCountBadge) {
      el.libraryCountBadge.textContent = state.favorites.length;
    }
    if (el.drawerSavedCount) {
      el.drawerSavedCount.textContent = state.favorites.length;
    }
    if (el.drawerHistoryCount) {
      el.drawerHistoryCount.textContent = state.history.length;
    }
  }

  // Markdown-to-HTML parser for AI responses
  function formatMarkdown(text) {
    if (!text) return '';
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Headers
    html = html.replace(/^### (.*$)/gim, '<h4>$1</h4>');
    html = html.replace(/^## (.*$)/gim, '<h4>$1</h4>');
    // Bullet points
    html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
    html = html.replace(/^- (.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');
    // Clean duplicate <ul> tags
    html = html.replace(/<\/ul>\s*<ul>/g, '');
    // Paragraph breaks
    html = html.replace(/\n\n/g, '<br><br>');
    return `<div class="ai-formatted-output">${html}</div>`;
  }

  // --- Dynamic Ambient Mood Backglow ---
  function updateAmbientMood(seedStr = '') {
    if (!el.ambientGlow) return;
    if (!state.ambientGlow) {
      el.ambientGlow.classList.add('glow-off');
      return;
    }
    el.ambientGlow.classList.remove('glow-off');

    const palettes = [
      'radial-gradient(circle at center, rgba(121, 40, 202, 0.45) 0%, rgba(255, 0, 85, 0.25) 45%, transparent 75%)',
      'radial-gradient(circle at center, rgba(6, 182, 212, 0.45) 0%, rgba(99, 102, 241, 0.25) 45%, transparent 75%)',
      'radial-gradient(circle at center, rgba(244, 63, 94, 0.45) 0%, rgba(245, 158, 11, 0.25) 45%, transparent 75%)',
      'radial-gradient(circle at center, rgba(16, 185, 129, 0.45) 0%, rgba(59, 130, 246, 0.25) 45%, transparent 75%)',
      'radial-gradient(circle at center, rgba(168, 85, 247, 0.5) 0%, rgba(236, 72, 153, 0.3) 45%, transparent 75%)'
    ];
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    const chosen = palettes[Math.abs(hash) % palettes.length];
    el.ambientGlow.style.background = chosen;
  }

  // ==========================================================================
  // Cohere AI Integration Service
  // ==========================================================================

  async function callCohereChat(message, chatHistory = [], preamble = '') {
    const payload = {
      message: message,
      chat_history: chatHistory
    };
    if (preamble) {
      payload.preamble = preamble;
    }

    const res = await fetch(CONFIG.COHERE_CHAT_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.COHERE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Cohere API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.text || '';
  }

  function ensureActiveVideo() {
    if (!state.currentVideo) {
      if (state.activeGridItems && state.activeGridItems.length > 0) {
        playVideo(state.activeGridItems[0], true);
      } else {
        playVideo(CURATED_FALLBACK[0], true);
      }
    }
    return state.currentVideo;
  }

  // AI Feature 1: Video Summary & Key Takeaways
  async function generateVideoSummary() {
    const video = ensureActiveVideo();
    if (!video) return;

    el.generateSummaryBtn.disabled = true;
    el.generateSummaryBtn.innerHTML = '<span>⏳ Generating AI Summary...</span>';
    el.aiSummaryContent.innerHTML = '<div class="ai-empty-prompt"><div class="spinner" style="margin: 0 auto 1rem;"></div><p>Cohere AI is watching and analyzing this video...</p></div>';

    try {
      const prompt = `Analyze this YouTube video:
Title: "${video.title}"
Creator/Channel: "${video.channelTitle}"
Description: "${video.description.slice(0, 1500)}"

Please provide a structured breakdown:
1. **Executive TL;DR**: A 2-sentence spoiler-free overview of what this video or trailer is about.
2. **Key Takeaways & Highlights**: 3-4 concise bullet points of major moments, themes, or insights.
3. **Audience & Vibe**: A short description of who will enjoy this (e.g., action lovers, coders, cinephiles).
Keep it sharp, engaging, and well formatted with emojis.`;

      const aiText = await callCohereChat(prompt, [], 'You are an intelligent cinematic streaming copilot.');
      el.aiSummaryContent.innerHTML = formatMarkdown(aiText);
      showToast('AI Summary generated!', '⚡');
    } catch (err) {
      console.error('Cohere AI summary error:', err);
      el.aiSummaryContent.innerHTML = `
        <div class="ai-empty-prompt" style="color: #ef4444;">
          <p>⚠️ Could not connect to Cohere AI.</p>
          <span>Error: ${err.message}. Please check your connection.</span>
        </div>
      `;
      showToast('Cohere AI connection failed', '⚠️');
    } finally {
      el.generateSummaryBtn.disabled = false;
      el.generateSummaryBtn.innerHTML = '<span>✨ Regenerate AI Summary</span>';
    }
  }

  // AI Feature 2: Companion Chat
  async function sendCompanionChatMessage(userQuestion) {
    if (!userQuestion || !userQuestion.trim()) return;
    const cleanQuestion = userQuestion.trim();
    const video = ensureActiveVideo();
    if (!video) return;

    // Append user message to chat UI
    appendChatMessage('user', cleanQuestion);
    el.aiChatInput.value = '';

    // Scroll chat to bottom
    el.aiChatHistoryContainer.scrollTop = el.aiChatHistoryContainer.scrollHeight;

    // Loading indicator
    const loadingId = 'aiLoadingBubble';
    const loadingBubble = document.createElement('div');
    loadingBubble.id = loadingId;
    loadingBubble.className = 'ai-chat-msg assistant';
    loadingBubble.innerHTML = `
      <div class="msg-avatar">🤖</div>
      <div class="msg-text"><em>Cohere is thinking...</em></div>
    `;
    el.aiChatHistoryContainer.appendChild(loadingBubble);
    el.aiChatHistoryContainer.scrollTop = el.aiChatHistoryContainer.scrollHeight;

    const contextPreamble = `You are an AI video companion for the viewer watching the YouTube video titled "${video.title}" by "${video.channelTitle}". Description: "${video.description.slice(0, 800)}". Answer questions accurately, enthusiastically, and suggest related movies or context where appropriate. Keep answers concise, natural, and helpful.`;

    try {
      const response = await callCohereChat(cleanQuestion, state.aiChatHistory, contextPreamble);

      // Remove loading bubble
      const bubble = document.getElementById(loadingId);
      if (bubble) bubble.remove();

      // Append assistant message
      appendChatMessage('assistant', response);

      // Update state chat history (max 10 turns)
      state.aiChatHistory.push({ role: 'USER', message: cleanQuestion });
      state.aiChatHistory.push({ role: 'CHATBOT', message: response });
      if (state.aiChatHistory.length > 10) state.aiChatHistory = state.aiChatHistory.slice(-10);

      el.aiChatHistoryContainer.scrollTop = el.aiChatHistoryContainer.scrollHeight;
    } catch (err) {
      console.error('Chat error:', err);
      const bubble = document.getElementById(loadingId);
      if (bubble) bubble.remove();
      appendChatMessage('assistant', `⚠️ Sorry, I encountered an issue: ${err.message}`);
    }
  }

  function appendChatMessage(role, text) {
    const msg = document.createElement('div');
    msg.className = `ai-chat-msg ${role}`;
    msg.innerHTML = `
      <div class="msg-avatar">${role === 'user' ? '👤' : '🤖'}</div>
      <div class="msg-text">${formatMarkdown(text)}</div>
    `;
    el.aiChatHistoryContainer.appendChild(msg);
  }

  // AI Feature 3: Critic Review & Hype Score
  async function generateCriticReview() {
    const video = ensureActiveVideo();
    if (!video) return;

    el.generateCriticBtn.disabled = true;
    el.generateCriticBtn.innerHTML = '<span>⏳ Consulting AI Critic...</span>';
    el.aiCriticContent.innerHTML = '<div class="ai-empty-prompt"><div class="spinner" style="margin: 0 auto 1rem;"></div><p>Calculating cinematic score and stylistic review...</p></div>';

    try {
      const prompt = `Review this YouTube video or movie trailer as a seasoned cinema critic:
Title: "${video.title}"
Creator/Channel: "${video.channelTitle}"
Description: "${video.description.slice(0, 1000)}"

Please format your review into:
1. **Hype Score**: A rating from 0-100% with a fun verdict badge (e.g., 94% - Cinematic Masterpiece, or 82% - Pure Adrenaline).
2. **Visual & Tone Breakdown**: Analysis of the aesthetic, pacing, cinematography, and atmosphere.
3. **The Verdict**: Who will love this, potential drawbacks, and spoiler-free recommendation.`;

      const aiText = await callCohereChat(prompt, [], 'You are a passionate film and video critic.');
      el.aiCriticContent.innerHTML = formatMarkdown(aiText);
      showToast('Critic Review generated!', '🎭');
    } catch (err) {
      console.error('Critic error:', err);
      el.aiCriticContent.innerHTML = `<div class="ai-empty-prompt" style="color: #ef4444;"><p>Could not generate review: ${err.message}</p></div>`;
    } finally {
      el.generateCriticBtn.disabled = false;
      el.generateCriticBtn.innerHTML = '<span>🎭 Regenerate Critic Review</span>';
    }
  }

  // AI Feature 4: Timestamp Chapters Extraction
  async function extractVideoChapters() {
    const video = ensureActiveVideo();
    if (!video) return;

    el.generateChaptersBtn.disabled = true;
    el.generateChaptersBtn.innerHTML = '<span>⏳ Parsing Chapters...</span>';

    // First check if video description already has timestamp markers
    const timestampRegex = /(?:(\d{1,2}:)?(\d{1,2}):(\d{2}))\s*[-–—]?\s*([^\n\r]+)/g;
    const matches = [];
    let match;
    while ((match = timestampRegex.exec(video.description)) !== null) {
      const timeStr = match[0].match(/(?:(\d{1,2}:)?(\d{1,2}):(\d{2}))/)[0];
      const titleStr = match[4].trim();
      matches.push({ time: timeStr, title: titleStr });
      if (matches.length >= 12) break;
    }

    if (matches.length >= 2) {
      renderChaptersUI(matches);
      el.generateChaptersBtn.disabled = false;
      el.generateChaptersBtn.innerHTML = '<span>⏱️ Extracted Chapters</span>';
      showToast('Parsed video chapters from description!', '⏱️');
      return;
    }

    // If description doesn't have timestamps, ask Cohere to infer structural milestones
    try {
      const prompt = `Based on the title "${video.title}" and description "${video.description.slice(0, 800)}", infer 4-5 thematic chapter titles that a viewer would expect in this video or trailer. Output each as:
MM:SS - Chapter Title
e.g.
00:00 - Introduction & Hook
01:15 - Main Conflict / Beat Drop
02:30 - Climax
03:45 - Conclusion`;

      const aiText = await callCohereChat(prompt, [], 'You are an expert video editor.');
      const aiMatches = [];
      while ((match = timestampRegex.exec(aiText)) !== null) {
        aiMatches.push({ time: match[1] || match[0].split('-')[0].trim(), title: match[4] || match[0] });
      }
      renderChaptersUI(aiMatches.length > 0 ? aiMatches : [
        { time: '00:00', title: 'Intro & Opening' },
        { time: '01:00', title: 'Main Sequence' },
        { time: '02:30', title: 'Climax & Finale' }
      ]);
      showToast('AI estimated video milestones!', '⏱️');
    } catch (err) {
      el.aiChaptersContent.innerHTML = `<div class="ai-empty-prompt" style="color: #ef4444;"><p>Chapter error: ${err.message}</p></div>`;
    } finally {
      el.generateChaptersBtn.disabled = false;
      el.generateChaptersBtn.innerHTML = '<span>⏱️ Re-analyze Chapters</span>';
    }
  }

  function renderChaptersUI(chapters) {
    if (!el.aiChaptersContent) return;
    el.aiChaptersContent.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 0.6rem;">
        ${chapters.map(c => `
          <div class="chapter-row" style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.03); padding: 0.5rem 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
            <span style="font-weight: 600; color: var(--text-main); font-size: 0.88rem;">${c.title}</span>
            <button type="button" class="chapter-chip" data-time="${c.time}">▶ ${c.time}</button>
          </div>
        `).join('')}
      </div>
    `;

    // Also populate quickbar below video
    if (el.chaptersQuickbar && el.chaptersQuickbarTrack) {
      el.chaptersQuickbarTrack.innerHTML = '';
      chapters.forEach(c => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chapter-chip';
        btn.textContent = `${c.time} ${c.title.slice(0, 18)}`;
        btn.title = `${c.time} - ${c.title}`;
        btn.dataset.time = c.time;
        btn.addEventListener('click', () => jumpToTime(c.time));
        el.chaptersQuickbarTrack.appendChild(btn);
      });
      el.chaptersQuickbar.style.display = 'flex';
    }

    // Attach click listeners to chips
    el.aiChaptersContent.querySelectorAll('.chapter-chip').forEach(btn => {
      btn.addEventListener('click', () => jumpToTime(btn.dataset.time));
    });
  }

  function jumpToTime(timeStr) {
    if (!state.currentVideo) return;
    const parts = timeStr.split(':').map(Number);
    let seconds = 0;
    if (parts.length === 3) {
      seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      seconds = parts[0] * 60 + parts[1];
    }
    el.mainVideoPlayer.src = `https://www.youtube.com/embed/${state.currentVideo.id}?autoplay=1&enablejsapi=1&start=${seconds}&rel=0`;
    showToast(`Jumped to ${timeStr}`, '⏩');
    el.playerStageSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // AI Feature 5: Semantic Mood Search
  async function performSemanticMoodSearch(userMood) {
    if (!userMood || !userMood.trim()) return;
    const moodQuery = userMood.trim();

    closeAiMoodModal();
    setLoading(true);
    el.gridLoaderText.textContent = `Cohere AI is analyzing "${moodQuery}"...`;

    try {
      const prompt = `You are an expert YouTube search optimizer. Given the user's mood request:
"${moodQuery}"

Output ONLY the single most effective 3 to 6 word YouTube search query to find the best videos. Return NOTHING else. No quotes, no explanations.`;

      const optimizedQuery = await callCohereChat(prompt, [], 'You generate pristine YouTube search queries.');
      const cleanKeyword = optimizedQuery.replace(/["\n\r]/g, '').trim();

      el.searchInput.value = cleanKeyword;
      el.clearSearchBtn.style.display = 'flex';
      showToast(`AI generated search: "${cleanKeyword}"`, '✨');

      // Execute search with optimized keyword
      await performSearch(cleanKeyword);
      el.catalogHeading.textContent = `✨ AI Curated for: "${moodQuery}"`;
      el.catalogSubheading.textContent = `Cohere matched your vibe to query "${cleanKeyword}". Click any video to stream in-page!`;
    } catch (err) {
      console.warn('Mood search fallback:', err);
      performSearch(moodQuery);
    } finally {
      setLoading(false);
    }
  }

  // ==========================================================================
  // Sleep Timer Controller
  // ==========================================================================

  function setSleepTimer(minutes) {
    if (state.sleepTimerInterval) {
      clearInterval(state.sleepTimerInterval);
      state.sleepTimerInterval = null;
    }

    if (minutes <= 0) {
      state.sleepTimerEnd = null;
      el.sleepTimerBadge.style.display = 'none';
      el.sleepTimerBtnText.textContent = 'Sleep Timer';
      showToast('Sleep timer turned off', '⏱️');
      return;
    }

    state.sleepTimerEnd = Date.now() + minutes * 60 * 1000;
    el.sleepTimerBadge.style.display = 'inline-flex';
    el.sleepTimerBtnText.textContent = `${minutes}m Timer`;
    showToast(`Sleep timer set for ${minutes} minutes`, '🌙');

    updateSleepTimerDisplay();
    state.sleepTimerInterval = setInterval(() => {
      const remainingMs = state.sleepTimerEnd - Date.now();
      if (remainingMs <= 0) {
        triggerSleepTimerExpired();
      } else {
        updateSleepTimerDisplay();
      }
    }, 1000);
  }

  function updateSleepTimerDisplay() {
    if (!state.sleepTimerEnd) return;
    const remainingSecs = Math.max(0, Math.floor((state.sleepTimerEnd - Date.now()) / 1000));
    const mins = Math.floor(remainingSecs / 60);
    const secs = remainingSecs % 60;
    el.sleepTimerCountdown.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function triggerSleepTimerExpired() {
    if (state.sleepTimerInterval) {
      clearInterval(state.sleepTimerInterval);
      state.sleepTimerInterval = null;
    }
    state.sleepTimerEnd = null;
    el.sleepTimerBadge.style.display = 'none';
    el.sleepTimerBtnText.textContent = 'Sleep Timer';

    // Stop playback
    el.mainVideoPlayer.src = '';
    el.playerPlaceholder.classList.remove('hidden');
    el.videoMetaCard.style.display = 'none';
    el.playingBadge.style.display = 'none';

    // Dim lights for sleep
    toggleLightsDimmer(true);
    showToast('Sleep timer finished. Video paused. Sweet dreams! 🌙', '💤');
  }

  // ==========================================================================
  // YouTube API Service
  // ==========================================================================

  async function fetchPopularVideos(pageToken = '') {
    const url = new URL(`${CONFIG.YOUTUBE_BASE_URL}/videos`);
    url.searchParams.set('part', 'snippet,contentDetails,statistics');
    url.searchParams.set('chart', 'mostPopular');
    url.searchParams.set('regionCode', CONFIG.DEFAULT_REGION);
    url.searchParams.set('maxResults', CONFIG.MAX_RESULTS);
    url.searchParams.set('key', CONFIG.YOUTUBE_API_KEY);
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`YouTube API error: ${res.status}`);
    }
    const data = await res.json();
    return {
      items: (data.items || []).map(formatVideoItem),
      nextPageToken: data.nextPageToken || null,
      totalResults: data.pageInfo ? data.pageInfo.totalResults : 0
    };
  }

  async function searchYouTube(query, pageToken = '') {
    const url = new URL(`${CONFIG.YOUTUBE_BASE_URL}/search`);
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('q', query);
    url.searchParams.set('type', 'video');
    url.searchParams.set('maxResults', CONFIG.MAX_RESULTS);
    url.searchParams.set('key', CONFIG.YOUTUBE_API_KEY);
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`YouTube Search error: ${res.status}`);
    }
    const data = await res.json();

    const videoIds = (data.items || []).map(item => item.id.videoId).filter(Boolean);
    let detailsMap = {};
    if (videoIds.length > 0) {
      try {
        detailsMap = await fetchVideosBatchDetails(videoIds);
      } catch (e) {}
    }

    const items = (data.items || []).map(item => {
      const vid = item.id.videoId;
      const details = detailsMap[vid] || {};
      return formatVideoItem({
        id: vid,
        snippet: item.snippet,
        statistics: details.statistics || {},
        contentDetails: details.contentDetails || {}
      });
    });

    return {
      items,
      nextPageToken: data.nextPageToken || null,
      totalResults: data.pageInfo ? data.pageInfo.totalResults : items.length
    };
  }

  async function fetchVideosBatchDetails(idsArray) {
    const url = new URL(`${CONFIG.YOUTUBE_BASE_URL}/videos`);
    url.searchParams.set('part', 'snippet,statistics,contentDetails');
    url.searchParams.set('id', idsArray.join(','));
    url.searchParams.set('key', CONFIG.YOUTUBE_API_KEY);

    const res = await fetch(url);
    if (!res.ok) return {};
    const data = await res.json();
    const map = {};
    (data.items || []).forEach(item => {
      map[item.id] = item;
    });
    return map;
  }

  async function fetchSingleVideoDetails(videoId) {
    const url = new URL(`${CONFIG.YOUTUBE_BASE_URL}/videos`);
    url.searchParams.set('part', 'snippet,statistics,contentDetails');
    url.searchParams.set('id', videoId);
    url.searchParams.set('key', CONFIG.YOUTUBE_API_KEY);

    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.items && data.items.length > 0) {
      return formatVideoItem(data.items[0]);
    }
    return null;
  }

  function formatVideoItem(raw) {
    const id = typeof raw.id === 'object' ? raw.id.videoId : raw.id;
    const snippet = raw.snippet || {};
    const stats = raw.statistics || {};
    const thumbnails = snippet.thumbnails || {};
    const bestThumb = (thumbnails.maxres || thumbnails.high || thumbnails.medium || thumbnails.default || {}).url || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

    return {
      id: id,
      title: decodeHTMLEntities(snippet.title || 'Untitled Video'),
      channelTitle: decodeHTMLEntities(snippet.channelTitle || 'YouTube Creator'),
      channelId: snippet.channelId || '',
      description: snippet.description || 'No description provided.',
      publishedAt: snippet.publishedAt || '',
      thumbnail: bestThumb,
      viewCount: stats.viewCount || null,
      likeCount: stats.likeCount || null,
      duration: raw.contentDetails ? formatDuration(raw.contentDetails.duration) : ''
    };
  }

  function formatDuration(isoStr) {
    if (!isoStr) return '';
    const match = isoStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '';
    const hours = parseInt(match[1] || 0, 10);
    const mins = parseInt(match[2] || 0, 10);
    const secs = parseInt(match[3] || 0, 10);

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // ==========================================================================
  // In-Page Player Controller
  // ==========================================================================

  function playVideo(video, shouldScroll = true) {
    if (!video || !video.id) return;
    state.currentVideo = video;

    // Record into Watch History
    const historyItem = { ...video, playedAt: new Date().toISOString() };
    state.history = [historyItem, ...state.history.filter(v => v.id !== video.id)];
    saveHistory(state.history);
    updateLibraryBadges();

    // Reset AI state for new video
    state.aiChatHistory = [];
    if (el.aiChatHistoryContainer) {
      el.aiChatHistoryContainer.innerHTML = `
        <div class="ai-chat-msg assistant">
          <div class="msg-avatar">🤖</div>
          <div class="msg-text">
            I am ready to chat about <strong>"${video.title}"</strong>! Ask me anything about the cast, story, or concepts.
          </div>
        </div>
      `;
    }
    if (el.aiSummaryContent) {
      el.aiSummaryContent.innerHTML = '<div class="ai-empty-prompt"><p>Click the button above to generate an instant breakdown of this video.</p></div>';
    }
    if (el.aiCriticContent) {
      el.aiCriticContent.innerHTML = '<div class="ai-empty-prompt"><p>Click above to get an AI critic score and stylistic review.</p></div>';
    }

    // Reveal player stage section, hide placeholder, reveal controls & metadata
    if (el.playerStageSection) el.playerStageSection.style.display = 'block';
    if (el.playerPlaceholder) el.playerPlaceholder.classList.add('hidden');
    if (el.videoMetaCard) el.videoMetaCard.style.display = 'block';
    if (el.playingBadge) el.playingBadge.style.display = 'inline-flex';

    // Embed YouTube Player inside page
    const embedUrl = `https://www.youtube.com/embed/${video.id}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1&color=white`;
    if (el.mainVideoPlayer.src !== embedUrl) {
      el.mainVideoPlayer.src = embedUrl;
    }

    // Update metadata card
    el.activeVideoTitle.textContent = video.title;
    el.channelName.textContent = video.channelTitle;
    el.channelAvatar.textContent = (video.channelTitle || 'Y').charAt(0).toUpperCase();
    el.viewsText.textContent = formatViews(video.viewCount);
    el.dateText.textContent = formatTimeAgo(video.publishedAt);
    el.descriptionText.textContent = video.description;
    el.descriptionBox.classList.remove('expanded');
    el.descToggleBtn.textContent = 'Show More';

    // Auto check if video has timestamp chapters in description
    checkAndRenderQuickChapters(video);

    // Update Favorite State
    const isFav = state.favorites.some(f => f.id === video.id);
    if (isFav) {
      el.favoriteVideoBtn.classList.add('active');
      el.favBtnText.textContent = 'Saved';
    } else {
      el.favoriteVideoBtn.classList.remove('active');
      el.favBtnText.textContent = 'Save';
    }

    // Dynamic Ambient Backdrop Mood
    updateAmbientMood(video.title + video.id);

    // Update URL query parameter without page reload
    try {
      const url = new URL(window.location);
      url.searchParams.set('v', video.id);
      window.history.replaceState({}, '', url);
    } catch (e) {}

    // Highlight in Up-Next queue
    markActiveQueueItem(video.id);

    // Update document title
    document.title = `${video.title} - iZent Cinema`;

    // Fetch related queue for sidebar
    fetchSidebarQueue(video);

    // Smooth scroll to player stage if requested
    if (shouldScroll && el.playerStageSection) {
      el.playerStageSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function closePlayer() {
    if (el.mainVideoPlayer) el.mainVideoPlayer.src = '';
    if (el.playerStageSection) el.playerStageSection.style.display = 'none';
    state.currentVideo = null;
    try {
      const url = new URL(window.location);
      url.searchParams.delete('v');
      window.history.replaceState({}, '', url);
    } catch (e) {}
    document.title = 'iZent Movies & Cinema - Watch Any YouTube Video In-Page with Cohere AI';
    showToast('Returned to Home Catalog', '🎬');
  }

  function checkAndRenderQuickChapters(video) {
    if (!el.chaptersQuickbar || !el.chaptersQuickbarTrack) return;
    const timestampRegex = /(?:(\d{1,2}:)?(\d{1,2}):(\d{2}))\s*[-–—]?\s*([^\n\r]+)/g;
    const matches = [];
    let match;
    while ((match = timestampRegex.exec(video.description)) !== null) {
      const timeStr = match[0].match(/(?:(\d{1,2}:)?(\d{1,2}):(\d{2}))/)[0];
      const titleStr = match[4].trim();
      matches.push({ time: timeStr, title: titleStr });
      if (matches.length >= 10) break;
    }

    if (matches.length >= 2) {
      renderChaptersUI(matches);
    } else {
      el.chaptersQuickbar.style.display = 'none';
      if (el.aiChaptersContent) {
        el.aiChaptersContent.innerHTML = '<div class="ai-empty-prompt"><p>No chapters detected in description.</p><span>Click above to let Cohere AI infer video milestones.</span></div>';
      }
    }
  }

  function fetchSidebarQueue(currentVid) {
    const queueVideos = state.activeGridItems.filter(item => item.id !== currentVid.id);
    if (queueVideos.length > 0) {
      renderSidebarQueue(queueVideos.slice(0, 8));
    } else {
      renderSidebarQueue(CURATED_FALLBACK.filter(item => item.id !== currentVid.id));
    }
  }

  function renderSidebarQueue(videos) {
    if (!el.sidebarQueueList) return;
    el.sidebarQueueList.innerHTML = '';

    videos.forEach(v => {
      const card = document.createElement('div');
      card.className = `queue-card ${state.currentVideo && state.currentVideo.id === v.id ? 'active-playing' : ''}`;
      card.dataset.id = v.id;
      card.innerHTML = `
        <div class="queue-thumb">
          <img src="${v.thumbnail}" alt="${v.title}" loading="lazy">
        </div>
        <div class="queue-meta">
          <div class="queue-title" title="${v.title}">${v.title}</div>
          <div class="queue-channel">${v.channelTitle}</div>
        </div>
      `;
      card.addEventListener('click', () => {
        playVideo(v, true);
      });
      el.sidebarQueueList.appendChild(card);
    });
  }

  function markActiveQueueItem(videoId) {
    if (!el.sidebarQueueList) return;
    const cards = el.sidebarQueueList.querySelectorAll('.queue-card');
    cards.forEach(c => {
      c.classList.toggle('active-playing', c.dataset.id === videoId);
    });
  }

  // ==========================================================================
  // Catalog Grid Rendering
  // ==========================================================================

  function renderVideoGrid(videos, append = false) {
    if (!append) {
      el.videoGrid.innerHTML = '';
      state.activeGridItems = videos;
    } else {
      state.activeGridItems = [...state.activeGridItems, ...videos];
    }

    if (videos.length === 0 && !append) {
      el.videoGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
          <h3>No videos found</h3>
          <p style="margin-top: 0.5rem; color: var(--text-dim);">Try searching with another query or use ✨ AI Mood Search.</p>
        </div>
      `;
      el.resultsCountBadge.textContent = '0 videos';
      el.loadMoreContainer.style.display = 'none';
      return;
    }

    el.resultsCountBadge.textContent = `${state.activeGridItems.length}+ videos`;
    el.loadMoreContainer.style.display = state.nextPageToken ? 'flex' : 'none';

    videos.forEach(v => {
      const card = document.createElement('article');
      card.className = 'video-card';
      card.dataset.id = v.id;
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.title = `Watch: ${v.title}`;

      const avatarInitial = (v.channelTitle || 'Y').charAt(0).toUpperCase();

      card.innerHTML = `
        <div class="card-thumbnail-wrap">
          <img src="${v.thumbnail}" alt="${v.title}" loading="lazy" onerror="this.src='https://i.ytimg.com/vi/${v.id}/hqdefault.jpg'">
          <div class="card-hover-overlay">
            <div class="overlay-play-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            </div>
          </div>
          ${v.duration ? `<span class="duration-tag">${v.duration}</span>` : ''}
        </div>
        <div class="card-body">
          <div class="card-channel-avatar">${avatarInitial}</div>
          <div class="card-text-content">
            <h3 class="card-title">${v.title}</h3>
            <div class="card-channel-title">${v.channelTitle}</div>
            <div class="card-meta-line">${v.viewCount ? formatViews(v.viewCount) + ' • ' : ''}${formatTimeAgo(v.publishedAt)}</div>
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        playVideo(v, true);
      });

      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          playVideo(v, true);
        }
      });

      el.videoGrid.appendChild(card);
    });

    if (!state.currentVideo && videos.length > 0) {
      renderSidebarQueue(videos.slice(0, 8));
    }
  }

  // --- Workflows ---

  async function loadTrendingVideos(pageToken = '', append = false) {
    setLoading(true);
    el.gridLoaderText.textContent = 'Fetching trending videos...';
    try {
      const data = await fetchPopularVideos(pageToken);
      state.nextPageToken = data.nextPageToken;
      renderVideoGrid(data.items, append);
      el.catalogHeading.textContent = '🔥 Trending Worldwide';
      el.catalogSubheading.textContent = 'Watch high-definition movie trailers, viral clips, and music hits in-page';
    } catch (err) {
      console.error('Failed to fetch trending videos:', err);
      showToast('Live API notice: Showing curated top blockbusters', '🎬');
      state.nextPageToken = null;
      renderVideoGrid(CURATED_FALLBACK, false);
    } finally {
      setLoading(false);
    }
  }

  async function performSearch(query, pageToken = '', append = false) {
    if (!query || !query.trim()) return;
    const cleanQuery = query.trim();

    // Check if user entered a direct YouTube video URL or ID
    const directVideoId = extractYouTubeId(cleanQuery);
    if (directVideoId) {
      showToast('Detected YouTube link! Loading video...', '🚀');
      setLoading(true);
      try {
        const videoDetails = await fetchSingleVideoDetails(directVideoId);
        if (videoDetails) {
          playVideo(videoDetails, true);
          el.searchInput.value = '';
          el.clearSearchBtn.style.display = 'none';
          setLoading(false);
          return;
        }
      } catch (e) {}
      playVideo({
        id: directVideoId,
        title: `YouTube Video (${directVideoId})`,
        channelTitle: 'Streaming on iZent Cinema',
        description: 'Directly linked YouTube stream.',
        publishedAt: new Date().toISOString(),
        thumbnail: `https://i.ytimg.com/vi/${directVideoId}/hqdefault.jpg`,
        viewCount: null
      }, true);
      setLoading(false);
      return;
    }

    setLoading(true);
    el.gridLoaderText.textContent = `Searching for "${cleanQuery}"...`;
    state.currentQuery = cleanQuery;

    try {
      const data = await searchYouTube(cleanQuery, pageToken);
      state.nextPageToken = data.nextPageToken;
      renderVideoGrid(data.items, append);
      el.catalogHeading.textContent = `Search results for "${cleanQuery}"`;
      el.catalogSubheading.textContent = `Found videos matching your query. Click any video to watch in-page.`;
    } catch (err) {
      console.error('Search failed:', err);
      showToast('Search rate-limited. Displaying matching curated hits.', '⚠️');
      const filtered = CURATED_FALLBACK.filter(v => 
        v.title.toLowerCase().includes(cleanQuery.toLowerCase()) || 
        v.channelTitle.toLowerCase().includes(cleanQuery.toLowerCase())
      );
      renderVideoGrid(filtered.length > 0 ? filtered : CURATED_FALLBACK, false);
    } finally {
      setLoading(false);
    }
  }

  function setLoading(loading) {
    state.isLoading = loading;
    if (el.gridLoader) {
      el.gridLoader.style.display = loading ? 'flex' : 'none';
    }
  }

  // --- Theater & Dimmer Controls ---

  function toggleTheaterMode(forceState) {
    const isTheater = typeof forceState === 'boolean' ? forceState : !state.theaterMode;
    state.theaterMode = isTheater;
    localStorage.setItem(CONFIG.STORAGE_KEY_THEATER, isTheater);

    if (isTheater) {
      el.stageContainer.classList.add('theater-mode');
      el.theaterModeHeaderBtn.classList.add('active');
      el.theaterBtnText.textContent = 'Standard';
      showToast('Theater mode enabled (Key: T)', '🎬');
    } else {
      el.stageContainer.classList.remove('theater-mode');
      el.theaterModeHeaderBtn.classList.remove('active');
      el.theaterBtnText.textContent = 'Theater';
      showToast('Standard view restored', '📺');
    }
  }

  function toggleLightsDimmer(forceState) {
    const dimmed = typeof forceState === 'boolean' ? forceState : !state.lightsDimmed;
    state.lightsDimmed = dimmed;

    if (dimmed) {
      document.body.classList.add('lights-dimmed');
      el.lightsToggleBtn.classList.add('active');
      showToast('Cinema Lights Dimmed (Key: L)', '🌙');
    } else {
      document.body.classList.remove('lights-dimmed');
      el.lightsToggleBtn.classList.remove('active');
      showToast('Lights On', '☀️');
    }
  }

  function toggleAmbientGlow() {
    state.ambientGlow = !state.ambientGlow;
    localStorage.setItem(CONFIG.STORAGE_KEY_GLOW, state.ambientGlow);
    updateAmbientMood(state.currentVideo ? state.currentVideo.title : 'izent');

    const span = el.ambientToggleBtn.querySelector('span');
    if (span) {
      span.textContent = state.ambientGlow ? 'Glow: On' : 'Glow: Off';
    }
    el.ambientToggleBtn.classList.toggle('active', state.ambientGlow);
    showToast(state.ambientGlow ? 'Ambient glow enabled' : 'Ambient glow disabled', '💡');
  }

  function toggleAiCopilot(forceState) {
    const open = typeof forceState === 'boolean' ? forceState : !state.aiCopilotOpen;
    state.aiCopilotOpen = open;
    el.aiCopilotCard.style.display = open ? 'block' : 'none';
    el.aiCopilotToggleBtn.classList.toggle('active', open);

    if (open) {
      showToast('Cohere AI Copilot opened (Key: A)', '✨');
      el.aiCopilotCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  // --- Favorites & History Drawer Controller ---

  function toggleFavoriteCurrentVideo() {
    if (!state.currentVideo) {
      showToast('Play a video first to save it', 'ℹ️');
      return;
    }

    const index = state.favorites.findIndex(f => f.id === state.currentVideo.id);
    if (index > -1) {
      state.favorites.splice(index, 1);
      el.favoriteVideoBtn.classList.remove('active');
      el.favBtnText.textContent = 'Save';
      showToast('Removed from your saved library', '🗑️');
    } else {
      state.favorites.unshift(state.currentVideo);
      el.favoriteVideoBtn.classList.add('active');
      el.favBtnText.textContent = 'Saved';
      showToast('Saved to your library!', '❤️');
    }

    saveFavorites(state.favorites);
    updateLibraryBadges();
    if (state.activeDrawerTab === 'saved') renderLibraryDrawer();
  }

  function switchDrawerTab(tabName) {
    state.activeDrawerTab = tabName;
    el.tabDrawerSaved.classList.toggle('active', tabName === 'saved');
    el.tabDrawerHistory.classList.toggle('active', tabName === 'history');
    el.clearLibraryBtn.textContent = tabName === 'saved' ? 'Clear Saved List' : 'Clear Watch History';
    renderLibraryDrawer();
  }

  function renderLibraryDrawer() {
    if (!el.libraryItemsList) return;
    el.libraryItemsList.innerHTML = '';

    const list = state.activeDrawerTab === 'saved' ? state.favorites : state.history;

    if (list.length === 0) {
      el.libraryItemsList.innerHTML = `
        <div class="empty-drawer-state">
          <p>${state.activeDrawerTab === 'saved' ? 'No saved videos yet' : 'No watch history yet'}</p>
          <span>${state.activeDrawerTab === 'saved' ? 'Click "Save" on any video to add it to your playlist!' : 'Videos you stream will appear here for easy replay.'}</span>
        </div>
      `;
      return;
    }

    list.forEach((v, idx) => {
      const item = document.createElement('div');
      item.className = 'drawer-item';
      item.innerHTML = `
        <div class="drawer-thumb">
          <img src="${v.thumbnail}" alt="${v.title}">
        </div>
        <div>
          <div class="drawer-item-title" title="${v.title}">${v.title}</div>
          ${v.playedAt ? `<div class="drawer-history-time">Played ${formatTimeAgo(v.playedAt)}</div>` : ''}
        </div>
        <button type="button" class="drawer-remove-btn" title="Remove" data-index="${idx}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      `;

      item.addEventListener('click', (e) => {
        if (e.target.closest('.drawer-remove-btn')) return;
        playVideo(v, true);
        closeLibraryDrawer();
      });

      const removeBtn = item.querySelector('.drawer-remove-btn');
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (state.activeDrawerTab === 'saved') {
          state.favorites.splice(idx, 1);
          saveFavorites(state.favorites);
          if (state.currentVideo && state.currentVideo.id === v.id) {
            el.favoriteVideoBtn.classList.remove('active');
            el.favBtnText.textContent = 'Save';
          }
        } else {
          state.history.splice(idx, 1);
          saveHistory(state.history);
        }
        updateLibraryBadges();
        renderLibraryDrawer();
        showToast('Removed from list', '🗑️');
      });

      el.libraryItemsList.appendChild(item);
    });
  }

  function openLibraryDrawer(tab = 'saved') {
    switchDrawerTab(tab);
    el.libraryDrawer.classList.add('open');
    el.drawerOverlay.classList.add('open');
  }

  function closeLibraryDrawer() {
    el.libraryDrawer.classList.remove('open');
    el.drawerOverlay.classList.remove('open');
  }

  // --- Modals Controller ---

  function openAiMoodModal() {
    el.aiMoodModal.style.display = 'flex';
    setTimeout(() => el.aiMoodInput.focus(), 100);
  }

  function closeAiMoodModal() {
    el.aiMoodModal.style.display = 'none';
  }

  async function shareCurrentVideo() {
    if (!state.currentVideo) {
      showToast('Select a video first to share', 'ℹ️');
      return;
    }
    const currentUrl = new URL(window.location.origin + window.location.pathname);
    currentUrl.searchParams.set('v', state.currentVideo.id);
    const shareLink = currentUrl.toString();

    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(shareLink);
        showToast('Link copied to clipboard!', '🔗');
        return;
      } catch (err) {}
    }
    prompt('Copy direct video link:', shareLink);
  }

  // ==========================================================================
  // Event Listeners Setup
  // ==========================================================================

  function setupEventListeners() {
    // Search Form
    el.searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = el.searchInput.value;
      if (q && q.trim()) performSearch(q);
    });

    el.searchInput.addEventListener('input', () => {
      el.clearSearchBtn.style.display = el.searchInput.value ? 'flex' : 'none';
    });

    el.clearSearchBtn.addEventListener('click', () => {
      el.searchInput.value = '';
      el.clearSearchBtn.style.display = 'none';
      el.searchInput.focus();
    });

    // AI Mood Search Modal Openers
    el.openAiMoodBtn.addEventListener('click', openAiMoodModal);
    el.catAiVibeBtn.addEventListener('click', openAiMoodModal);
    el.placeholderAiBtn.addEventListener('click', openAiMoodModal);
    if (el.footerAiMoodLink) el.footerAiMoodLink.addEventListener('click', (e) => { e.preventDefault(); openAiMoodModal(); });
    el.closeMoodModalBtn.addEventListener('click', closeAiMoodModal);
    el.aiMoodModal.addEventListener('click', (e) => {
      if (e.target === el.aiMoodModal) closeAiMoodModal();
    });

    // Preset Mood Tag Clicks
    el.aiMoodModal.querySelectorAll('.mood-tag').forEach(tag => {
      tag.addEventListener('click', () => {
        el.aiMoodInput.value = tag.dataset.vibe;
        performSemanticMoodSearch(tag.dataset.vibe);
      });
    });

    // AI Mood Form Submit
    el.aiMoodForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = el.aiMoodInput.value;
      if (val && val.trim()) {
        performSemanticMoodSearch(val);
      }
    });

    // Category Filter Chips
    el.categoriesTrack.addEventListener('click', (e) => {
      const pill = e.target.closest('.cat-pill');
      if (!pill || pill.id === 'catAiVibeBtn') return;

      el.categoriesTrack.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      const cat = pill.dataset.category;
      state.currentCategory = cat;

      if (cat === 'trending') {
        state.currentQuery = '';
        el.searchInput.value = '';
        el.clearSearchBtn.style.display = 'none';
        loadTrendingVideos();
      } else {
        performSearch(cat);
      }
    });

    // Empty Player Button
    el.startTrendingBtn.addEventListener('click', () => {
      if (state.activeGridItems.length > 0) {
        playVideo(state.activeGridItems[0], true);
      } else {
        playVideo(CURATED_FALLBACK[0], true);
      }
    });

    // Description Toggle
    el.descToggleBtn.addEventListener('click', () => {
      const isExpanded = el.descriptionBox.classList.toggle('expanded');
      el.descToggleBtn.textContent = isExpanded ? 'Show Less' : 'Show More';
    });

    // Action Toolbar Buttons
    el.lightsToggleBtn.addEventListener('click', () => toggleLightsDimmer());
    el.cinemaDimmer.addEventListener('click', () => toggleLightsDimmer(false));
    el.theaterModeHeaderBtn.addEventListener('click', () => toggleTheaterMode());
    el.theaterModeInlineBtn.addEventListener('click', () => toggleTheaterMode());
    el.ambientToggleBtn.addEventListener('click', () => toggleAmbientGlow());
    el.favoriteVideoBtn.addEventListener('click', () => toggleFavoriteCurrentVideo());
    el.shareVideoBtn.addEventListener('click', () => shareCurrentVideo());
    if (el.closePlayerBtn) el.closePlayerBtn.addEventListener('click', () => closePlayer());

    // Sleep Timer Dropdown
    el.sleepTimerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = el.sleepTimerDropdown.style.display === 'flex';
      el.sleepTimerDropdown.style.display = isVisible ? 'none' : 'flex';
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.sleep-timer-wrapper')) {
        el.sleepTimerDropdown.style.display = 'none';
      }
    });

    el.sleepTimerDropdown.querySelectorAll('.sleep-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        const mins = parseInt(opt.dataset.mins, 10);
        setSleepTimer(mins);
        el.sleepTimerDropdown.style.display = 'none';
      });
    });

    // AI Copilot Panel & Tabs
    el.aiCopilotToggleBtn.addEventListener('click', () => toggleAiCopilot());
    el.closeAiCardBtn.addEventListener('click', () => toggleAiCopilot(false));

    el.aiCopilotCard.querySelectorAll('.ai-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        el.aiCopilotCard.querySelectorAll('.ai-tab-btn').forEach(b => b.classList.remove('active'));
        el.aiCopilotCard.querySelectorAll('.ai-tab-pane').forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const tab = btn.dataset.tab;
        const targetPane = document.getElementById(`pane-${tab}`);
        if (targetPane) targetPane.classList.add('active');
      });
    });

    el.generateSummaryBtn.addEventListener('click', generateVideoSummary);
    el.generateCriticBtn.addEventListener('click', generateCriticReview);
    el.generateChaptersBtn.addEventListener('click', extractVideoChapters);

    // AI Companion Chat Form
    el.aiChatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = el.aiChatInput.value;
      sendCompanionChatMessage(text);
    });

    // Chat Prompt Chips
    el.aiChatChips.querySelectorAll('.chip-btn').forEach(chip => {
      chip.addEventListener('click', () => {
        sendCompanionChatMessage(chip.dataset.prompt);
      });
    });

    // Library Drawer & Tabs
    el.bookmarksToggleBtn.addEventListener('click', () => openLibraryDrawer('saved'));
    el.drawerCloseBtn.addEventListener('click', () => closeLibraryDrawer());
    el.drawerOverlay.addEventListener('click', () => closeLibraryDrawer());

    el.tabDrawerSaved.addEventListener('click', () => switchDrawerTab('saved'));
    el.tabDrawerHistory.addEventListener('click', () => switchDrawerTab('history'));

    el.clearLibraryBtn.addEventListener('click', () => {
      const isSavedTab = state.activeDrawerTab === 'saved';
      const count = isSavedTab ? state.favorites.length : state.history.length;
      if (count === 0) return;

      if (confirm(`Clear all ${isSavedTab ? 'saved videos' : 'watch history'}?`)) {
        if (isSavedTab) {
          state.favorites = [];
          saveFavorites([]);
          if (el.favoriteVideoBtn) {
            el.favoriteVideoBtn.classList.remove('active');
            el.favBtnText.textContent = 'Save';
          }
        } else {
          state.history = [];
          saveHistory([]);
        }
        updateLibraryBadges();
        renderLibraryDrawer();
        showToast('List cleared', '🗑️');
      }
    });

    // Load More Button
    el.loadMoreBtn.addEventListener('click', () => {
      if (state.nextPageToken && !state.isLoading) {
        if (state.currentQuery) {
          performSearch(state.currentQuery, state.nextPageToken, true);
        } else {
          loadTrendingVideos(state.nextPageToken, true);
        }
      }
    });

    // Shortcuts Modal
    el.footerShortcutsLink.addEventListener('click', (e) => {
      e.preventDefault();
      el.shortcutsModal.style.display = 'flex';
    });
    el.closeModalBtn.addEventListener('click', () => {
      el.shortcutsModal.style.display = 'none';
    });
    el.shortcutsModal.addEventListener('click', (e) => {
      if (e.target === el.shortcutsModal) el.shortcutsModal.style.display = 'none';
    });

    // Footer Links & Brand Logo
    el.brandLogo.addEventListener('click', (e) => {
      e.preventDefault();
      closePlayer();
      state.currentQuery = '';
      el.searchInput.value = '';
      el.clearSearchBtn.style.display = 'none';
      const trendingPill = el.categoriesTrack.querySelector('[data-category="trending"]');
      if (trendingPill) {
        el.categoriesTrack.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
        trendingPill.classList.add('active');
      }
      loadTrendingVideos();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    el.footerScrollTop.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    el.footerOpenLibrary.addEventListener('click', (e) => {
      e.preventDefault();
      openLibraryDrawer('saved');
    });

    document.querySelectorAll('.footer-cat-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const cat = link.dataset.cat;
        performSearch(cat);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

    // Global Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        if (e.key === 'Escape') document.activeElement.blur();
        return;
      }

      if (e.key === '/' || (e.ctrlKey && e.key === 'k')) {
        e.preventDefault();
        el.searchInput.focus();
        el.searchInput.select();
      } else if (e.key === 't' || e.key === 'T') {
        toggleTheaterMode();
      } else if (e.key === 'l' || e.key === 'L') {
        toggleLightsDimmer();
      } else if (e.key === 'a' || e.key === 'A') {
        toggleAiCopilot();
      } else if (e.key === 'Escape') {
        closeLibraryDrawer();
        closeAiMoodModal();
        toggleLightsDimmer(false);
        el.shortcutsModal.style.display = 'none';
      }
    });
  }

  // --- App Initialization ---

  async function init() {
    updateLibraryBadges();
    setupEventListeners();

    if (state.theaterMode) {
      toggleTheaterMode(true);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const videoParam = urlParams.get('v');
    const queryParam = urlParams.get('q');

    if (queryParam) {
      el.searchInput.value = queryParam;
      el.clearSearchBtn.style.display = 'flex';
      await performSearch(queryParam);
    } else {
      await loadTrendingVideos();
    }

    if (videoParam) {
      try {
        const details = await fetchSingleVideoDetails(videoParam);
        if (details) {
          playVideo(details, true);
        } else {
          playVideo({
            id: videoParam,
            title: `YouTube Video (${videoParam})`,
            channelTitle: 'Streaming on iZent Cinema',
            description: 'Directly linked video stream.',
            publishedAt: new Date().toISOString(),
            thumbnail: `https://i.ytimg.com/vi/${videoParam}/hqdefault.jpg`,
            viewCount: null
          }, true);
        }
      } catch (err) {
        console.warn('Error loading initial videoParam:', err);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
