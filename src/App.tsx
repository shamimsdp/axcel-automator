import React, { useState } from 'react';
import { Header, AppTab } from './components/Header';
import { ExtensionHub } from './components/ExtensionHub';
import { DocumentStudio } from './components/DocumentStudio';
import { LiveSimulator } from './components/LiveSimulator';
import { DocumentationViewer } from './components/DocumentationViewer';
import { PromptItem } from './types';
import { parseMarkdownToPrompts } from './utils/markdownParser';
import { SAMPLE_SCRIPTS } from './utils/sampleData';
import { generateExtensionZip } from './utils/extensionGenerator';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('extension');
  const [prompts, setPrompts] = useState<PromptItem[]>(() =>
    parseMarkdownToPrompts(SAMPLE_SCRIPTS[0].content)
  );
  const [isDownloadingZip, setIsDownloadingZip] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleDownloadZip = async () => {
    try {
      setIsDownloadingZip(true);
      showToast('Compiling Manifest V3 Chrome Extension package...');
      const blob = await generateExtensionZip();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'axcel-automator-extension.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Download started! Extract the zip and load into chrome://extensions');
    } catch (err: any) {
      console.error('Failed to generate extension zip:', err);
      showToast(`Error creating zip: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const handleSendToSimulator = (promptsToSend: PromptItem[]) => {
    setPrompts(promptsToSend);
    setActiveTab('simulator');
    showToast(`Loaded ${promptsToSend.length} prompts into the Live Simulator!`);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* App Header */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onDownloadZip={handleDownloadZip}
        isDownloadingZip={isDownloadingZip}
        promptCount={prompts.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        {activeTab === 'extension' && (
          <ExtensionHub
            onDownloadZip={handleDownloadZip}
            isDownloadingZip={isDownloadingZip}
          />
        )}

        {activeTab === 'studio' && (
          <DocumentStudio
            prompts={prompts}
            onPromptsChange={setPrompts}
            onSendToSimulator={handleSendToSimulator}
          />
        )}

        {activeTab === 'simulator' && (
          <LiveSimulator
            prompts={prompts}
            onOpenStudio={() => setActiveTab('studio')}
          />
        )}

        {activeTab === 'docs' && <DocumentationViewer />}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-6 text-center text-xs text-zinc-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            Axcel Video Automator • Built for{' '}
            <a
              href="https://axcel.cloud/video/text-to-video"
              target="_blank"
              rel="noreferrer"
              className="text-zinc-400 hover:text-white underline"
            >
              axcel.cloud/video/text-to-video
            </a>
          </p>
          <p className="text-[11px] text-zinc-600">
            Supports 10 videos per batch • 2 concurrent generations • Smart Auto-Retry • Direct MP4 Downloads
          </p>
        </div>
      </footer>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-xs font-medium text-white shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
