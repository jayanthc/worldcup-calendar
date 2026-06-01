/* FIFA World Cup 2026 Match Calendar - Core Application Logic */

// Global Application State
let rawMatches = [];
let filteredMatches = [];
let activeFilters = {
  search: '',
  country: 'ALL',
  stage: 'ALL',
  venue: 'ALL',
  group: 'ALL',
  timezone: 'local' // 'local', 'venue', 'utc'
};

// Target Date for Opening Match: June 11, 2026 at 11:00:00 UTC
const OPENING_MATCH_DATE = new Date("2026-06-11T11:00:00Z");

// Country ISO 2-letter Code Mapping for FlagCDN
const countryCodes = {
  'Algeria': 'dz',
  'Argentina': 'ar',
  'Australia': 'au',
  'Austria': 'at',
  'Belgium': 'be',
  'Bosnia and Herzegovina': 'ba',
  'Brazil': 'br',
  'Canada': 'ca',
  'Cape Verde': 'cv',
  'Colombia': 'co',
  'Croatia': 'hr',
  'Curaçao': 'cw',
  'Czech Republic': 'cz',
  'DR Congo': 'cd',
  'Ecuador': 'ec',
  'Egypt': 'eg',
  'England': 'gb-eng',
  'France': 'fr',
  'Germany': 'de',
  'Ghana': 'gh',
  'Haiti': 'ht',
  'Iran': 'ir',
  'Iraq': 'iq',
  'Ivory Coast': 'ci',
  'Japan': 'jp',
  'Jordan': 'jo',
  'Mexico': 'mx',
  'Morocco': 'ma',
  'Netherlands': 'nl',
  'New Zealand': 'nz',
  'Norway': 'no',
  'Panama': 'pa',
  'Paraguay': 'py',
  'Portugal': 'pt',
  'Qatar': 'qa',
  'Saudi Arabia': 'sa',
  'Scotland': 'gb-sct',
  'Senegal': 'sn',
  'South Africa': 'za',
  'South Korea': 'kr',
  'Spain': 'es',
  'Sweden': 'se',
  'Switzerland': 'ch',
  'Tunisia': 'tn',
  'Turkey': 'tr',
  'United States': 'us',
  'Uruguay': 'uy',
  'Uzbekistan': 'uz'
};

// Stadium Timezones Map (IANA)
const stadiumTimezones = {
  "Estadio Azteca, Mexico City": "America/Mexico_City",
  "Estadio Akron, Zapopan": "America/Mexico_City",
  "BMO Field, Toronto": "America/Toronto",
  "SoFi Stadium, Inglewood": "America/Los_Angeles",
  "Gillette Stadium, Foxborough": "America/New_York",
  "BC Place, Vancouver": "America/Vancouver",
  "MetLife Stadium, East Rutherford": "America/New_York",
  "Levi's Stadium, Santa Clara": "America/Los_Angeles",
  "Lincoln Financial Field, Philadelphia": "America/New_York",
  "NRG Stadium, Houston": "America/Chicago",
  "AT&T Stadium, Arlington": "America/Chicago",
  "Estadio BBVA, Guadalupe": "America/Monterrey",
  "Hard Rock Stadium, Miami Gardens": "America/New_York",
  "Mercedes-Benz Stadium, Atlanta": "America/New_York",
  "Lumen Field, Seattle": "America/Los_Angeles",
  "Arrowhead Stadium, Kansas City": "America/Chicago"
};

// Helper: Clean name to match generated ICS file names
function cleanFilename(name) {
  return name.replace(/[^a-zA-Z0-9\s-]/g, '').strip?.() || name.replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '_');
}

// 1. Initialize Lucide Icons & App
document.addEventListener("DOMContentLoaded", () => {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
  
  startCountdownTicker();
  fetchScheduleData();
  setupEventHandlers();
});

// 2. Opening Kickoff Countdown Timer
function startCountdownTicker() {
  const daysEl = document.getElementById("days");
  const hoursEl = document.getElementById("hours");
  const minutesEl = document.getElementById("minutes");
  const secondsEl = document.getElementById("seconds");
  
  function updateTicker() {
    const now = new Date();
    const diff = OPENING_MATCH_DATE - now;
    
    if (diff <= 0) {
      document.getElementById("openingCountdown").innerHTML = `<span class="countdown-label" style="color: var(--accent-green)">LIVE NOW</span>`;
      return;
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    daysEl.textContent = String(days).padStart(2, '0');
    hoursEl.textContent = String(hours).padStart(2, '0');
    minutesEl.textContent = String(minutes).padStart(2, '0');
    secondsEl.textContent = String(seconds).padStart(2, '0');
  }
  
  updateTicker();
  setInterval(updateTicker, 1000); // Update every second
}

// 3. Fetch CSV data and parse it
async function fetchScheduleData() {
  const loader = document.getElementById("mainLoader");
  try {
    const response = await fetch("worldcup_2026_schedule.csv");
    if (!response.ok) throw new Error("Could not load CSV schedule data.");
    
    const csvText = await response.text();
    rawMatches = parseCSV(csvText);
    filteredMatches = [...rawMatches];
    
    // Hide loader and render dashboard options
    loader.style.display = "none";
    populateFilters();
    renderTimeline();
    updateStatsBar();
    
  } catch (error) {
    console.error(error);
    loader.innerHTML = `
      <i data-lucide="alert-circle" style="width: 48px; height: 48px; color: var(--accent-gold)"></i>
      <p style="margin-top: 1rem; font-weight: 600;">Failed to load match calendar data.</p>
      <p style="font-size: 0.8rem; color: var(--text-muted)">Please refresh the page or try again later.</p>
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

// Simple and robust CSV parser supporting quote escapes
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
  const headers = lines[0].split(',');
  const matches = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    let insideQuote = false;
    let currentToken = '';
    const tokens = [];

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === ',' && !insideQuote) {
        tokens.push(currentToken.trim());
        currentToken = '';
      } else {
        currentToken += char;
      }
    }
    tokens.push(currentToken.trim());

    if (tokens.length >= 6) {
      matches.push({
        country_a: tokens[0],
        country_b: tokens[1],
        stage: tokens[2],
        group: tokens[3],
        location: tokens[4].replace(/"/g, ''),
        time: tokens[5]
      });
    }
  }
  return matches;
}

// 4. Populate filters with unique options from schedule
function populateFilters() {
  const selCountry = document.getElementById("selCountry");
  const selVenue = document.getElementById("selVenue");
  
  const countries = new Set();
  const venues = new Set();
  
  rawMatches.forEach(match => {
    // Only add actual countries, ignore placeholder names
    [match.country_a, match.country_b].forEach(team => {
      if (team && !isPlaceholderTeam(team)) {
        countries.add(team);
      }
    });
    
    if (match.location) {
      venues.add(match.location);
    }
  });
  
  // Populate Favourite Team selector
  Array.from(countries).sort().forEach(country => {
    const option = document.createElement("option");
    option.value = country;
    option.textContent = country;
    selCountry.appendChild(option);
  });
  
  // Populate Venues selector
  Array.from(venues).sort().forEach(venue => {
    const option = document.createElement("option");
    option.value = venue;
    // Show only City/Stadium name nicely
    const parts = venue.split(', ');
    option.textContent = parts[parts.length - 1] || venue;
    selVenue.appendChild(option);
  });
}

// Helper to check if a team is a placeholder
function isPlaceholderTeam(teamName) {
  return teamName.startsWith("Winner") || 
         teamName.startsWith("Runner-up") || 
         teamName.startsWith("3rd") || 
         teamName.startsWith("Loser");
}

// 5. Apply filters and render the matches timeline
function applyFilters() {
  filteredMatches = rawMatches.filter(match => {
    // Search filter
    if (activeFilters.search) {
      const q = activeFilters.search.toLowerCase();
      const matchText = `${match.country_a} ${match.country_b} ${match.stage} ${match.group} ${match.location}`.toLowerCase();
      if (!matchText.includes(q)) return false;
    }
    
    // Country filter (matches team A or team B)
    if (activeFilters.country !== 'ALL') {
      if (match.country_a !== activeFilters.country && match.country_b !== activeFilters.country) {
        return false;
      }
    }
    
    // Stage filter
    if (activeFilters.stage !== 'ALL') {
      if (match.stage !== activeFilters.stage) return false;
    }
    
    // Venue filter
    if (activeFilters.venue !== 'ALL') {
      if (match.location !== activeFilters.venue) return false;
    }
    
    // Group filter
    if (activeFilters.group !== 'ALL') {
      if (match.group !== activeFilters.group) return false;
    }
    
    return true;
  });
  
  renderTimeline();
  updateStatsBar();
  updateSyncDescription();
}

// Update Match count and Reset buttons
function updateStatsBar() {
  const countEl = document.getElementById("matchesCount");
  const resetBtn = document.getElementById("btnResetFilters");
  
  const total = rawMatches.length;
  const filtered = filteredMatches.length;
  
  if (filtered === total) {
    countEl.innerHTML = `Showing all <strong>${total}</strong> fixtures`;
  } else {
    countEl.innerHTML = `Showing <strong>${filtered}</strong> of <strong>${total}</strong> matches`;
  }
  
  // Show reset button if filters are active
  const isFiltered = activeFilters.search !== '' || 
                     activeFilters.country !== 'ALL' || 
                     activeFilters.stage !== 'ALL' || 
                     activeFilters.venue !== 'ALL' || 
                     activeFilters.group !== 'ALL';
  
  resetBtn.style.display = isFiltered ? "inline-flex" : "none";
}

// Update details on the Quick Sync card
function updateSyncDescription() {
  const syncDesc = document.getElementById("syncDescription");
  const bottomSyncDesc = document.getElementById("bottomSyncDescription");
  
  let descText = "";
  if (activeFilters.country !== 'ALL') {
    descText = `3 matches involving <strong>${activeFilters.country}</strong>, customized for you`;
  } else if (filteredMatches.length !== rawMatches.length) {
    descText = `<strong>${filteredMatches.length}</strong> selected matches based on your active filters`;
  } else {
    descText = `All <strong>104</strong> matches, ready for your device`;
  }
  
  syncDesc.innerHTML = descText;
  if (bottomSyncDesc) {
    bottomSyncDesc.innerHTML = descText;
  }
}

// 6. Chronological match renderer grouped by Dates
function renderTimeline() {
  const container = document.getElementById("timelineContainer");
  container.innerHTML = "";
  
  if (filteredMatches.length === 0) {
    container.innerHTML = `
      <div class="empty-state glass-card">
        <div class="empty-icon"><i data-lucide="calendar-x"></i></div>
        <h3>No matches found</h3>
        <p>Try clearing your active filters or adjusting your search term to see more fixtures.</p>
        <button id="btnEmptyReset" class="btn btn-secondary">
          <i data-lucide="rotate-ccw"></i> Reset Filters
        </button>
      </div>
    `;
    document.getElementById("btnEmptyReset").addEventListener("click", resetAllFilters);
    const bottomPanel = document.getElementById("bottomSyncPanel");
    if (bottomPanel) bottomPanel.style.display = "none";
    if (typeof lucide !== 'undefined') lucide.createIcons();
    return;
  }
  
  // Group matches by Date String based on selected Timezone
  const groups = {};
  
  filteredMatches.forEach(match => {
    const formattedDateKey = getDateStringForTimezone(match.time, match.location);
    if (!groups[formattedDateKey]) {
      groups[formattedDateKey] = [];
    }
    groups[formattedDateKey].push(match);
  });
  
  // Sort date keys chronologically
  const sortedDates = Object.keys(groups).sort((a, b) => {
    // Take the time of the first match in each group to sort accurately
    return new Date(groups[a][0].time) - new Date(groups[b][0].time);
  });
  
  sortedDates.forEach(dateStr => {
    const dateGroup = document.createElement("div");
    dateGroup.className = "timeline-date-group";
    
    // Header for the date
    dateGroup.innerHTML = `<h3 class="date-header">${dateStr}</h3>`;
    
    const matchesList = document.createElement("div");
    matchesList.className = "matches-list";
    
    groups[dateStr].forEach(match => {
      const matchCard = createMatchCard(match);
      matchesList.appendChild(matchCard);
    });
    
    dateGroup.appendChild(matchesList);
    container.appendChild(dateGroup);
  });
  
  const bottomPanel = document.getElementById("bottomSyncPanel");
  if (bottomPanel) bottomPanel.style.display = "flex";
  
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

// Render individual match cards
function createMatchCard(match) {
  const card = document.createElement("article");
  card.className = "match-card glass-card";
  
  const isFavCountryA = activeFilters.country !== 'ALL' && match.country_a === activeFilters.country;
  const isFavCountryB = activeFilters.country !== 'ALL' && match.country_b === activeFilters.country;
  
  // Teams HTML with Flags
  const teamAHtml = getTeamRowHtml(match.country_a, isFavCountryA);
  const teamBHtml = getTeamRowHtml(match.country_b, isFavCountryB);
  
  // Time and Date string inside the card
  const formattedTime = getFormattedTimeForTimezone(match.time, match.location);
  
  // Google Calendar URL for individual match add
  const gcalUrl = getIndividualGoogleCalendarUrl(match);
  
  card.innerHTML = `
    <div class="match-meta">
      <span class="match-stage">${match.stage}</span>
      <span class="match-group-name">${match.group || ''}</span>
    </div>
    
    <div class="match-teams">
      ${teamAHtml}
      ${teamBHtml}
    </div>
    
    <div class="match-time-info">
      <span class="match-time">${formattedTime}</span>
      <span class="match-venue" title="${match.location}">
        <i data-lucide="map-pin"></i>
        <span>${match.location.split(', ').slice(-2).join(', ')}</span>
      </span>
    </div>
    
    <div class="match-actions">
      <a href="${gcalUrl}" target="_blank" class="btn-card btn-card-primary" title="Add this match to your Google Calendar">
        <i data-lucide="calendar-plus"></i>
        <span>+ Google Cal</span>
      </a>
      <button class="btn-card btn-download-match" title="Download ICS for this match">
        <i data-lucide="download"></i>
        <span>Download ICS</span>
      </button>
    </div>
  `;
  
  // Bind Download ICS for this match card
  card.querySelector(".btn-download-match").addEventListener("click", () => {
    downloadSingleMatchIcs(match);
  });
  
  return card;
}

// Generate team row with flag image or soccer-ball placeholder
function getTeamRowHtml(teamName, isHighlighted) {
  const code = countryCodes[teamName];
  const highlightClass = isHighlighted ? 'highlighted' : '';
  
  let flagHtml = `<i data-lucide="soccer-ball" class="team-flag-placeholder"></i>`;
  if (code) {
    flagHtml = `<img src="https://flagcdn.com/w40/${code}.png" alt="${teamName}" class="team-flag">`;
  }
  
  return `
    <div class="team-row ${highlightClass}">
      <div class="team-flag-container">
        ${flagHtml}
      </div>
      <span class="team-name" title="${teamName}">${teamName}</span>
    </div>
  `;
}

// 7. Timezone conversion and date/time formatters
function getDateStringForTimezone(utcTimeStr, location) {
  const date = new Date(utcTimeStr);
  const tz = getTargetTimezone(location);
  
  const options = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    timeZone: tz
  };
  
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

function getFormattedTimeForTimezone(utcTimeStr, location) {
  const date = new Date(utcTimeStr);
  const tz = getTargetTimezone(location);
  
  const options = { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true,
    timeZone: tz,
    timeZoneName: activeFilters.timezone === 'local' ? 'short' : undefined
  };
  
  let timeString = new Intl.DateTimeFormat('en-US', options).format(date);
  
  // Add customized stadium time zone badge
  if (activeFilters.timezone === 'venue') {
    const tzOptions = { timeZone: tz, timeZoneName: 'short' };
    const tzName = new Intl.DateTimeFormat('en-US', tzOptions).format(date).split(' ').pop();
    timeString += ` ${tzName}`;
  } else if (activeFilters.timezone === 'utc') {
    timeString += ' UTC';
  }
  
  return timeString;
}

function getTargetTimezone(location) {
  if (activeFilters.timezone === 'venue') {
    return stadiumTimezones[location] || 'UTC';
  } else if (activeFilters.timezone === 'utc') {
    return 'UTC';
  }
  // Fallback to local timezone (browser default)
  return undefined; 
}

// 8. Individual Event Add Google Calendar Links
function getIndividualGoogleCalendarUrl(match) {
  const startDate = new Date(match.time);
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours duration
  
  const formatGCalDate = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  
  const startStr = formatGCalDate(startDate);
  const endStr = formatGCalDate(endDate);
  
  const title = `${match.country_a} vs ${match.country_b} (${match.stage})`;
  const location = match.location;
  
  const descParts = [
    `FIFA World Cup 2026 Match`,
    `Stage: ${match.stage}`
  ];
  if (match.group) descParts.push(`Group: ${match.group}`);
  descParts.push(`Venue: ${location}`);
  descParts.push(`More details: https://worldcup2026.web.app`);
  
  const details = descParts.join('\n');
  
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startStr}/${endStr}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
}

// 9. Client-Side ICS Dynamic iCalendar Generation & Downloads
function generateICSContent(matchesList, titleSuffix) {
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FIFA World Cup 2026 Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:FIFA World Cup 2026 - ${titleSuffix}`,
    'X-WR-TIMEZONE:UTC',
    'X-WR-CALDESC:FIFA World Cup 2026 Matches Calendar'
  ];

  const nowStr = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const formatICSDate = (date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  matchesList.forEach((match, index) => {
    const startDate = new Date(match.time);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours
    const dtStart = formatICSDate(startDate);
    const dtEnd = formatICSDate(endDate);

    const cleanTeamA = match.country_a.replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '_');
    const cleanTeamB = match.country_b.replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '_');
    const uid = `match_2026_${index}_${cleanTeamA}_vs_${cleanTeamB}_client@worldcup2026.web.app`;
    
    const summary = `${match.country_a} vs ${match.country_b}`;
    const location = match.location;
    
    const descParts = [
      'FIFA World Cup 2026',
      `Stage: ${match.stage}`
    ];
    if (match.group) descParts.push(`Group: ${match.group}`);
    descParts.push(`Venue: ${location}`);
    const description = descParts.join('\\n');

    ics.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${nowStr}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${summary}`,
      `LOCATION:${location}`,
      `DESCRIPTION:${description}`,
      'END:VEVENT'
    );
  });

  ics.push('END:VCALENDAR');
  return ics.join('\r\n');
}

// Download dynamic file helper
function triggerDownload(content, filename) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8;' });
  
  if (navigator.msSaveBlob) { // IE10+
    navigator.msSaveBlob(blob, filename);
  } else {
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}

// Actions triggered from match cards
function downloadSingleMatchIcs(match) {
  const content = generateICSContent([match], `${match.country_a} vs ${match.country_b}`);
  const filename = `${cleanFilename(match.country_a)}_vs_${cleanFilename(match.country_b)}.ics`;
  triggerDownload(content, filename);
}

// Dynamic batch ICS download of currently filtered matches
function downloadFilteredMatchesIcs() {
  let suffix = "All Matches";
  let filename = "worldcup_2026_all_matches.ics";
  
  if (activeFilters.country !== 'ALL') {
    suffix = `${activeFilters.country} Matches`;
    filename = `worldcup_2026_${cleanFilename(activeFilters.country)}.ics`;
  } else if (filteredMatches.length !== rawMatches.length) {
    suffix = "Filtered Matches";
    filename = "worldcup_2026_custom_matches.ics";
  }
  
  const content = generateICSContent(filteredMatches, suffix);
  triggerDownload(content, filename);
}

// 10. Event Handlers & Modal Interactions
function setupEventHandlers() {
  const txtSearch = document.getElementById("txtSearch");
  const btnClearSearch = document.getElementById("btnClearSearch");
  const selCountry = document.getElementById("selCountry");
  const selVenue = document.getElementById("selVenue");
  const selGroup = document.getElementById("selGroup");
  const stageFilters = document.getElementById("stageFilters");
  const timezoneToggle = document.getElementById("timezoneToggle");
  
  // Reset buttons
  const btnReset = document.getElementById("btnResetFilters");
  btnReset.addEventListener("click", resetAllFilters);
  
  // Search input
  txtSearch.addEventListener("input", (e) => {
    activeFilters.search = e.target.value.trim();
    btnClearSearch.style.display = activeFilters.search ? "block" : "none";
    applyFilters();
  });
  
  btnClearSearch.addEventListener("click", () => {
    txtSearch.value = "";
    activeFilters.search = "";
    btnClearSearch.style.display = "none";
    applyFilters();
  });
  
  // Dropdown Selectors
  selCountry.addEventListener("change", (e) => {
    activeFilters.country = e.target.value;
    applyFilters();
  });
  
  selVenue.addEventListener("change", (e) => {
    activeFilters.venue = e.target.value;
    applyFilters();
  });

  selGroup.addEventListener("change", (e) => {
    activeFilters.group = e.target.value;
    applyFilters();
  });
  
  // Stage Pills selector
  stageFilters.addEventListener("click", (e) => {
    const pill = e.target.closest(".pill");
    if (!pill) return;
    
    // Deactivate previous
    stageFilters.querySelectorAll(".pill").forEach(p => p.classList.remove("active"));
    pill.classList.add("active");
    
    activeFilters.stage = pill.dataset.stage;
    applyFilters();
  });
  
  // Timezone Switcher Toggle
  timezoneToggle.addEventListener("click", (e) => {
    const btn = e.target.closest(".toggle-btn");
    if (!btn) return;
    
    timezoneToggle.querySelectorAll(".toggle-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    
    activeFilters.timezone = btn.dataset.timezone;
    renderTimeline(); // No filtering changes needed, just a re-render
  });
  
  // Primary ICS Action Buttons
  document.getElementById("btnDownloadIcs").addEventListener("click", downloadFilteredMatchesIcs);
  document.getElementById("btnGoogleCalendar").addEventListener("click", openGoogleCalendarModal);
  
  // Bottom ICS Action Buttons
  const bottomDownloadBtn = document.getElementById("btnBottomDownloadIcs");
  const bottomGoogleBtn = document.getElementById("btnBottomGoogleCalendar");
  if (bottomDownloadBtn) bottomDownloadBtn.addEventListener("click", downloadFilteredMatchesIcs);
  if (bottomGoogleBtn) bottomGoogleBtn.addEventListener("click", openGoogleCalendarModal);
  
  // Modal handlers
  const importModal = document.getElementById("importModal");
  document.getElementById("btnCloseModal").addEventListener("click", () => {
    importModal.classList.remove("active");
  });
  
  window.addEventListener("click", (e) => {
    if (e.target === importModal) {
      importModal.classList.remove("active");
    }
  });
}

function resetAllFilters() {
  document.getElementById("txtSearch").value = "";
  document.getElementById("btnClearSearch").style.display = "none";
  document.getElementById("selCountry").value = "ALL";
  document.getElementById("selVenue").value = "ALL";
  document.getElementById("selGroup").value = "ALL";
  
  const stageFilters = document.getElementById("stageFilters");
  stageFilters.querySelectorAll(".pill").forEach(p => p.classList.remove("active"));
  stageFilters.querySelector("[data-stage='ALL']").classList.add("active");
  
  activeFilters = {
    search: '',
    country: 'ALL',
    stage: 'ALL',
    venue: 'ALL',
    group: 'ALL',
    timezone: activeFilters.timezone // Keep active timezone selection
  };
  
  applyFilters();
}

// 11. Modal Setup and direct Google Calendar Subscriptions
function openGoogleCalendarModal() {
  const importModal = document.getElementById("importModal");
  const modalCalendarName = document.getElementById("modalCalendarName");
  const modalDirectSyncLink = document.getElementById("modalDirectSyncLink");
  const txtIcsUrl = document.getElementById("txtIcsUrl");
  const modalDownloadBtn = document.getElementById("modalDownloadBtn");
  
  // 1. Set Calendar text based on filter
  let calendarTitle = "All Matches";
  let staticFilename = "all.ics";
  
  if (activeFilters.country !== 'ALL') {
    calendarTitle = `${activeFilters.country} Matches`;
    staticFilename = `${cleanFilename(activeFilters.country)}.ics`;
  } else if (filteredMatches.length !== rawMatches.length) {
    calendarTitle = "Custom Matches Calendar";
  }
  
  modalCalendarName.textContent = calendarTitle;
  
  // 2. Derive domain URL for Google Calendar CID subscription
  // Fallback to the production domain worldcup-2026-calendar.web.app
  const origin = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'https://worldcup-2026-calendar.web.app' 
    : window.location.origin;
    
  const icsFileUrl = `${origin}/calendars/${staticFilename}`;
  txtIcsUrl.value = icsFileUrl;
  
  // Set Google Calendar direct CID subscription link
  const gcalSyncUrl = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(icsFileUrl)}`;
  modalDirectSyncLink.href = gcalSyncUrl;
  
  // Reset Copy Button State
  const btnCopyUrl = document.getElementById("btnCopyUrl");
  btnCopyUrl.innerHTML = `<i data-lucide="copy"></i> Copy`;
  if (typeof lucide !== 'undefined') lucide.createIcons();
  
  // Setup copy to clipboard click event
  btnCopyUrl.replaceWith(btnCopyUrl.cloneNode(true)); // Clear previous listeners
  document.getElementById("btnCopyUrl").addEventListener("click", () => {
    txtIcsUrl.select();
    txtIcsUrl.setSelectionRange(0, 99999); // For mobile devices
    navigator.clipboard.writeText(txtIcsUrl.value);
    
    document.getElementById("btnCopyUrl").innerHTML = `<i data-lucide="check"></i> Copied!`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  });
  
  // Bind Download click inside modal
  modalDownloadBtn.replaceWith(modalDownloadBtn.cloneNode(true)); // Clear previous listeners
  document.getElementById("modalDownloadBtn").addEventListener("click", () => {
    downloadFilteredMatchesIcs();
    importModal.classList.remove("active");
  });
  
  // Show Modal
  importModal.classList.add("active");
}
