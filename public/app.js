/* FIFA World Cup 2026 Match Calendar - Core Application Logic */

// Global Application State
let rawMatches = [];
let filteredMatches = [];
let activeFilters = {
  country: new Set(), // Set of selected country names (empty means All Teams)
  group: new Set(),   // Set of selected group names (empty means All Groups)
  stage: 'ALL',
  venue: new Set(),   // Set of selected city names (empty means All Cities)
  timezone: 'local'   // 'local', 'venue', 'utc'
};

// Target Date for Opening Match: June 11, 2026 at 19:00:00 UTC
const OPENING_MATCH_DATE = new Date("2026-06-11T19:00:00Z");

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
  return name.replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '_');
}

// Helper to get flag emoji for a country name (Unicode native flag conversion)
function getFlagEmoji(countryName) {
  if (isPlaceholderTeam(countryName)) return "⚽";
  const code = countryCodes[countryName];
  if (!code) return "⚽";

  if (code === 'gb-eng') return "🏴󠁧󠁢󠁥󠁮󠁧󠁿";
  if (code === 'gb-sct') return "🏴󠁧󠁢󠁳󠁣󠁴󠁿";
  if (code === 'gb-wls') return "🏴󠁧󠁢󠁷󠁬󠁳󠁿";

  const codeUpper = code.toUpperCase();
  return String.fromCodePoint(
    127397 + codeUpper.charCodeAt(0),
    127397 + codeUpper.charCodeAt(1)
  );
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

// 4. Populate custom checkbox multiselect containers with unique options
function populateFilters() {
  const countryList = document.getElementById("countryList");
  const groupList = document.getElementById("groupList");
  const venueList = document.getElementById("venueList");

  const countries = new Set();
  const groups = new Set();
  const venues = new Set();

  rawMatches.forEach(match => {
    // Only add actual countries, ignore placeholder names
    [match.country_a, match.country_b].forEach(team => {
      if (team && !isPlaceholderTeam(team)) {
        countries.add(team);
      }
    });

    if (match.group && match.group.trim() !== '') {
      groups.add(match.group);
    }

    if (match.location) {
      const city = match.location.split(', ').pop();
      venues.add(city);
    }
  });

  // Populate Favourite Team custom checkbox list
  countryList.innerHTML = "";
  Array.from(countries).sort().forEach(country => {
    const item = document.createElement("div");
    item.className = "multiselect-item";
    item.dataset.value = country;

    const code = countryCodes[country];
    let flagHtml = `<i data-lucide="trophy" class="multiselect-flag-placeholder"></i>`;
    if (code) {
      flagHtml = `<img src="https://flagcdn.com/w40/${code}.png" alt="${country}" class="multiselect-flag">`;
    }

    const inputId = `chk_country_${cleanFilename(country)}`;
    item.innerHTML = `
      <input type="checkbox" id="${inputId}" value="${country}">
      <div class="multiselect-flag-container">${flagHtml}</div>
      <label for="${inputId}">${country}</label>
    `;

    // Bind click events on custom item clicks
    item.querySelector("input").addEventListener("change", (e) => {
      handleCountryCheckboxChange(country, e.target.checked);
    });

    countryList.appendChild(item);
  });

  // Populate Groups custom checkbox list
  groupList.innerHTML = "";
  Array.from(groups).sort().forEach(groupName => {
    const item = document.createElement("div");
    item.className = "multiselect-item";
    item.dataset.value = groupName;

    const inputId = `chk_group_${cleanFilename(groupName)}`;

    item.innerHTML = `
      <input type="checkbox" id="${inputId}" value="${groupName}">
      <i data-lucide="globe" class="multiselect-venue-icon"></i>
      <label for="${inputId}">${groupName}</label>
    `;

    // Bind click events on custom item clicks
    item.querySelector("input").addEventListener("change", (e) => {
      handleGroupCheckboxChange(groupName, e.target.checked);
    });

    groupList.appendChild(item);
  });

  // Populate Venues custom checkbox list (shows cities)
  venueList.innerHTML = "";
  Array.from(venues).sort().forEach(city => {
    const item = document.createElement("div");
    item.className = "multiselect-item";
    item.dataset.value = city;

    const inputId = `chk_venue_${cleanFilename(city)}`;

    item.innerHTML = `
      <input type="checkbox" id="${inputId}" value="${city}">
      <i data-lucide="map-pin" class="multiselect-venue-icon"></i>
      <label for="${inputId}" title="${city}">${city}</label>
    `;

    // Bind click events on custom item clicks
    item.querySelector("input").addEventListener("change", (e) => {
      handleVenueCheckboxChange(city, e.target.checked);
    });

    venueList.appendChild(item);
  });

  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
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
    // Country multi-select filter (matches team A or team B)
    if (activeFilters.country.size > 0) {
      if (!activeFilters.country.has(match.country_a) && !activeFilters.country.has(match.country_b)) {
        return false;
      }
    }

    // Group multi-select filter
    if (activeFilters.group.size > 0) {
      if (!match.group || !activeFilters.group.has(match.group)) {
        return false;
      }
    }

    // Stage filter
    if (activeFilters.stage !== 'ALL') {
      if (match.stage !== activeFilters.stage) return false;
    }

    // Venue (city) multi-select filter
    if (activeFilters.venue.size > 0) {
      const city = match.location.split(', ').pop();
      if (!activeFilters.venue.has(city)) return false;
    }

    return true;
  });

  renderTimeline();
  updateStatsBar();
  updateSyncDescription();
  renderActiveFilterPills();
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
  const isFiltered = activeFilters.country.size > 0 ||
                     activeFilters.group.size > 0 ||
                     activeFilters.stage !== 'ALL' ||
                     activeFilters.venue.size > 0;

  resetBtn.style.display = isFiltered ? "inline-flex" : "none";
}

// Update details on the Quick Sync card
function updateSyncDescription() {
  const syncDesc = document.getElementById("syncDescription");
  const bottomSyncDesc = document.getElementById("bottomSyncDescription");

  let descText = "";
  if (activeFilters.country.size > 0) {
    const list = Array.from(activeFilters.country).join(', ');
    descText = `Matches involving <strong>${list}</strong> (${filteredMatches.length} matches)`;
  } else if (filteredMatches.length !== rawMatches.length) {
    descText = `<strong>${filteredMatches.length}</strong> selected matches based on your active filters`;
  } else {
    descText = `All <strong>104</strong> matches, or filter matches below`;
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

  const isFavCountryA = activeFilters.country.size > 0 && activeFilters.country.has(match.country_a);
  const isFavCountryB = activeFilters.country.size > 0 && activeFilters.country.has(match.country_b);

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
      <a href="${gcalUrl}" target="_blank" class="btn-card btn-card-green" title="Add this match to your Google Calendar">
        <i data-lucide="calendar-plus"></i>
        <span>+ Google Calendar</span>
      </a>
      <button class="btn-card btn-card-primary btn-download-match" title="Download ICS for this match">
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

// Generate team row with flag image or trophy placeholder
function getTeamRowHtml(teamName, isHighlighted) {
  const code = countryCodes[teamName];
  const highlightClass = isHighlighted ? 'highlighted' : '';

  let flagHtml = `<i data-lucide="trophy" class="team-flag-placeholder"></i>`;
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

  const flagA = getFlagEmoji(match.country_a);
  const flagB = getFlagEmoji(match.country_b);
  const title = `${flagA} ${match.country_a} vs ${flagB} ${match.country_b} (${match.stage})`;
  const location = match.location;

  const descParts = [
    `FIFA World Cup 2026 Match`,
    `Stage: ${match.stage}`
  ];
  if (match.group) descParts.push(`Group: ${match.group}`);
  descParts.push(`Venue: ${location}`);
  descParts.push(`More details: https://worldcupcalendar.football`);

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
    const uid = `match_2026_${index}_${cleanTeamA}_vs_${cleanTeamB}_client@worldcupcalendar.football`;

    const flagA = getFlagEmoji(match.country_a);
    const flagB = getFlagEmoji(match.country_b);
    const summary = `${flagA} ${match.country_a} vs ${flagB} ${match.country_b}`;
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

  if (activeFilters.country.size === 1) {
    const singleCountry = Array.from(activeFilters.country)[0];
    suffix = `${singleCountry} Matches`;
    filename = `worldcup_2026_${cleanFilename(singleCountry)}.ics`;
  } else if (activeFilters.country.size > 1) {
    suffix = "Custom Teams Matches";
    filename = "worldcup_2026_custom_teams.ics";
  } else if (filteredMatches.length !== rawMatches.length) {
    suffix = "Filtered Matches";
    filename = "worldcup_2026_custom_matches.ics";
  }

  const content = generateICSContent(filteredMatches, suffix);
  triggerDownload(content, filename);

  // Track Google Analytics event
  if (typeof window.logFirebaseEvent === 'function') {
    window.logFirebaseEvent('download_ics', {
      calendar_type: suffix,
      match_count: filteredMatches.length,
      selected_teams_count: activeFilters.country.size,
      selected_teams: Array.from(activeFilters.country).join(',') || 'All'
    });
  }
}

// 10. Event Handlers & Modal Interactions
function setupEventHandlers() {
  const stageFilters = document.getElementById("stageFilters");
  const timezoneToggle = document.getElementById("timezoneToggle");

  // Reset buttons
  const btnReset = document.getElementById("btnResetFilters");
  btnReset.addEventListener("click", resetAllFilters);

  // Setup Custom Multiselect Triggers
  setupMultiselectTrigger("multiSelectCountry", "countryTrigger");
  setupMultiselectTrigger("multiSelectGroup", "groupTrigger");
  setupMultiselectTrigger("multiSelectVenue", "venueTrigger");

  // Setup Autocomplete Search inside Custom Panels
  setupMultiselectSearch("multiSelectCountry", "countryList");
  setupMultiselectSearch("multiSelectGroup", "groupList");
  setupMultiselectSearch("multiSelectVenue", "venueList");

  // Setup Select All / Clear Actions
  setupMultiselectActions("btnCountryAll", "btnCountryClear", "countryList", "country");
  setupMultiselectActions("btnGroupAll", "btnGroupClear", "groupList", "group");
  setupMultiselectActions("btnVenueAll", "btnVenueClear", "venueList", "venue");;

  // Close multiselects when clicking away
  document.addEventListener("click", (e) => {
    document.querySelectorAll(".multiselect-container").forEach(container => {
      if (!container.contains(e.target)) {
        container.classList.remove("active");
      }
    });
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

    // Track Google Analytics event
    if (typeof window.logFirebaseEvent === 'function') {
      window.logFirebaseEvent('switch_timezone', {
        timezone: activeFilters.timezone
      });
    }

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

// Custom Multiselect Helper Functions
function setupMultiselectTrigger(containerId, triggerId) {
  const container = document.getElementById(containerId);
  const trigger = document.getElementById(triggerId);

  if (trigger && container) {
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      // Close other multiselects first
      document.querySelectorAll(".multiselect-container").forEach(c => {
        if (c !== container) c.classList.remove("active");
      });
      container.classList.toggle("active");
    });
  }
}

function setupMultiselectSearch(containerId, listId) {
  const container = document.getElementById(containerId);
  const searchInput = container.querySelector(".multiselect-search");
  const list = document.getElementById(listId);

  if (searchInput && list) {
    searchInput.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase();
      const items = list.querySelectorAll(".multiselect-item");
      items.forEach(item => {
        const text = item.dataset.value.toLowerCase();
        item.style.display = text.includes(q) ? "flex" : "none";
      });
    });
  }
}

function setupMultiselectActions(allId, clearId, listId, type) {
  const btnAll = document.getElementById(allId);
  const btnClear = document.getElementById(clearId);
  const list = document.getElementById(listId);

  if (btnAll && list) {
    btnAll.addEventListener("click", (e) => {
      e.stopPropagation();
      const visibleCheckboxes = Array.from(list.querySelectorAll(".multiselect-item"))
        .filter(item => item.style.display !== "none")
        .map(item => item.querySelector("input[type='checkbox']"));

      visibleCheckboxes.forEach(chk => {
        if (chk) {
          chk.checked = true;
          if (type === "country") activeFilters.country.add(chk.value);
          if (type === "group") activeFilters.group.add(chk.value);
          if (type === "venue") activeFilters.venue.add(chk.value);
        }
      });
      updateTriggerTexts();
      applyFilters();
    });
  }

  if (btnClear && list) {
    btnClear.addEventListener("click", (e) => {
      e.stopPropagation();
      const checkboxes = list.querySelectorAll(".multiselect-item input[type='checkbox']");
      checkboxes.forEach(chk => {
        chk.checked = false;
        if (type === "country") activeFilters.country.delete(chk.value);
        if (type === "group") activeFilters.group.delete(chk.value);
        if (type === "venue") activeFilters.venue.delete(chk.value);
      });
      updateTriggerTexts();
      applyFilters();
    });
  }
}

function handleCountryCheckboxChange(country, isChecked) {
  if (isChecked) {
    activeFilters.country.add(country);
  } else {
    activeFilters.country.delete(country);
  }
  updateTriggerTexts();
  applyFilters();
}

function handleGroupCheckboxChange(group, isChecked) {
  if (isChecked) {
    activeFilters.group.add(group);
  } else {
    activeFilters.group.delete(group);
  }
  updateTriggerTexts();
  applyFilters();
}

function handleVenueCheckboxChange(venue, isChecked) {
  if (isChecked) {
    activeFilters.venue.add(venue);
  } else {
    activeFilters.venue.delete(venue);
  }
  updateTriggerTexts();
  applyFilters();
}

function updateTriggerTexts() {
  const countryTrigger = document.querySelector("#countryTrigger .trigger-text");
  const groupTrigger = document.querySelector("#groupTrigger .trigger-text");
  const venueTrigger = document.querySelector("#venueTrigger .trigger-text");

  // Country Trigger Text
  if (activeFilters.country.size === 0) {
    countryTrigger.textContent = "All Teams";
  } else if (activeFilters.country.size === 1) {
    countryTrigger.textContent = Array.from(activeFilters.country)[0];
  } else if (activeFilters.country.size <= 2) {
    countryTrigger.textContent = Array.from(activeFilters.country).join(", ");
  } else {
    countryTrigger.textContent = `${activeFilters.country.size} Teams Selected`;
  }

  // Group Trigger Text
  if (activeFilters.group.size === 0) {
    groupTrigger.textContent = "All Groups";
  } else if (activeFilters.group.size === 1) {
    groupTrigger.textContent = Array.from(activeFilters.group)[0];
  } else if (activeFilters.group.size <= 2) {
    groupTrigger.textContent = Array.from(activeFilters.group).join(", ");
  } else {
    groupTrigger.textContent = `${activeFilters.group.size} Groups Selected`;
  }

  // Venue Trigger Text (Cities)
  if (activeFilters.venue.size === 0) {
    venueTrigger.textContent = "All Cities";
  } else if (activeFilters.venue.size === 1) {
    venueTrigger.textContent = Array.from(activeFilters.venue)[0];
  } else if (activeFilters.venue.size <= 2) {
    venueTrigger.textContent = Array.from(activeFilters.venue).join(", ");
  } else {
    venueTrigger.textContent = `${activeFilters.venue.size} Cities Selected`;
  }
}

// Populate and render small removable filter pills
function renderActiveFilterPills() {
  const pillsContainer = document.getElementById("activePillsContainer");
  pillsContainer.innerHTML = "";

  if (activeFilters.country.size === 0 && activeFilters.group.size === 0 && activeFilters.venue.size === 0) {
    pillsContainer.style.display = "none";
    return;
  }

  pillsContainer.style.display = "flex";

  // 1. Country pills
  activeFilters.country.forEach(country => {
    const pill = document.createElement("div");
    pill.className = "active-pill";

    const code = countryCodes[country];
    let flagHtml = "";
    if (code) {
      flagHtml = `<img src="https://flagcdn.com/w40/${code}.png" alt="${country}" class="active-pill-flag">`;
    }

    pill.innerHTML = `
      ${flagHtml}
      <span>${country}</span>
      <button class="active-pill-remove" title="Remove filter">&times;</button>
    `;

    pill.querySelector(".active-pill-remove").addEventListener("click", () => {
      const chk = document.querySelector(`#chk_country_${cleanFilename(country)}`);
      if (chk) chk.checked = false;
      activeFilters.country.delete(country);
      updateTriggerTexts();
      applyFilters();
    });

    pillsContainer.appendChild(pill);
  });

  // 2. Group pills
  activeFilters.group.forEach(groupName => {
    const pill = document.createElement("div");
    pill.className = "active-pill pill-group-pill";

    pill.innerHTML = `
      <i data-lucide="globe" class="active-pill-icon"></i>
      <span>${groupName}</span>
      <button class="active-pill-remove" title="Remove filter">&times;</button>
    `;

    pill.querySelector(".active-pill-remove").addEventListener("click", () => {
      const chk = document.querySelector(`#chk_group_${cleanFilename(groupName)}`);
      if (chk) chk.checked = false;
      activeFilters.group.delete(groupName);
      updateTriggerTexts();
      applyFilters();
    });

    pillsContainer.appendChild(pill);
  });

  // 3. Venue pills (Cities)
  activeFilters.venue.forEach(city => {
    const pill = document.createElement("div");
    pill.className = "active-pill pill-venue";

    pill.innerHTML = `
      <i data-lucide="map-pin" class="active-pill-icon"></i>
      <span>${city}</span>
      <button class="active-pill-remove" title="Remove filter">&times;</button>
    `;

    pill.querySelector(".active-pill-remove").addEventListener("click", () => {
      const chk = document.querySelector(`#chk_venue_${cleanFilename(city)}`);
      if (chk) chk.checked = false;
      activeFilters.venue.delete(city);
      updateTriggerTexts();
      applyFilters();
    });

    pillsContainer.appendChild(pill);
  });

  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

function resetAllFilters() {
  // Uncheck all custom country, group, and venue checkboxes
  document.querySelectorAll("#countryList input[type='checkbox']").forEach(chk => chk.checked = false);
  document.querySelectorAll("#groupList input[type='checkbox']").forEach(chk => chk.checked = false);
  document.querySelectorAll("#venueList input[type='checkbox']").forEach(chk => chk.checked = false);

  activeFilters.country.clear();
  activeFilters.group.clear();
  activeFilters.venue.clear();

  const stageFilters = document.getElementById("stageFilters");
  stageFilters.querySelectorAll(".pill").forEach(p => p.classList.remove("active"));
  stageFilters.querySelector("[data-stage='ALL']").classList.add("active");

  activeFilters.stage = "ALL";

  updateTriggerTexts();
  applyFilters();
}

// 11. Modal Setup and direct Google Calendar Subscriptions
function openGoogleCalendarModal() {
  const importModal = document.getElementById("importModal");
  const modalCalendarName = document.getElementById("modalCalendarName");
  const modalDirectSyncLink = document.getElementById("modalDirectSyncLink");
  const txtIcsUrl = document.getElementById("txtIcsUrl");
  const modalDownloadBtn = document.getElementById("modalDownloadBtn");

  let calendarTitle = "All Matches";

  // Track Google Analytics event
  if (typeof window.logFirebaseEvent === 'function') {
    window.logFirebaseEvent('open_sync_modal', {
      selected_teams_count: activeFilters.country.size,
      selected_teams: Array.from(activeFilters.country).join(',') || 'All'
    });
  }

  if (activeFilters.country.size > 1) {
    // Multi-select subscription adapt
    modalCalendarName.textContent = `${activeFilters.country.size} Teams Selected`;
    txtIcsUrl.value = "Direct URL sync is only supported for single-team feeds.";
    modalDirectSyncLink.style.pointerEvents = "none";
    modalDirectSyncLink.style.opacity = "0.5";
    modalDirectSyncLink.innerHTML = `Google Sync (Single Team Only)`;

  } else {
    // Single country or all matches
    modalDirectSyncLink.style.pointerEvents = "auto";
    modalDirectSyncLink.style.opacity = "1";
    modalDirectSyncLink.innerHTML = `<i data-lucide="calendar-plus"></i> Open Google Calendar`;

    let staticFilename = "all.ics";
    if (activeFilters.country.size === 1) {
      const singleCountry = Array.from(activeFilters.country)[0];
      calendarTitle = `${singleCountry} Matches`;
      staticFilename = `${cleanFilename(singleCountry)}.ics`;
    }

    modalCalendarName.textContent = calendarTitle;

    const origin = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'https://worldcupcalendar.football'
      : window.location.origin;

    const icsFileUrl = `${origin}/calendars/${staticFilename}`;
    txtIcsUrl.value = icsFileUrl;

    const gcalSyncUrl = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(icsFileUrl)}`;
    modalDirectSyncLink.href = gcalSyncUrl;
  }

  // Reset Copy Button State
  const btnCopyUrl = document.getElementById("btnCopyUrl");
  btnCopyUrl.innerHTML = `<i data-lucide="copy"></i> Copy`;
  if (typeof lucide !== 'undefined') lucide.createIcons();

  // Setup copy to clipboard click event
  btnCopyUrl.replaceWith(btnCopyUrl.cloneNode(true)); // Clear previous listeners
  document.getElementById("btnCopyUrl").addEventListener("click", () => {
    if (activeFilters.country.size > 1) return;
    txtIcsUrl.select();
    txtIcsUrl.setSelectionRange(0, 99999); // For mobile devices
    navigator.clipboard.writeText(txtIcsUrl.value);

    document.getElementById("btnCopyUrl").innerHTML = `<i data-lucide="check"></i> Copied!`;
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Track Google Analytics event
    if (typeof window.logFirebaseEvent === 'function') {
      window.logFirebaseEvent('copy_ics_url', {
        ics_url: txtIcsUrl.value,
        team: activeFilters.country.size === 1 ? Array.from(activeFilters.country)[0] : 'All'
      });
    }
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
