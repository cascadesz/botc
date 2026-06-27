const API_URL = 'https://script.google.com/macros/s/AKfycbzLgECYjG4Io_Q1RTgJQoUh6FMpj0r_yBshP7ldMlmzgChDgdoOv2pwdoBfQcsrppk9/exec';
const VERSION = 'v1.2.1';

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
const uploadPdfForm = document.getElementById('uploadPdfForm');
const pdfFileInput = document.getElementById('pdfFileInput');
const uploadMessage = document.getElementById('uploadMessage');

function updateDownloadToggle(expanded) {
  pdfDownloadBtn.textContent = expanded ? '📄 Download Script ▴' : '📄 Download Script ▾';
  pdfDownloadBtn.setAttribute('aria-expanded', String(expanded));
}

// Try to load PDF list from a JSON manifest file
async function loadPdfList() {
  try {
    const response = await fetch('script/pdfs.json', { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      return (data.files || []).sort();
    }
  } catch (err) {
    console.log('No pdfs.json found, checking for PDFs...');
  }
  
  // Fallback: Try to fetch individual PDFs (this won't work on all servers)
  return [];
}

async function renderPdfList() {
  const pdfs = await loadPdfList();
  
  if (pdfs.length === 0) {
    pdfList.innerHTML = '<p style="color: #666; font-size: 12px; margin: 8px 0 0 0;">No scripts available. Add PDF files to the <code>script/</code> folder and create a <code>script/pdfs.json</code> file with a list of filenames.</p>';
    return;
  }
  
  pdfList.innerHTML = pdfs.map((pdf, index) => `
    <div class="pdf-item">
      <div class="pdf-item-row">
        <div class="pdf-file-info">
          <span class="pdf-file-name">📄 ${escapeHtml(pdf)}</span>
        </div>
        <div class="pdf-actions">
          <button type="button" class="qr-toggle-btn" data-file="${encodeURIComponent(pdf)}" title="Generate QR code" aria-label="Generate QR code">QR code</button>
          <a href="script/${encodeURIComponent(pdf)}" download title="Download" aria-label="Download">Download</a>
        </div>
      </div>
      <div class="qr-container" id="qr-${index}" style="display: none; margin-top: 10px;"></div>
    </div>
  `).join('');

  pdfList.querySelectorAll('.qr-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const encodedPdf = btn.dataset.file;
      const pdf = decodeURIComponent(encodedPdf);
      const container = btn.closest('.pdf-item').querySelector('.qr-container');
      togglePdfQr(container, pdf);
    });
  });
}

async function togglePdfList() {
  const expanded = !pdfList.classList.contains('expanded');
  pdfList.classList.toggle('expanded', expanded);
  pdfList.classList.toggle('collapsed', !expanded);
  updateDownloadToggle(expanded);
  if (expanded) {
    await renderPdfList();
  }
}

function getPdfDownloadUrl(pdf) {
  return new URL(`script/${encodeURIComponent(pdf)}`, location.href).href;
}

async function parseJsonResponse(response) {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    const preview = text.slice(0, 160).replace(/\s+/g, ' ').trim();
    throw new Error(
      preview.startsWith('<')
        ? 'The upload endpoint returned an HTML response. Make sure the app is running with npm start.'
        : `Unexpected server response: ${preview || 'empty response'}`
    );
  }
}

function getQrImageUrl(downloadUrl) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(downloadUrl)}`;
}

function togglePdfQr(container, pdf) {
  if (!container) return;
  const isVisible = container.style.display === 'block';
  if (isVisible) {
    container.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  const downloadUrl = getPdfDownloadUrl(pdf);
  const qrImageUrl = getQrImageUrl(downloadUrl);

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 10px; background: #ffffff; border-radius: 8px; border: 1px solid #cbd5e1;">
      <img class="qr-image" src="${qrImageUrl}" alt="QR code to download ${escapeHtml(pdf)}" style="width: 180px; height: 180px;" />
      <div style="font-size: 12px; color: #1f2937; text-align: center;">Scan to download this script</div>
      <a href="${downloadUrl}" target="_blank" rel="noreferrer" style="font-size: 12px; color: #1d4ed8; text-decoration: underline;">Open file in browser</a>
    </div>
  `;
  container.style.display = 'block';
}

pdfDownloadBtn.addEventListener('click', togglePdfList);

if (uploadPdfForm) {
  uploadPdfForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const file = pdfFileInput?.files?.[0];

    if (!file) {
      uploadMessage.textContent = 'Please choose a PDF file first.';
      return;
    }

    const formData = new FormData();
    formData.append('pdfFile', file);

    uploadMessage.textContent = 'Uploading PDF...';

    try {
      const response = await fetch('/api/upload-pdf', {
        method: 'POST',
        body: formData
      });
      const data = await parseJsonResponse(response);

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Upload failed.');
      }

      uploadMessage.textContent = `Uploaded ${data.file}`;
      uploadPdfForm.reset();
      await renderPdfList();
    } catch (error) {
      const message = error instanceof Error && error.message
        ? error.message
        : 'Unable to reach the upload server. Make sure the app is running with npm start.';
      uploadMessage.textContent = `Error: ${message}`;
    }
  });
}

updateDownloadToggle(false);
loadResults();