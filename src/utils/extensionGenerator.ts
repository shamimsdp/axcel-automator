import JSZip from 'jszip';
import jszipRaw from 'jszip/dist/jszip.min.js?raw';
import { ExtensionFile } from '../types';

export const EXTENSION_MANIFEST = JSON.stringify(
  {
    manifest_version: 3,
    name: 'Axcel.cloud Auto Video Generator & Downloader',
    short_name: 'AxcelAutomator',
    version: '1.1.0',
    description: 'Automates batch text-to-video & image-to-video generation on axcel.cloud with Seedance 2.5 (30s duration), reference image upload, concurrency control, auto-retry, and auto-downloading.',
    permissions: ['storage', 'downloads', 'activeTab'],
    host_permissions: ['https://axcel.cloud/*'],
    background: {
      service_worker: 'background.js',
    },
    action: {
      default_popup: 'popup.html',
      default_title: 'Axcel Video Automator',
      default_icon: {
        '16': 'icons/icon16.png',
        '48': 'icons/icon48.png',
        '128': 'icons/icon128.png',
      },
    },
    icons: {
      '16': 'icons/icon16.png',
      '48': 'icons/icon48.png',
      '128': 'icons/icon128.png',
    },
    content_scripts: [
      {
        matches: [
          'https://axcel.cloud/video/text-to-video*',
          'https://axcel.cloud/video/image-to-video*',
          'https://axcel.cloud/video/*',
          'https://axcel.cloud/*'
        ],
        js: ['content.js'],
        css: ['content.css'],
        run_at: 'document_idle',
      },
    ],
  },
  null,
  2
);

export const EXTENSION_BACKGROUND_JS = `/**
 * Axcel.cloud Video Automator - Background Service Worker
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Axcel Automator] Extension installed successfully.');
  chrome.storage.local.set({
    axcel_queue: [],
    axcel_config: {
      maxConcurrency: 2,
      maxBatchSize: 10,
      maxRetries: 3,
      retryDelayMs: 4000,
      autoDownload: true,
      downloadFolder: 'axcel_videos',
      filenamePattern: '{index}_{title}',
    },
    axcel_status: 'idle',
  });
});

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'DOWNLOAD_VIDEO') {
    handleDownload(message.payload)
      .then(downloadId => sendResponse({ success: true, downloadId }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }

  if (message.action === 'UPDATE_BADGE') {
    const { text, color } = message.payload;
    chrome.action.setBadgeText({ text: text || '' });
    if (color) {
      chrome.action.setBadgeBackgroundColor({ color });
    }
    sendResponse({ success: true });
    return false;
  }
});

async function handleDownload({ url, filename, folder }) {
  const cleanFolder = (folder || 'axcel_videos').replace(/[\\\\/:*?"<>|]/g, '_');
  const cleanFilename = (filename || 'video.mp4').replace(/[\\\\/:*?"<>|]/g, '_');
  const fullPath = \`\${cleanFolder}/\${cleanFilename}\`;

  return new Promise((resolve, reject) => {
    chrome.downloads.download(
      {
        url: url,
        filename: fullPath,
        conflictAction: 'uniquify',
        saveAs: false,
      },
      downloadId => {
        if (chrome.runtime.lastError) {
          console.error('[Axcel Automator] Download error:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          console.log('[Axcel Automator] Download initiated, ID:', downloadId);
          resolve(downloadId);
        }
      }
    );
  });
}
`;

export const EXTENSION_CONTENT_JS = `/**
 * Axcel.cloud Video Automator - In-Page Content Script
 * Injected on https://axcel.cloud/video/text-to-video
 */

(function () {
  console.log('[Axcel Automator] Content script loaded on', window.location.href);

  // State
  let queue = [];
  let isRunning = false;
  let isPaused = false;
  let activeWorkers = 0;
  let config = {
    maxConcurrency: 2,
    maxBatchSize: 10,
    maxRetries: 3,
    retryDelayMs: 4000,
    autoDownload: true,
    downloadFolder: 'axcel_videos',
    filenamePattern: '{index}_{title}',
  };

  // Current Page Mode detection
  const isImageToVideo = window.location.href.includes('image-to-video');
  const pageMode = isImageToVideo ? 'Image to Video' : 'Text to Video';

  // Restore stored state
  chrome.storage.local.get(['axcel_queue', 'axcel_config'], data => {
    if (data.axcel_config) config = { ...config, ...data.axcel_config };
    if (data.axcel_queue) queue = data.axcel_queue;
    injectFloatingWidget();
    updateWidgetUI();
  });

  // Listen for popup messages
  chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    if (req.action === 'LOAD_PROMPTS') {
      queue = req.prompts.slice(0, config.maxBatchSize).map((p, idx) => ({
        id: p.id || 'job_' + Date.now() + '_' + idx,
        index: idx + 1,
        title: p.title || 'Scene ' + (idx + 1),
        prompt: p.prompt,
        duration: p.duration || '30s',
        resolution: p.resolution || '1080p',
        aspectRatio: p.aspectRatio || '16:9',
        generateAudio: p.generateAudio !== undefined ? !!p.generateAudio : true,
        model: p.model || 'Seedance 2.5',
        generationMode: p.referenceImage ? 'image-to-video' : (isImageToVideo ? 'image-to-video' : 'text-to-video'),
        referenceImage: p.referenceImage || null,
        referenceImageName: p.referenceImageName || null,
        status: 'pending',
        attemptCount: 0,
        progress: 0,
        error: null,
      }));
      chrome.storage.local.set({ axcel_queue: queue });
      updateWidgetUI();
      sendResponse({ success: true, count: queue.length });
    } else if (req.action === 'START_AUTOMATION') {
      startAutomation();
      sendResponse({ success: true });
    } else if (req.action === 'PAUSE_AUTOMATION') {
      pauseAutomation();
      sendResponse({ success: true });
    } else if (req.action === 'STOP_AUTOMATION') {
      stopAutomation();
      sendResponse({ success: true });
    } else if (req.action === 'GET_STATE') {
      sendResponse({ queue, isRunning, isPaused, activeWorkers, config, isImageToVideo, pageMode });
    }
  });

  // --- Floating UI Widget on Axcel.cloud ---
  function injectFloatingWidget() {
    if (document.getElementById('axcel-automator-widget')) return;

    const widget = document.createElement('div');
    widget.id = 'axcel-automator-widget';
    widget.innerHTML = \`
      <div class="ax-widget-header">
        <div class="ax-widget-title">
          <span class="ax-dot"></span>
          <span>Axcel Automator</span>
        </div>
        <div class="ax-widget-actions">
          <button id="ax-toggle-collapse" title="Minimize / Expand">_</button>
        </div>
      </div>
      <div class="ax-widget-body" id="ax-widget-body">
        <div class="ax-stat-row">
          <div>Status: <b id="ax-status-text">Idle</b></div>
          <div>Active: <b id="ax-active-workers">0/2</b></div>
        </div>
        <div class="ax-progress-bar"><div class="ax-progress-fill" id="ax-progress-fill"></div></div>
        <div class="ax-summary-row">
          <span>Total: <b id="ax-total-count">0</b></span>
          <span>Done: <b id="ax-done-count">0</b></span>
          <span>Failed: <b id="ax-fail-count">0</b></span>
        </div>
        <div class="ax-btn-group">
          <button id="ax-btn-start" class="ax-btn ax-btn-primary">Start (Max 2)</button>
          <button id="ax-btn-pause" class="ax-btn" disabled>Pause</button>
          <button id="ax-btn-stop" class="ax-btn ax-btn-danger" disabled>Stop</button>
        </div>
        <div class="ax-widget-logs" id="ax-widget-logs">
          <div class="ax-log-item info">Ready. Upload prompts in popup or click Start.</div>
        </div>
      </div>
    \`;
    document.body.appendChild(widget);

    // Event listeners
    document.getElementById('ax-btn-start').onclick = () => startAutomation();
    document.getElementById('ax-btn-pause').onclick = () => isPaused ? resumeAutomation() : pauseAutomation();
    document.getElementById('ax-btn-stop').onclick = () => stopAutomation();
    document.getElementById('ax-toggle-collapse').onclick = () => {
      const body = document.getElementById('ax-widget-body');
      body.style.display = body.style.display === 'none' ? 'block' : 'none';
    };
  }

  function log(message, type = 'info') {
    console.log(\`[Axcel Automator \${type.toUpperCase()}]\`, message);
    const container = document.getElementById('ax-widget-logs');
    if (!container) return;
    const item = document.createElement('div');
    item.className = 'ax-log-item ' + type;
    item.textContent = \`[\${new Date().toLocaleTimeString()}] \${message}\`;
    container.appendChild(item);
    container.scrollTop = container.scrollHeight;
  }

  function updateWidgetUI() {
    const statusText = document.getElementById('ax-status-text');
    const activeText = document.getElementById('ax-active-workers');
    const totalText = document.getElementById('ax-total-count');
    const doneText = document.getElementById('ax-done-count');
    const failText = document.getElementById('ax-fail-count');
    const progressFill = document.getElementById('ax-progress-fill');
    const btnStart = document.getElementById('ax-btn-start');
    const btnPause = document.getElementById('ax-btn-pause');
    const btnStop = document.getElementById('ax-btn-stop');

    if (!statusText) return;

    const total = queue.length;
    const done = queue.filter(j => j.status === 'completed').length;
    const fail = queue.filter(j => j.status === 'failed').length;

    totalText.textContent = total;
    doneText.textContent = done;
    failText.textContent = fail;
    activeText.textContent = \`\${activeWorkers}/\${config.maxConcurrency}\`;

    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    progressFill.style.width = pct + '%';

    if (isRunning) {
      statusText.textContent = isPaused ? 'Paused' : 'Running...';
      btnStart.disabled = true;
      btnPause.disabled = false;
      btnPause.textContent = isPaused ? 'Resume' : 'Pause';
      btnStop.disabled = false;
    } else {
      statusText.textContent = total > 0 && done === total ? 'Complete' : 'Idle';
      btnStart.disabled = total === 0;
      btnPause.disabled = true;
      btnPause.textContent = 'Pause';
      btnStop.disabled = true;
    }

    // Update Chrome badge
    chrome.runtime.sendMessage({
      action: 'UPDATE_BADGE',
      payload: {
        text: isRunning ? \`\${activeWorkers}/\${total - done}\` : (done > 0 ? \`\${done}\` : ''),
        color: isRunning ? '#2563eb' : '#16a34a',
      },
    }).catch(() => {});
  }

  function startAutomation() {
    if (queue.length === 0) {
      log('Queue is empty. Load prompts first from the extension popup!', 'warn');
      return;
    }
    isRunning = true;
    isPaused = false;
    log(\`Starting automation. Concurrency limit: \${config.maxConcurrency}, Total prompts: \${queue.length}\`, 'info');
    updateWidgetUI();
    processNextJobs();
  }

  function pauseAutomation() {
    isPaused = true;
    log('Automation paused. Current jobs will finish.', 'warn');
    updateWidgetUI();
  }

  function resumeAutomation() {
    isPaused = false;
    log('Automation resumed.', 'info');
    updateWidgetUI();
    processNextJobs();
  }

  function stopAutomation() {
    isRunning = false;
    isPaused = false;
    activeWorkers = 0;
    queue.forEach(j => {
      if (j.status === 'running') j.status = 'cancelled';
    });
    chrome.storage.local.set({ axcel_queue: queue });
    log('Automation stopped by user.', 'warn');
    updateWidgetUI();
  }

  // --- Automation Dispatcher ---
  function processNextJobs() {
    if (!isRunning || isPaused) return;

    while (activeWorkers < config.maxConcurrency) {
      const nextJob = queue.find(j => j.status === 'pending' || (j.status === 'retrying' && (!j.retryAfter || j.retryAfter <= Date.now())));
      if (!nextJob) break;

      runSingleJob(nextJob);
    }

    const pendingOrRunning = queue.filter(j => j.status === 'pending' || j.status === 'running' || j.status === 'retrying').length;
    if (pendingOrRunning === 0 && activeWorkers === 0 && queue.length > 0) {
      isRunning = false;
      log('🎉 All video generation tasks have completed!', 'success');
      updateWidgetUI();
    }
  }

  async function runSingleJob(job) {
    activeWorkers++;
    job.status = 'running';
    job.attemptCount = (job.attemptCount || 0) + 1;
    log(\`[Worker \${activeWorkers}] Processing Scene \${job.index} (Attempt \${job.attemptCount}/\${config.maxRetries}): "\${job.title}"\`, 'info');
    updateWidgetUI();

    try {
      // Step 1: Upload reference image if present (Image-to-Video mode)
      if (job.referenceImage) {
        log(\`[Worker \${activeWorkers}] Attaching reference image for Scene \${job.index}...\`, 'info');
        const imgSuccess = await uploadReferenceImage(job.referenceImage, job.referenceImageName || 'reference.png');
        if (imgSuccess) {
          log('Reference image attached successfully.', 'info');
          await sleep(800);
        } else {
          log('Reference image uploader not found; continuing with prompt...', 'warn');
        }
      }

      // Step 2: Fill the prompt into the Angular textarea
      await fillPromptTextarea(job.prompt);
      await sleep(500);

      // Step 3: Configure parameters (duration, resolution, aspect ratio, audio)
      await configureParameters(job);
      await sleep(500);

      // Step 3: Trigger Generate Video button
      const generateClicked = await clickGenerateButton();
      if (!generateClicked) {
        throw new Error('Generate Video button not clickable or disabled');
      }

      // Step 4: Wait for generation & detect results or errors
      const result = await waitForVideoCompletion(job);
      if (result.success && result.videoUrl) {
        job.status = 'completed';
        job.videoUrl = result.videoUrl;
        log(\`Scene \${job.index} finished successfully!\`, 'success');

        // Trigger Auto-Download
        if (config.autoDownload) {
          triggerDownload(job, result.videoUrl);
        }
      } else {
        throw new Error(result.error || 'Video generation did not complete');
      }
    } catch (err) {
      log(\`Scene \${job.index} error: \${err.message}\`, 'error');
      handleFailure(job, err.message);
    } finally {
      activeWorkers = Math.max(0, activeWorkers - 1);
      chrome.storage.local.set({ axcel_queue: queue });
      updateWidgetUI();
      processNextJobs();
    }
  }

  function handleFailure(job, errorMsg) {
    if (job.attemptCount < config.maxRetries) {
      job.status = 'retrying';
      job.error = errorMsg;
      job.retryAfter = Date.now() + config.retryDelayMs;
      log(\`Scene \${job.index} failed. Retrying in \${Math.round(config.retryDelayMs / 1000)}s (Attempt \${job.attemptCount + 1}/\${config.maxRetries})...\`, 'warn');
      setTimeout(() => {
        if (isRunning && !isPaused && job.status === 'retrying') {
          job.status = 'pending';
          processNextJobs();
        }
      }, config.retryDelayMs);
    } else {
      job.status = 'failed';
      job.error = \`Max retries (\${config.maxRetries}) exceeded: \${errorMsg}\`;
      log(\`Scene \${job.index} permanently failed after \${job.attemptCount} attempts.\`, 'error');
    }
  }

  // --- DOM Automation Helpers ---
  async function uploadReferenceImage(imageSrc, filename = 'reference.png') {
    try {
      const fileInput = document.querySelector('input[type="file"][accept*="image"]') ||
                         document.querySelector('.upload-box input[type="file"]') ||
                         document.querySelector('input[type="file"]');
      if (!fileInput) return false;

      let blob;
      if (imageSrc.startsWith('data:')) {
        const parts = imageSrc.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        blob = new Blob([u8arr], { type: mime });
      } else {
        const res = await fetch(imageSrc);
        blob = await res.blob();
      }

      const file = new File([blob], filename, { type: blob.type || 'image/png' });
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInput.files = dt.files;
      fileInput.dispatchEvent(new Event('input', { bubbles: true }));
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    } catch (e) {
      console.warn('[Axcel Automator] Image injection error:', e);
      return false;
    }
  }

  async function fillPromptTextarea(text) {
    const textarea = document.querySelector('.prompt-box textarea') || document.querySelector('textarea');
    if (!textarea) throw new Error('Could not find prompt textarea on page.');

    // Angular reactive forms listen to native input events
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(textarea, text);
    } else {
      textarea.value = text;
    }

    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    textarea.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  async function configureParameters(job) {
    // 1. Model Selection (Seedance 2.5 vs Seedance 2.0)
    const targetModel = job.model || (job.duration === '30s' ? 'Seedance 2.5' : null);
    if (targetModel) {
      const modelTrigger = Array.from(document.querySelectorAll('select, button, [role="combobox"]')).find(el => {
        const t = (el.innerText || el.textContent || '').trim();
        return t.includes('Seedance') || el.getAttribute('aria-label')?.includes('Model');
      });
      if (modelTrigger && modelTrigger.tagName === 'SELECT') {
        const opt = Array.from(modelTrigger.options).find(o => o.text.includes(targetModel));
        if (opt && modelTrigger.value !== opt.value) {
          modelTrigger.value = opt.value;
          modelTrigger.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }

    // 2. Select boxes for Duration (including 30s), Resolution, Aspect Ratio
    const selects = Array.from(document.querySelectorAll('select'));
    for (const sel of selects) {
      const options = Array.from(sel.options).map(o => o.text.trim());
      if (options.includes(job.duration)) {
        sel.value = Array.from(sel.options).find(o => o.text.trim() === job.duration)?.value || sel.value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (options.includes(job.resolution)) {
        sel.value = Array.from(sel.options).find(o => o.text.trim() === job.resolution)?.value || sel.value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (options.includes(job.aspectRatio)) {
        sel.value = Array.from(sel.options).find(o => o.text.trim() === job.aspectRatio)?.value || sel.value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    // 3. Audio switch toggle
    if (job.generateAudio !== undefined) {
      const audioSwitch = document.querySelector('button.switch') || document.querySelector('[role="switch"]');
      if (audioSwitch) {
        const isChecked = audioSwitch.classList.contains('switch--checked') || audioSwitch.getAttribute('aria-checked') === 'true';
        if (isChecked !== job.generateAudio) {
          audioSwitch.click();
        }
      }
    }
  }

  async function clickGenerateButton() {
    const btn = document.querySelector('.generate-btn') || Array.from(document.querySelectorAll('button')).find(b => b.innerText?.includes('Generate Video'));
    if (!btn) return false;
    if (btn.disabled) {
      log('Generate button is disabled. Checking prompt validity or login state.', 'warn');
      return false;
    }
    btn.click();
    return true;
  }

  async function waitForVideoCompletion(job, timeoutMs = 180000) {
    const startTime = Date.now();
    log(\`Watching video generation for Scene \${job.index}...\`, 'info');

    while (Date.now() - startTime < timeoutMs) {
      if (!isRunning) return { success: false, error: 'Cancelled' };

      // Check if sign-in modal appeared
      const dialog = document.querySelector('dialog, [role="dialog"]');
      if (dialog && dialog.innerText.includes('Sign in')) {
        return { success: false, error: 'Axcel login required. Please sign in to axcel.cloud first.' };
      }

      // Check for error toasts or messages
      const bodyText = document.body.innerText;
      if (bodyText.includes('Masih ada video lain yang sedang disiapkan')) {
        log('Axcel rate limit: Another video is still preparing. Waiting 8s...', 'warn');
        await sleep(8000);
        await clickGenerateButton();
        continue;
      }
      if (bodyText.includes('Gagal menyiapkan video')) {
        return { success: false, error: 'Axcel server error: Gagal menyiapkan video' };
      }
      if (bodyText.includes('Generate dijeda sementara')) {
        return { success: false, error: 'Axcel account rate-limited/paused' };
      }

      // Check preview or video elements
      const videos = Array.from(document.querySelectorAll('video'));
      for (const v of videos) {
        if (v.src && !v.src.startsWith('blob:') && v.readyState >= 1) {
          return { success: true, videoUrl: v.src };
        }
      }

      // Check History panel if active
      const historyCard = document.querySelector('.stage video, ax-preview-pane video');
      if (historyCard && historyCard.src) {
        return { success: true, videoUrl: historyCard.src };
      }

      await sleep(3000);
    }

    return { success: false, error: 'Generation timed out after 3 minutes' };
  }

  function triggerDownload(job, url) {
    const cleanTitle = (job.title || 'scene_' + job.index).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = \`\${String(job.index).padStart(2, '0')}_\${cleanTitle}.mp4\`;

    chrome.runtime.sendMessage({
      action: 'DOWNLOAD_VIDEO',
      payload: {
        url,
        filename,
        folder: config.downloadFolder || 'axcel_videos',
      },
    }, res => {
      if (res && res.success) {
        log(\`Download triggered: \${filename}\`, 'success');
      } else {
        log(\`Download error for \${filename}: \${res?.error || 'Unknown'}\`, 'warn');
      }
    });
  }

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
})();
`;

export const EXTENSION_CONTENT_CSS = `/* Axcel Automator Floating HUD */
#axcel-automator-widget {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 330px;
  background: #12141a;
  color: #f1f5f9;
  border: 1px solid #27272a;
  border-radius: 14px;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.45);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 13px;
  z-index: 999999;
  overflow: hidden;
  backdrop-filter: blur(8px);
}

.ax-widget-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: #181b22;
  border-bottom: 1px solid #27272a;
}

.ax-widget-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 13px;
  color: #e2e8f0;
}

.ax-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 8px #10b981;
}

#ax-toggle-collapse {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 14px;
  padding: 2px 6px;
}

.ax-widget-body {
  padding: 12px 14px;
}

.ax-stat-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  color: #94a3b8;
  font-size: 12px;
}

.ax-progress-bar {
  height: 6px;
  background: #27272a;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
}

.ax-progress-fill {
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, #6366f1, #3b82f6);
  transition: width 0.3s ease;
}

.ax-summary-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 11.5px;
  color: #94a3b8;
}

.ax-btn-group {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
}

.ax-btn {
  flex: 1;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid #3f3f46;
  background: #27272a;
  color: #f1f5f9;
}

.ax-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.ax-btn-primary {
  background: #3b82f6;
  border-color: #2563eb;
  color: #fff;
}

.ax-btn-danger {
  background: #ef4444;
  border-color: #dc2626;
  color: #fff;
}

.ax-widget-logs {
  background: #090a0f;
  border: 1px solid #1e222d;
  border-radius: 6px;
  padding: 6px 8px;
  height: 80px;
  overflow-y: auto;
  font-family: monospace;
  font-size: 11px;
}

.ax-log-item {
  margin-bottom: 3px;
  word-break: break-all;
}

.ax-log-item.info { color: #94a3b8; }
.ax-log-item.success { color: #34d399; }
.ax-log-item.warn { color: #fbbf24; }
.ax-log-item.error { color: #f87171; }
`;

export const EXTENSION_POPUP_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Axcel Video Automator</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 420px;
      min-height: 520px;
      background: #0f1117;
      color: #f3f4f6;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      display: flex;
      flex-direction: column;
    }
    header {
      background: #161922;
      border-bottom: 1px solid #282c37;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .logo-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 14px;
    }
    .status-pill {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 12px;
      background: #1e293b;
      color: #94a3b8;
    }
    nav.tabs {
      display: flex;
      background: #141720;
      border-bottom: 1px solid #282c37;
    }
    .tab-btn {
      flex: 1;
      padding: 8px 12px;
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 12px;
      cursor: pointer;
      border-bottom: 2px solid transparent;
    }
    .tab-btn.active {
      color: #38bdf8;
      border-bottom-color: #38bdf8;
      font-weight: 600;
    }
    main {
      padding: 14px 16px;
      flex: 1;
      overflow-y: auto;
    }
    .dropzone {
      border: 2px dashed #334155;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
      cursor: pointer;
      background: #161b26;
      transition: border-color 0.2s;
      margin-bottom: 12px;
    }
    .dropzone:hover {
      border-color: #38bdf8;
    }
    .prompt-card {
      background: #161b26;
      border: 1px solid #282c37;
      border-radius: 6px;
      padding: 8px 10px;
      margin-bottom: 8px;
      font-size: 12px;
    }
    .prompt-header {
      display: flex;
      justify-content: space-between;
      color: #94a3b8;
      margin-bottom: 4px;
    }
    .badge-status {
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 10px;
    }
    .badge-pending { background: #334155; color: #cbd5e1; }
    .badge-running { background: #1e3a8a; color: #93c5fd; }
    .badge-completed { background: #064e3b; color: #6ee7b7; }
    .badge-failed { background: #7f1d1d; color: #fca5a5; }
    .footer-actions {
      padding: 12px 16px;
      background: #161922;
      border-top: 1px solid #282c37;
      display: flex;
      gap: 8px;
    }
    .btn {
      flex: 1;
      padding: 8px 12px;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      border: 1px solid #334155;
      background: #1e293b;
      color: #fff;
      font-size: 12px;
    }
    .btn-primary { background: #2563eb; border-color: #1d4ed8; }
    .btn-danger { background: #dc2626; border-color: #b91c1c; }
    .btn:disabled { opacity: 0.4; cursor: not-allowed; }
  </style>
</head>
<body>
  <header>
    <div class="logo-badge">
      <span>🎬</span>
      <span>Axcel Automator</span>
    </div>
    <span class="status-pill" id="pop-status">Idle</span>
  </header>
  <nav class="tabs">
    <button class="tab-btn active" data-tab="queue">Batch Queue</button>
    <button class="tab-btn" data-tab="settings">Settings</button>
  </nav>
  <main id="tab-queue">
    <div class="dropzone" id="dropzone">
      <strong>Upload .md or .doc file</strong>
      <p style="color: #94a3b8; font-size: 11px; margin-top: 4px;">or click to browse prompts</p>
      <input type="file" id="file-input" accept=".md,.doc,.docx,.txt" style="display:none;" />
    </div>
    <div id="queue-list">
      <div style="text-align:center; color:#64748b; padding: 20px 0;">No prompts loaded yet.</div>
    </div>
  </main>
  <main id="tab-settings" style="display: none;">
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <div>
        <label style="display:block; margin-bottom:4px; font-weight:500;">Max Simultaneous Generations</label>
        <input type="number" id="cfg-concurrency" value="2" min="1" max="4" style="width:100%; padding:6px; background:#161b26; border:1px solid #334155; color:#fff; border-radius:4px;" />
        <small style="color:#94a3b8;">Axcel allows 2 simultaneous generations.</small>
      </div>
      <div>
        <label style="display:block; margin-bottom:4px; font-weight:500;">Batch Limit</label>
        <input type="number" id="cfg-batch" value="10" min="1" max="20" style="width:100%; padding:6px; background:#161b26; border:1px solid #334155; color:#fff; border-radius:4px;" />
        <small style="color:#94a3b8;">Default maximum of 10 videos per batch.</small>
      </div>
      <div>
        <label style="display:block; margin-bottom:4px; font-weight:500;">Auto-Retry Limit</label>
        <input type="number" id="cfg-retries" value="3" min="1" max="5" style="width:100%; padding:6px; background:#161b26; border:1px solid #334155; color:#fff; border-radius:4px;" />
        <small style="color:#94a3b8;">Automatically re-tries if video generation fails.</small>
      </div>
      <div>
        <label style="display:flex; align-items:center; gap:8px;">
          <input type="checkbox" id="cfg-autodownload" checked />
          <span>Auto-download videos upon completion</span>
        </label>
      </div>
    </div>
  </main>
  <div class="footer-actions">
    <button class="btn btn-primary" id="btn-start" disabled>Start Batch</button>
    <button class="btn" id="btn-pause" disabled>Pause</button>
    <button class="btn btn-danger" id="btn-stop" disabled>Stop</button>
  </div>
  <script src="jszip.min.js"></script>
  <script src="popup.js"></script>
</body>
</html>
`;

export const EXTENSION_POPUP_JS = `/**
 * Axcel Automator - Popup Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('file-input');
  const dropzone = document.getElementById('dropzone');
  const queueList = document.getElementById('queue-list');
  const btnStart = document.getElementById('btn-start');
  const btnPause = document.getElementById('btn-pause');
  const btnStop = document.getElementById('btn-stop');
  const popStatus = document.getElementById('pop-status');

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      document.getElementById('tab-queue').style.display = tab === 'queue' ? 'block' : 'none';
      document.getElementById('tab-settings').style.display = tab === 'settings' ? 'block' : 'none';
    };
  });

  // Dropzone click
  dropzone.onclick = () => fileInput.click();
  fileInput.onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await extractTextFromFile(file);
      parseAndLoadPrompts(text);
    } catch (err) {
      console.error('File parsing error:', err);
      const reader = new FileReader();
      reader.onload = evt => parseAndLoadPrompts(evt.target.result);
      reader.readAsText(file);
    }
  };

  async function extractTextFromFile(file) {
    const isDocx = file.name.toLowerCase().endsWith('.docx');
    if (isDocx && window.JSZip) {
      const zip = await JSZip.loadAsync(file);
      const docXml = zip.file('word/document.xml');
      if (docXml) {
        const xml = await docXml.async('string');
        const paragraphRegex = /<w:p(?:\s+[^>]*)?>([\s\S]*?)<\/w:p>/gi;
        const textRegex = /<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/gi;
        const paragraphs = [];
        let pMatch;
        while ((pMatch = paragraphRegex.exec(xml)) !== null) {
          let paragraphText = '';
          let tMatch;
          while ((tMatch = textRegex.exec(pMatch[1])) !== null) {
            paragraphText += tMatch[1];
          }
          if (paragraphText.trim()) paragraphs.push(paragraphText.trim());
        }
        if (paragraphs.length > 0) return paragraphs.join('\\n\\n');
      }
    }
    return await file.text();
  }

  function parseAndLoadPrompts(text) {
    // Simple markdown scene parser
    const blocks = text.split(/(?:^|\\n)(?:---|===|#{1,3}\\s+)/g).map(b => b.trim()).filter(Boolean);
    const prompts = blocks.map((b, i) => {
      const lines = b.split('\\n');
      return {
        id: 'p_' + (i + 1),
        title: lines[0].slice(0, 30),
        prompt: lines.slice(1).join(' ').trim() || lines[0],
        duration: '5s',
        resolution: '720p',
        aspectRatio: '16:9',
      };
    });

    sendToActiveTab({ action: 'LOAD_PROMPTS', prompts }, res => {
      refreshState();
    });
  }

  function sendToActiveTab(msg, cb) {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, msg, cb);
      }
    });
  }

  function refreshState() {
    sendToActiveTab({ action: 'GET_STATE' }, res => {
      if (!res) {
        popStatus.textContent = 'Not on Axcel tab';
        return;
      }
      renderQueue(res.queue);
      popStatus.textContent = res.isRunning ? (res.isPaused ? 'Paused' : 'Running') : 'Idle';
      btnStart.disabled = res.isRunning || res.queue.length === 0;
      btnPause.disabled = !res.isRunning;
      btnStop.disabled = !res.isRunning;
    });
  }

  function renderQueue(queue) {
    if (!queue || queue.length === 0) {
      queueList.innerHTML = '<div style="text-align:center; color:#64748b; padding: 20px 0;">No prompts loaded.</div>';
      return;
    }
    queueList.innerHTML = queue.map(j => \`
      <div class="prompt-card">
        <div class="prompt-header">
          <strong>#\${j.index}: \${j.title}</strong>
          <span class="badge-status badge-\${j.status}">\${j.status}</span>
        </div>
        <p style="color:#94a3b8; font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">\${j.prompt}</p>
      </div>
    \`).join('');
  }

  btnStart.onclick = () => sendToActiveTab({ action: 'START_AUTOMATION' }, refreshState);
  btnPause.onclick = () => sendToActiveTab({ action: 'PAUSE_AUTOMATION' }, refreshState);
  btnStop.onclick = () => sendToActiveTab({ action: 'STOP_AUTOMATION' }, refreshState);

  refreshState();
});
`;

export const EXTENSION_README_MD = `# Axcel.cloud Auto Video Generator & Downloader (Chrome Extension)

This Chrome Extension automates batch video creation on **[https://axcel.cloud/video/text-to-video](https://axcel.cloud/video/text-to-video)** AND **[https://axcel.cloud/video/image-to-video](https://axcel.cloud/video/image-to-video)** from your Markdown (.md), Word/Docs (.docx), or Text scripts.

---

## Key Features

1. **Dual Injected Pages**:
   - Injected on **Text-to-Video**: \`https://axcel.cloud/video/text-to-video\`
   - Injected on **Image-to-Video**: \`https://axcel.cloud/video/image-to-video\`
2. **Seedance 2.5 (30s Duration) Support**:
   - Full support for the newest **Seedance 2.5** model with extended **30s video duration** alongside 5s, 8s, 10s, 12s, 15s.
3. **Reference Image Upload for Image-to-Video**:
   - Automatically attaches reference images to Axcel's file uploader using native DataTransfer events.
4. **2-Video Simultaneous Concurrency & Batch Limit**:
   - Maintains 2 active generations concurrently while queuing up to 10 scenes per batch.
5. **Automatic Retry on Failure**:
   - Waits and automatically retries transient timeouts, rate limits, or "Gagal menyiapkan video" up to 3 times.
6. **Automatic Video Downloads**:
   - Detects the completed MP4 stream and automatically saves it using Chrome's Downloads API with custom naming (\`01_Scene_Title.mp4\`).
7. **In-Page Floating HUD**:
   - Shows live progress, worker slots (0/2), current mode (Text vs Image to Video), and log telemetry.

---

## 30-Second Installation in Chrome / Edge / Brave

1. Download and extract **\`axcel-automator-extension.zip\`** to any folder on your computer.
2. In Google Chrome, navigate to: \`chrome://extensions\` (or Edge: \`edge://extensions\`).
3. Toggle on **"Developer mode"** in the top right corner.
4. Click the **"Load unpacked"** button in the top left.
5. Select the extracted extension directory (containing \`manifest.json\`).
6. Open **\`https://axcel.cloud/video/text-to-video\`** or **\`https://axcel.cloud/video/image-to-video\`** and make sure you are signed in.
7. Click the **Axcel Automator** icon in your Chrome toolbar or use the in-page floating widget!
`;

/**
 * Generates an in-memory ZIP of the Chrome Extension using JSZip.
 */
export async function generateExtensionZip(): Promise<Blob> {
  const zip = new JSZip();

  zip.file('manifest.json', EXTENSION_MANIFEST);
  zip.file('background.js', EXTENSION_BACKGROUND_JS);
  zip.file('content.js', EXTENSION_CONTENT_JS);
  zip.file('content.css', EXTENSION_CONTENT_CSS);
  zip.file('popup.html', EXTENSION_POPUP_HTML);
  zip.file('popup.js', EXTENSION_POPUP_JS);
  zip.file('jszip.min.js', jszipRaw);
  zip.file('README.md', EXTENSION_README_MD);

  // Add 16x16, 48x48, 128x128 SVG/PNG icon placeholders
  const iconFolder = zip.folder('icons');
  if (iconFolder) {
    const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none">
      <rect width="128" height="128" rx="28" fill="#18181b"/>
      <polygon points="46,36 94,64 46,92" fill="#3b82f6"/>
      <circle cx="94" cy="36" r="10" fill="#10b981"/>
    </svg>`;
    iconFolder.file('icon.svg', iconSvg);
    // Minimal 1x1 png pixel for chrome icon compatibility
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    iconFolder.file('icon16.png', pngBase64, { base64: true });
    iconFolder.file('icon48.png', pngBase64, { base64: true });
    iconFolder.file('icon128.png', pngBase64, { base64: true });
  }

  return await zip.generateAsync({ type: 'blob' });
}

export function getAllExtensionFiles(): ExtensionFile[] {
  return [
    {
      name: 'manifest.json',
      path: '/manifest.json',
      language: 'json',
      content: EXTENSION_MANIFEST,
      description: 'Chrome Extension Manifest V3 specifying permissions, background worker, and content scripts.',
    },
    {
      name: 'content.js',
      path: '/content.js',
      language: 'javascript',
      content: EXTENSION_CONTENT_JS,
      description: 'Injected script running on axcel.cloud. Automates prompt input, triggers generation, watches jobs, and handles auto-retry.',
    },
    {
      name: 'content.css',
      path: '/content.css',
      language: 'css',
      content: EXTENSION_CONTENT_CSS,
      description: 'Scoped styles for the in-page Axcel Automator floating HUD widget.',
    },
    {
      name: 'background.js',
      path: '/background.js',
      language: 'javascript',
      content: EXTENSION_BACKGROUND_JS,
      description: 'Manifest V3 Service Worker managing Chrome Downloads API and badge counters.',
    },
    {
      name: 'popup.html',
      path: '/popup.html',
      language: 'html',
      content: EXTENSION_POPUP_HTML,
      description: 'Popup window UI for loading .md/.doc files, configuring settings, and starting the queue.',
    },
    {
      name: 'popup.js',
      path: '/popup.js',
      language: 'javascript',
      content: EXTENSION_POPUP_JS,
      description: 'Client logic for the popup window, parsing documents and dispatching commands.',
    },
    {
      name: 'README.md',
      path: '/README.md',
      language: 'markdown',
      content: EXTENSION_README_MD,
      description: 'Quick-start installation guide for Google Chrome, Brave, and Edge.',
    },
  ];
}
