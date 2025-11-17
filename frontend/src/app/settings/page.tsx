'use client';

import { useState } from 'react';
import { aiApi } from '@/lib/ai-api';

const PROVIDERS = [
  { value: 'OPENAI', label: 'OpenAI (GPT-4, GPT-3.5)' },
  { value: 'ANTHROPIC', label: 'Anthropic (Claude)' },
  { value: 'GOOGLE', label: 'Google (Gemini)' },
];

export default function SettingsPage() {
  const [selectedProvider, setSelectedProvider] = useState('OPENAI');
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setMessage('Please enter an API key');
      return;
    }

    try {
      setIsSaving(true);
      await aiApi.saveApiKey({
        provider: selectedProvider,
        apiKey: apiKey.trim(),
      });
      setMessage('API key saved successfully!');
      setApiKey('');
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">AI Settings</h1>

          <div className="space-y-6">
            {/* API Key 관리 */}
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                API Keys
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Add your AI provider API keys to use the chat feature. Your keys are encrypted and stored securely.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Provider
                  </label>
                  <select
                    value={selectedProvider}
                    onChange={(e) => setSelectedProvider(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {PROVIDERS.map((provider) => (
                      <option key={provider.value} value={provider.value}>
                        {provider.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSaving ? 'Saving...' : 'Save API Key'}
                </button>

                {message && (
                  <p
                    className={`text-sm ${
                      message.includes('Error') ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {message}
                  </p>
                )}
              </div>
            </div>

            {/* 사용 가이드 */}
            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                How to get API Keys
              </h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li>
                  <strong>OpenAI:</strong> Visit{' '}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    platform.openai.com/api-keys
                  </a>
                </li>
                <li>
                  <strong>Anthropic:</strong> Visit{' '}
                  <a
                    href="https://console.anthropic.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    console.anthropic.com
                  </a>
                </li>
                <li>
                  <strong>Google:</strong> Visit{' '}
                  <a
                    href="https://makersuite.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    makersuite.google.com
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
