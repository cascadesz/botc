const API_URL = 'https://script.google.com/macros/s/AKfycbzLgECYjG4Io_Q1RTgJQoUh6FMpj0r_yBshP7ldMlmzgChDgdoOv2pwdoBfQcsrppk9/exec';

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
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    proposedDate.innerHTML += `<option value="${value}">${label}</option>`;
  }
}

function populateHourOptions() {
  proposedHour.innerHTML = '';

  for (let h = 0; h < 24; h++) {
    const hh = String(h).padStart(2, '0');
    const item = document.createElement('div');
    item.className = 'picker-item';
    item.textContent = hh;
    item.dataset.value = hh;
    proposedHour.appendChild(item);
  }
  
  // Add center line indicator
  const centerLine = document.createElement('div');
  centerLine.className = 'scroll-picker-center-line';
  proposedHour.appendChild(centerLine);
  
  // Scroll to 19 (hour)
  const items = proposedHour.querySelectorAll('.picker-item');
  if (items[19]) {
    setTimeout(() => {
      items[19].scrollIntoView({ behavior: 'auto', block: 'center' });
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
``

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
  
  // Add center line indicator
  const centerLine = document.createElement('div');
  centerLine.className = 'scroll-picker-center-line';
  proposedMinute.appendChild(centerLine);
  
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

loadResults();