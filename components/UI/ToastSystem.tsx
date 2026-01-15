import React from 'react';
import { AppNotification } from '../../types';
import { Bell, Check, Clock, Play, X } from 'lucide-react';

interface ToastSystemProps {
    notifications: AppNotification[]; // Active toasts
    onDismiss: (id: string) => void;
    onAction: (notification: AppNotification, actionId: string) => void;
}

const ToastSystem: React.FC<ToastSystemProps> = ({ notifications, onDismiss, onAction }) => {
    return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[70] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
            {notifications.map(n => (
                <div 
                    key={n.id} 
                    className="pointer-events-auto bg-white/95 backdrop-blur-xl shadow-2xl rounded-2xl border border-slate-200 p-4 animate-[slideUp_0.3s_ease-out] ring-1 ring-black/5"
                >
                    <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full flex-shrink-0 ${n.type === 'overdue' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                            <Bell size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-800 text-sm leading-tight mb-1">{n.title}</h4>
                            <p className="text-xs text-slate-500 leading-relaxed mb-3">{n.message}</p>
                            
                            {/* Actions */}
                            {n.actions && n.actions.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {n.actions.map(action => (
                                        <button
                                            key={action.actionId}
                                            onClick={() => onAction(n, action.actionId)}
                                            className={`
                                                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95
                                                ${action.primary 
                                                    ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-md shadow-slate-900/20' 
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                }
                                            `}
                                        >
                                            {action.actionId === 'start-timer' && <Play size={12} fill="currentColor" />}
                                            {action.actionId === 'complete' && <Check size={12} />}
                                            {action.actionId === 'snooze' && <Clock size={12} />}
                                            {action.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button 
                            onClick={() => onDismiss(n.id)}
                            className="text-slate-400 hover:text-slate-600 -mt-1 -mr-1 p-1 rounded-full hover:bg-slate-100"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ToastSystem;
