import React, { useState, useEffect } from 'react';
import { Settings, Key, Brain, Save, X, Sparkles, Zap, AlertTriangle } from 'lucide-react';
import { AIProvider } from '../types';
import { aiService } from '../utils/aiService';

interface AISettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const AISettings: React.FC<AISettingsProps> = ({ isOpen, onClose }) => {
  const [selectedProvider, setSelectedProvider] = useState('DeepSeek');
  const [apiKey, setApiKey] = useState('');
  const [customEndpoint, setCustomEndpoint] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const providers = [
    { name: 'DeepSeek', endpoint: 'https://api.deepseek.com/v1/chat/completions', icon: '🧠' },
    { name: 'OpenAI', endpoint: 'https://api.openai.com/v1/chat/completions', icon: '🤖' },
    { name: 'Anthropic', endpoint: 'https://api.anthropic.com/v1/messages', icon: '🎭' },
    { name: 'Groq', endpoint: 'https://api.groq.com/openai/v1/chat/completions', icon: '⚡' }
  ];

  useEffect(() => {
    // Load saved settings
    const savedProvider = localStorage.getItem('ai_provider') || 'DeepSeek';
    const savedKey = localStorage.getItem('ai_key') || '';
    const savedEndpoint = localStorage.getItem('ai_endpoint');

    setSelectedProvider(savedProvider);
    setApiKey(savedKey);
    if (savedEndpoint) setCustomEndpoint(savedEndpoint);
  }, []);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      alert('Please enter an API key');
      return;
    }

    setIsSaving(true);

    try {
      const provider: AIProvider = {
        name: selectedProvider,
        key: apiKey,
        endpoint: customEndpoint || providers.find(p => p.name === selectedProvider)?.endpoint || ''
      };

      // Save to localStorage
      localStorage.setItem('ai_provider', selectedProvider);
      localStorage.setItem('ai_key', apiKey);
      localStorage.setItem('ai_endpoint', provider.endpoint);

      // Configure AI service
      aiService.setProvider(provider);

      alert('AI settings saved successfully!');
      onClose();
    } catch (error) {
      console.error('Error saving AI settings:', error);
      alert('Error saving settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleProviderChange = (providerName: string) => {
    setSelectedProvider(providerName);
    const provider = providers.find(p => p.name === providerName);
    if (provider) {
      setCustomEndpoint(provider.endpoint);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl max-w-lg w-full m-4 border border-gray-700">
        <div className="flex items-center justify-between p-6 border-b border-gray-700 bg-gradient-to-r from-purple-600/20 to-pink-600/20">
          <div className="flex items-center">
            <div className="p-2 bg-purple-500/20 rounded-lg mr-3">
              <Brain className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">AI Configuration</h2>
              <p className="text-sm text-gray-400">Configure your AI provider for smart recommendations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Warning about API key requirement */}
          <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 p-4 rounded-xl border border-yellow-500/20">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-yellow-400 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-yellow-300 mb-2">API Key Required</h4>
                <p className="text-sm text-yellow-200">
                  AI features require a valid API key from your chosen provider. Without a valid key, 
                  the system will use local data analysis for recommendations.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              AI Provider
            </label>
            <div className="grid grid-cols-2 gap-3">
              {providers.map(provider => (
                <button
                  key={provider.name}
                  onClick={() => handleProviderChange(provider.name)}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                    selectedProvider === provider.name
                      ? 'border-purple-500 bg-purple-500/20 text-white'
                      : 'border-gray-600 bg-gray-800/50 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  <div className="text-2xl mb-2">{provider.icon}</div>
                  <div className="font-medium">{provider.name}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              API Key
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key"
                className="w-full pl-10 pr-3 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <p className="mt-2 text-xs text-gray-400">
              Your API key is stored locally and never shared
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              API Endpoint (Optional)
            </label>
            <input
              type="url"
              value={customEndpoint}
              onChange={(e) => setCustomEndpoint(e.target.value)}
              placeholder="Custom endpoint URL"
              className="w-full px-3 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-4 rounded-xl border border-blue-500/20">
            <h4 className="font-medium text-blue-300 mb-3 flex items-center">
              <Sparkles className="h-4 w-4 mr-2" />
              AI-Powered Features
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm text-blue-200">
              <div className="flex items-center">
                <Zap className="h-3 w-3 mr-2 text-yellow-400" />
                Smart Recommendations
              </div>
              <div className="flex items-center">
                <Zap className="h-3 w-3 mr-2 text-yellow-400" />
                Auto Teacher Assignment
              </div>
              <div className="flex items-center">
                <Zap className="h-3 w-3 mr-2 text-yellow-400" />
                Performance Insights
              </div>
              <div className="flex items-center">
                <Zap className="h-3 w-3 mr-2 text-yellow-400" />
                Schedule Optimization
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {isSaving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AISettings;