const API_URL = 'https://script.google.com/macros/s/AKfycbzLgECYjG4Io_Q1RTgJQoUh6FMpj0r_yBshP7ldMlmzgChDgdoOv2pwdoBfQcsrppk9/exec';
const VERSION = 'v1.0.3';

const voteForm = document.getElementById('voteForm');
const messageEl = document.getElementById('message');
const refreshBtn = document.getElementById('refreshBtn');

const proposedTimeWrap = document.getElementById('proposedTimeWrap');
const proposedDate = document.getElementById('proposedDate');
const proposedHour = document.getElementById('proposedHour');
const proposedMinute = document.getElementById('proposedMinute');

const yesCount = document.getElementById('yesCount');
const maybeCount = document.getElementById('maybeCount');
const proposeCount = document.getElementById('proposeCount');

const yesList = document.getElementById('yesList');
const maybeList = document.getElementById('maybeList');
const proposeList = document.getElementById('proposeList');

function populateDateOptions() {
  proposedDate.innerHTML = '';

  const today = new Date();

  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(today.getDate() + i);

    const value = formatDateValue(d);
    const label = d.toLocaleDateString(undefined, {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });

    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    if (i === 4) {
      option.selected = true;
    }
    proposedDate.appendChild(option);
  }
}

function populateHourOptions() {
  proposedHour.innerHTML = '';

  for (let h = 17; h <= 20; h++) {
    const hh = String(h).padStart(2, '0');
    const item = document.createElement('div');
    item.className = 'picker-item';
    item.textContent = hh;
    item.dataset.value = hh;
    proposedHour.appendChild(item);
  }
  
  // Scroll to 19 (hour)
  const items = proposedHour.querySelectorAll('.picker-item');
  if (items[2]) {
    setTimeout(() => {
      items[2].scrollIntoView({ behavior: 'auto', block: 'center' });
      updatePickerSelection(proposedHour);
    }, 0);
  }
}

function formatDateValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getPickerValue(pickerEl) {
  const centerY = pickerEl.offsetHeight / 2;
  const items = pickerEl.querySelectorAll('.picker-item');
  let selectedValue = '00';
  let closestDistance = Infinity;

  items.forEach(item => {
    const itemY = item.offsetTop + item.offsetHeight / 2 - pickerEl.scrollTop;
    const distance = Math.abs(itemY - centerY);
    if (distance < closestDistance) {
      closestDistance = distance;
      selectedValue = item.dataset.value;
    }
  });

  return selectedValue;
}

function updatePickerSelection(pickerEl) {
  const selectedValue = getPickerValue(pickerEl);
  const items = pickerEl.querySelectorAll('.picker-item');
  items.forEach(item => {
    if (item.dataset.value === selectedValue) {
      item.classList.add('selected');
    } else {
      item.classList.remove('selected');
    }
  });
}

function buildProposedDateTime() {
  const hour = getPickerValue(proposedHour);
  const minute = getPickerValue(proposedMinute);
  if (!proposedDate.value || !hour || !minute) {
    return '';
  }
  return `${proposedDate.value}T${hour}:${minute}`;
}

document.querySelectorAll('input[name="choice"]').forEach(radio => {
  radio.addEventListener('change', () => {
    if (radio.value === 'Propose new time' && radio.checked) {
      proposedTimeWrap.classList.remove('hidden');
    } else if (radio.checked) {
      proposedTimeWrap.classList.add('hidden');
    }
  });
});

// Add scroll listeners to time pickers
proposedHour.addEventListener('scroll', () => updatePickerSelection(proposedHour));
proposedMinute.addEventListener('scroll', () => updatePickerSelection(proposedMinute));

// Add click handlers for picker items (PC only)
function setupPickerClickHandlers(pickerEl) {
  pickerEl.addEventListener('click', (e) => {
    if (e.target.classList.contains('picker-item')) {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => updatePickerSelection(pickerEl), 300);
    }
  });
}

setupPickerClickHandlers(proposedHour);
setupPickerClickHandlers(proposedMinute);

voteForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  messageEl.textContent = 'Submitting...';

  const formData = new FormData(voteForm);
  const name = formData.get('name')?.trim() || '';
  const choice = formData.get('choice') || '';
const proposedTime = buildProposedDateTime();

  try {
    const body = new URLSearchParams();
    body.append('action', 'vote');
    body.append('name', name);
    body.append('choice', choice);
    body.append('proposedTime', proposedTime);

    const res = await fetch(API_URL, {
      method: 'POST',
      body
    });

    const data = await res.json();

    if (!data.ok) {
      throw new Error(data.error || 'Failed to submit');
    }

    messageEl.textContent = 'Vote saved successfully.';
    voteForm.reset();
    proposedTimeWrap.classList.add('hidden');
    populateDateOptions();
    populateHourOptions();
    populateMinuteOptions();


    renderResults(data.rows || []);
  } catch (err) {
    messageEl.textContent = `Error: ${err.message}`;
  }
});

refreshBtn.addEventListener('click', loadResults);

async function loadResults() {
  messageEl.textContent = 'Loading results...';
  try {
    const res = await fetch(`${API_URL}?action=getResults`);
    const data = await res.json();

    if (!data.ok) {
      throw new Error(data.error || 'Failed to load results');
    }

    renderResults(data.rows || []);
    messageEl.textContent = 'Results refreshed.';
  } catch (err) {
    messageEl.textContent = `Error: ${err.message}`;
  }
}

function renderResults(rows) {
  const yesVotes = rows.filter(r => r.choice === 'Yes');
  const maybeVotes = rows.filter(r => r.choice === 'Maybe');
  const proposeVotes = rows.filter(r => r.choice === 'Propose new time');

  yesCount.textContent = yesVotes.length;
  maybeCount.textContent = maybeVotes.length;
  proposeCount.textContent = proposeVotes.length;

  yesList.innerHTML = yesVotes.length
    ? yesVotes.map(v => `<li>${escapeHtml(v.name)}</li>`).join('')
    : '<li>No votes yet</li>';

  maybeList.innerHTML = maybeVotes.length
    ? maybeVotes.map(v => `<li>${escapeHtml(v.name)}</li>`).join('')
    : '<li>No votes yet</li>';

  proposeList.innerHTML = proposeVotes.length
    ? proposeVotes.map(v => `
        <li>
          <strong>${escapeHtml(v.name)}</strong>
          <span class="small">${formatDateTime(v.proposedTime)}</span>
        </li>
      `).join('')
    : '<li>No proposals yet</li>';
}

function formatDateTime(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function populateMinuteOptions() {
  proposedMinute.innerHTML = '';

  const minutes = ['00', '30'];
  minutes.forEach(m => {
    const item = document.createElement('div');
    item.className = 'picker-item';
    item.textContent = m;
    item.dataset.value = m;
    proposedMinute.appendChild(item);
  });
  
  // Scroll to 00 (minute)
  const items = proposedMinute.querySelectorAll('.picker-item');
  if (items[0]) {
    setTimeout(() => {
      items[0].scrollIntoView({ behavior: 'auto', block: 'center' });
      updatePickerSelection(proposedMinute);
    }, 0);
  }
}

populateDateOptions();
populateHourOptions();
populateMinuteOptions();

// Update version badge after DOM is ready
const versionBadge = document.getElementById('versionBadge');
if (versionBadge) {
  versionBadge.textContent = VERSION;
}

// PDF Download functionality
const pdfDownloadBtn = document.getElementById('pdfDownloadBtn');
const pdfList = document.getElementById('pdfList');

// Try to load PDF list from a JSON manifest file
async function loadPdfList() {
  try {
    const response = await fetch('script/pdfs.json');
    if (response.ok) {
      const data = await response.json();
      return (data.files || []).sort();
    }
  } catch (err) {
    console.log('No pdfs.json found, checking for PDFs...');
  }
  
  // Fallback: Try to fetch individual PDFs (this won't work on all servers)
  const commonNames = ['script', 'Script', 'SCRIPT'];
  return [];
}

async function displayPdfList() {
  const pdfs = await loadPdfList();
  
  if (pdfs.length === 0) {
    pdfList.innerHTML = '<p style="color: #666; font-size: 12px; margin: 8px 0 0 0;">No scripts available. Add PDF files to the <code>script/</code> folder and create a <code>script/pdfs.json</code> file with a list of filenames.</p>';
    pdfList.style.display = 'block';
    return;
  }
  
  pdfList.innerHTML = pdfs.map((pdf, index) => `
    <div style="margin: 8px 0; padding: 8px; background-color: #f5f5f5; border-radius: 4px; display: flex; align-items: center; justify-content: space-between;">
      <span style="font-size: 14px;">📄 ${escapeHtml(pdf)}</span>
      <a href="script/${encodeURIComponent(pdf)}" download style="padding: 6px 12px; background-color: #28a745; color: white; text-decoration: none; border-radius: 3px; font-size: 12px; cursor: pointer;">Download</a>
    </div>
  `).join('');
  
  pdfList.style.display = 'block';
}

pdfDownloadBtn.addEventListener('click', displayPdfList);

loadResults();