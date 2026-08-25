import { useState, useRef, useEffect } from 'react';
import { MODEL_VERSIONS, ModelVersion } from '../types/chat';
import { ChevronDown, Check } from 'lucide-react';

interface ModelDropdownProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
}

export default function ModelDropdown({ selectedModel, onModelChange }: ModelDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentModel = MODEL_VERSIONS.find((m) => m.id === selectedModel) || MODEL_VERSIONS[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (model: ModelVersion) => {
    onModelChange(model.id);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-gray-600 transition-all duration-200"
      >
        <span className="text-sm font-medium text-gray-200">{currentModel.name}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-gray-900 border border-gray-700/50 rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-scale-in z-50">
          <div className="p-2">
            {MODEL_VERSIONS.map((model) => (
              <button
                key={model.id}
                onClick={() => handleSelect(model)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 text-left ${
                  selectedModel === model.id
                    ? 'bg-gradient-to-r from-blue-600/20 to-cyan-600/10 text-white'
                    : 'text-gray-400 hover:bg-gray-800/60 hover:text-white'
                }`}
              >
                <div>
                  <p className="text-sm font-medium">{model.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{model.description}</p>
                </div>
                {selectedModel === model.id && (
                  <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
