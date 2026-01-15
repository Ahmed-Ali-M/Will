import React, { useRef } from 'react';
import { AppSettings } from '../../types';
import { X, Moon, Sun, Monitor, Volume2, VolumeX, Bell, Database, RotateCcw, Save, Sparkles, MousePointer2, Music, Upload, Trash2, Grid } from 'lucide-react';
import { audio } from '../../utils/audioUtils';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (s: AppSettings) => void;
  onResetData: () => void;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ 
    isOpen, 
    onClose, 
    settings, 
    onUpdateSettings,
    onResetData
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleChange = (key: keyof AppSettings, value: any) => {
      const newSettings = { ...settings, [key]: value };
      onUpdateSettings(newSettings);
      
      // Feedback logic
      if (key === 'interactionSoundsEnabled' && value === true) {
          audio.setConfig(true, newSettings.notificationSound, newSettings.customSound?.data);
          audio.play('click');
      }
      if (key === 'notificationSound' && value !== 'none') {
          // Immediately update controller to play preview
          audio.setConfig(newSettings.interactionSoundsEnabled, value, newSettings.customSound?.data);
          audio.play('alarm');
      }
  };

  const handleCustomSoundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.size > 1024 * 1024) {
              alert("Sound file is too large. Please select a file under 1MB.");
              return;
          }

          const reader = new FileReader();
          reader.onload = (event) => {
              if (event.target?.result) {
                  const soundData = event.target.result as string;
                  const newSettings: AppSettings = {
                      ...settings,
                      notificationSound: 'custom',
                      customSound: {
                          name: file.name,
                          data: soundData
                      }
                  };
                  onUpdateSettings(newSettings);
                  audio.setConfig(newSettings.interactionSoundsEnabled, 'custom', soundData);
                  audio.play('alarm');
              }
          };
          reader.readAsDataURL(file);
      }
  };

  const deleteCustomSound = () => {
      const newSettings = { ...settings, customSound: null, notificationSound: 'default' };
      onUpdateSettings(newSettings);
  };

  const TONE_GROUPS = [
      {
          label: 'Short',
          options: [
              { id: 'beep', label: 'Beep' },
              { id: 'ding', label: 'Ding' },
          ]
      },
      {
          label: 'Medium',
          options: [
              { id: 'default', label: 'Default' },
              { id: 'digital', label: 'Digital' },
              { id: 'bell', label: 'Bell' },
              { id: 'ethereal', label: 'Ethereal' },
          ]
      },
      {
          label: 'Long',
          options: [
              { id: 'chime', label: 'Chime' },
              { id: 'meditation', label: 'Meditation' },
              { id: 'sunrise', label: 'Sunrise' },
          ]
      }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden ring-1 ring-slate-900/5 dark:ring-slate-700 animate-[scaleIn_0.2s_ease-out]">
        
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Settings</h2>
            <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X size={20} />
            </button>
        </div>

        <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-600">
            
            {/* Appearance Section */}
            <section>
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Monitor size={14} /> Appearance
                </h3>
                <div className="bg-slate-100 dark:bg-slate-700 p-1 rounded-xl flex mb-6">
                    {[
                        { id: 'light', icon: Sun, label: 'Light' },
                        { id: 'dark', icon: Moon, label: 'Dark' },
                        { id: 'system', icon: Monitor, label: 'System' }
                    ].map((theme) => (
                        <button
                            key={theme.id}
                            onClick={() => handleChange('theme', theme.id)}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all
                                ${settings.theme === theme.id 
                                    ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm' 
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                }
                            `}
                        >
                            <theme.icon size={16} />
                            {theme.label}
                        </button>
                    ))}
                </div>

                {/* Grid Options */}
                <div className="flex items-center justify-between mb-4">
                     <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                        <Grid size={16} className="text-slate-400"/>
                        Show Grid
                     </div>
                     <button 
                        onClick={() => handleChange('showGrid', !settings.showGrid)}
                        className={`w-9 h-5 rounded-full transition-colors relative ${settings.showGrid ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-600'}`}
                    >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform shadow-sm ${settings.showGrid ? 'left-5' : 'left-1'}`} />
                    </button>
                </div>
                
                {settings.showGrid && (
                    <div className="grid grid-cols-3 gap-2 pl-6">
                        {[
                            { id: 'dots', label: 'Dots' },
                            { id: 'lines', label: 'Lines' },
                            { id: 'crosshairs', label: 'Crosshairs' },
                        ].map(style => (
                            <button
                                key={style.id}
                                onClick={() => handleChange('gridStyle', style.id)}
                                className={`px-2 py-1.5 rounded-lg text-xs font-medium border text-center transition-all
                                    ${settings.gridStyle === style.id 
                                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300' 
                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                                    }
                                `}
                            >
                                {style.label}
                            </button>
                        ))}
                    </div>
                )}
            </section>

             {/* Cursor Reveal Section */}
             <section>
                <div className="flex items-center justify-between mb-4">
                     <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <Sparkles size={14} /> Starfield Background
                    </h3>
                    <button 
                        onClick={() => handleChange('revealEnabled', !settings.revealEnabled)}
                        className={`w-9 h-5 rounded-full transition-colors relative ${settings.revealEnabled ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-600'}`}
                    >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform shadow-sm ${settings.revealEnabled ? 'left-5' : 'left-1'}`} />
                    </button>
                </div>
                {settings.revealEnabled && (
                    <p className="text-[10px] text-slate-400 pl-6">
                        Reveals an animated starfield behind the cursor. Works best in dark mode.
                    </p>
                )}
            </section>

            {/* Audio Section */}
            <section>
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Volume2 size={14} /> Audio & Notifications
                </h3>
                
                <div className="space-y-6">
                    {/* Interaction Sounds Toggle */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${settings.interactionSoundsEnabled ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                                {settings.interactionSoundsEnabled ? <MousePointer2 size={18} /> : <VolumeX size={18} />}
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Interaction Haptics</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Clicks, pops, and ticks.</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => handleChange('interactionSoundsEnabled', !settings.interactionSoundsEnabled)}
                            className={`w-9 h-5 rounded-full transition-colors relative ${settings.interactionSoundsEnabled ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-600'}`}
                        >
                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform shadow-sm ${settings.interactionSoundsEnabled ? 'left-5' : 'left-1'}`} />
                        </button>
                    </div>

                    {/* Notification Sound Selector */}
                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3 block flex items-center gap-2">
                            <Bell size={12} /> Notification Tone
                        </label>
                        
                        <div className="space-y-4">
                            {TONE_GROUPS.map(group => (
                                <div key={group.label}>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">{group.label}</div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {group.options.map(tone => (
                                            <button
                                                key={tone.id}
                                                onClick={() => handleChange('notificationSound', tone.id)}
                                                className={`px-2 py-1.5 rounded-lg text-xs font-medium border text-center transition-all
                                                    ${settings.notificationSound === tone.id 
                                                        ? 'bg-white dark:bg-slate-800 border-blue-500 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-blue-500' 
                                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-500'
                                                    }
                                                `}
                                            >
                                                {tone.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {/* Custom Sound Area */}
                            <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">Custom</div>
                                {settings.customSound ? (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleChange('notificationSound', 'custom')}
                                            className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border text-left transition-all
                                                ${settings.notificationSound === 'custom' 
                                                    ? 'bg-white dark:bg-slate-800 border-purple-500 text-purple-600 dark:text-purple-400 shadow-sm ring-1 ring-purple-500' 
                                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-500'
                                                }
                                            `}
                                        >
                                            <Music size={14} />
                                            <span className="truncate">{settings.customSound.name}</span>
                                        </button>
                                        <button 
                                            onClick={deleteCustomSound} 
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                            title="Delete Custom Sound"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                    >
                                        <Upload size={14} /> Upload Custom Sound...
                                    </button>
                                )}
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept="audio/*" 
                                    onChange={handleCustomSoundUpload} 
                                />
                            </div>
                            
                            {/* None Option */}
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                                <button
                                    onClick={() => handleChange('notificationSound', 'none')}
                                    className={`w-full px-3 py-2 rounded-lg text-xs font-medium border text-center transition-all
                                        ${settings.notificationSound === 'none' 
                                            ? 'bg-slate-100 dark:bg-slate-700 border-transparent text-slate-600 dark:text-slate-300' 
                                            : 'border-transparent text-slate-400 hover:text-slate-600'
                                        }
                                    `}
                                >
                                    No Sound
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Data Section */}
            <section>
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Database size={14} /> Data
                </h3>
                <div className="flex gap-3">
                    <button 
                        onClick={() => {
                            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(localStorage.getItem('chronos-tasks-v1') || '[]');
                            const downloadAnchorNode = document.createElement('a');
                            downloadAnchorNode.setAttribute("href",     dataStr);
                            downloadAnchorNode.setAttribute("download", "will_backup.json");
                            document.body.appendChild(downloadAnchorNode);
                            downloadAnchorNode.click();
                            downloadAnchorNode.remove();
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-xl transition-colors"
                    >
                        <Save size={16} /> Backup JSON
                    </button>
                    <button 
                        onClick={() => {
                            if(window.confirm("Are you sure you want to delete all tasks? This cannot be undone.")) {
                                onResetData();
                                onClose();
                            }
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-semibold rounded-xl transition-colors border border-red-100 dark:border-red-900/30"
                    >
                        <RotateCcw size={16} /> Reset All
                    </button>
                </div>
            </section>

        </div>
      </div>
    </div>
  );
};

export default SettingsDialog;