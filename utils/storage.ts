import { Task, Group, AppSettings, AppNotification, Attachment } from '../types';

const DB_NAME = 'chronos-db';
const DB_VERSION = 1;

// Stores
const STORE_TASKS = 'tasks';
const STORE_GROUPS = 'groups';
const STORE_ATTACHMENTS = 'attachments';
const STORE_SETTINGS = 'settings';
const STORE_NOTIFICATIONS = 'notifications';

interface AttachmentBlob {
    id: string;
    blob: Blob;
}

class StorageManager {
    private db: IDBDatabase | null = null;
    private initPromise: Promise<void> | null = null;

    // Initialize DB
    async init(): Promise<void> {
        if (this.initPromise) return this.initPromise;

        this.initPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('IndexedDB Error:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                this.migrateFromLocalStorage().then(resolve);
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_TASKS)) db.createObjectStore(STORE_TASKS, { keyPath: 'id' });
                if (!db.objectStoreNames.contains(STORE_GROUPS)) db.createObjectStore(STORE_GROUPS, { keyPath: 'id' });
                if (!db.objectStoreNames.contains(STORE_ATTACHMENTS)) db.createObjectStore(STORE_ATTACHMENTS, { keyPath: 'id' });
                if (!db.objectStoreNames.contains(STORE_SETTINGS)) db.createObjectStore(STORE_SETTINGS, { keyPath: 'id' });
                if (!db.objectStoreNames.contains(STORE_NOTIFICATIONS)) db.createObjectStore(STORE_NOTIFICATIONS, { keyPath: 'id' });
            };
        });

        return this.initPromise;
    }

    // Helper for transactions
    private getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): IDBObjectStore {
        if (!this.db) throw new Error('DB not initialized');
        return this.db.transaction(storeName, mode).objectStore(storeName);
    }

    // --- Tasks & Attachments ---

    async getTasks(): Promise<Task[]> {
        await this.init();
        return new Promise((resolve, reject) => {
            const store = this.getStore(STORE_TASKS);
            const request = store.getAll();
            
            request.onsuccess = async () => {
                const tasks = request.result as Task[];
                // Rehydrate attachments with Blob URLs
                const hydratedTasks = await Promise.all(tasks.map(async (task) => {
                    if (!task.attachments || task.attachments.length === 0) return task;
                    
                    const hydratedAttachments = await Promise.all(task.attachments.map(async (att) => {
                        // If data is missing (it should be for DB items), load from blob store
                        if (!att.data || att.data === 'blob-stored') {
                            const blob = await this.getAttachmentBlob(att.id);
                            if (blob) {
                                return { ...att, data: URL.createObjectURL(blob) };
                            }
                        }
                        return att;
                    }));
                    return { ...task, attachments: hydratedAttachments };
                }));
                resolve(hydratedTasks);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async saveTask(task: Task): Promise<Task> {
        await this.init();
        
        // 1. Process Attachments: Save Blobs, Strip Data for Metadata Store
        const processedAttachments = await Promise.all((task.attachments || []).map(async (att) => {
            // Case A: New Base64 (from Drop/Paste)
            if (att.data && att.data.startsWith('data:')) {
                const blob = await (await fetch(att.data)).blob();
                await this.putAttachmentBlob(att.id, blob);
                // Return version with Blob URL for React State, but we need to strip it for DB later
                return { ...att, data: URL.createObjectURL(blob), _isNew: true }; 
            }
            // Case B: Existing Blob URL (No change needed in store)
            return att;
        }));

        // 2. Prepare Task for DB (Strip Attachment Data)
        const dbTask = {
            ...task,
            attachments: processedAttachments.map(att => ({
                ...att,
                data: 'blob-stored', // Marker
                _isNew: undefined // Cleanup
            }))
        };

        // 3. Save DB Task
        return new Promise((resolve, reject) => {
            const store = this.getStore(STORE_TASKS, 'readwrite');
            const request = store.put(dbTask);
            request.onsuccess = () => {
                // Return the task with Blob URLs so the UI can display them immediately
                resolve({ ...task, attachments: processedAttachments });
            };
            request.onerror = () => reject(request.error);
        });
    }

    async deleteTasks(ids: string[]): Promise<void> {
        // 1. Get tasks first to identify attachments (Separate Read Transaction)
        const tasks = await this.getTasks();
        const toDelete = tasks.filter(t => ids.includes(t.id));

        await this.init();

        // 2. Delete associated attachments (Separate Write Transactions per blob or batched if feasible)
        // Note: deleteAttachmentBlob creates its own transaction.
        for (const t of toDelete) {
            if (t.attachments) {
                for (const att of t.attachments) {
                    await this.deleteAttachmentBlob(att.id);
                }
            }
        }

        // 3. Delete tasks (Separate Write Transaction)
        return new Promise((resolve, reject) => {
            const store = this.getStore(STORE_TASKS, 'readwrite');
            
            // Loop and delete
            toDelete.forEach(t => {
                store.delete(t.id);
            });

            store.transaction.oncomplete = () => resolve();
            store.transaction.onerror = () => reject(store.transaction.error);
        });
    }

    // --- Attachment Blob Store ---

    private async getAttachmentBlob(id: string): Promise<Blob | undefined> {
        return new Promise((resolve) => {
            const store = this.getStore(STORE_ATTACHMENTS);
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result?.blob);
            request.onerror = () => resolve(undefined);
        });
    }

    private async putAttachmentBlob(id: string, blob: Blob): Promise<void> {
        return new Promise((resolve, reject) => {
            const store = this.getStore(STORE_ATTACHMENTS, 'readwrite');
            store.put({ id, blob });
            store.transaction.oncomplete = () => resolve();
            store.transaction.onerror = () => reject(store.transaction.error);
        });
    }

    private async deleteAttachmentBlob(id: string): Promise<void> {
        const store = this.getStore(STORE_ATTACHMENTS, 'readwrite');
        store.delete(id);
    }

    // --- Groups ---

    async getGroups(): Promise<Group[]> {
        await this.init();
        return new Promise((resolve, reject) => {
            const store = this.getStore(STORE_GROUPS);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async saveGroup(group: Group): Promise<void> {
        await this.init();
        const store = this.getStore(STORE_GROUPS, 'readwrite');
        store.put(group);
    }

    async deleteGroup(id: string): Promise<void> {
        await this.init();
        const store = this.getStore(STORE_GROUPS, 'readwrite');
        store.delete(id);
    }

    // --- Settings & Notifications ---
    
    async getSettings(): Promise<AppSettings | null> {
        await this.init();
        return new Promise((resolve) => {
            const store = this.getStore(STORE_SETTINGS);
            const req = store.get('main');
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });
    }

    async saveSettings(settings: AppSettings): Promise<void> {
        await this.init();
        const store = this.getStore(STORE_SETTINGS, 'readwrite');
        store.put({ ...settings, id: 'main' });
    }

    async getNotifications(): Promise<AppNotification[]> {
        await this.init();
        return new Promise((resolve) => {
            const store = this.getStore(STORE_NOTIFICATIONS);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
        });
    }

    async saveNotification(n: AppNotification): Promise<void> {
        await this.init();
        const store = this.getStore(STORE_NOTIFICATIONS, 'readwrite');
        store.put(n);
    }
    
    async deleteNotification(id: string): Promise<void> {
        await this.init();
        const store = this.getStore(STORE_NOTIFICATIONS, 'readwrite');
        store.delete(id);
    }
    
    async clearNotifications(): Promise<void> {
        await this.init();
        const store = this.getStore(STORE_NOTIFICATIONS, 'readwrite');
        store.clear();
    }

    // --- Legacy Migration ---
    
    private async migrateFromLocalStorage() {
        if (!localStorage.getItem('chronos-tasks-v1')) return;
        
        console.log("Migrating from LocalStorage to IndexedDB...");
        
        try {
            // 1. Tasks
            const rawTasks = localStorage.getItem('chronos-tasks-v1');
            if (rawTasks) {
                const tasks: Task[] = JSON.parse(rawTasks);
                for (const task of tasks) {
                    await this.saveTask(task);
                }
            }

            // 2. Groups
            const rawGroups = localStorage.getItem('chronos-groups-v1');
            if (rawGroups) {
                const groups: Group[] = JSON.parse(rawGroups);
                for (const g of groups) await this.saveGroup(g);
            }
            
            // 3. Settings
            const rawSettings = localStorage.getItem('chronos-settings-v1');
            if (rawSettings) {
                const s = JSON.parse(rawSettings);
                await this.saveSettings(s);
            }

            // Cleanup
            localStorage.removeItem('chronos-tasks-v1');
            localStorage.removeItem('chronos-groups-v1');
            localStorage.removeItem('chronos-notifications-v1');
            localStorage.removeItem('chronos-settings-v1');
            
            console.log("Migration Complete.");
        } catch (e) {
            console.error("Migration failed", e);
        }
    }
}

export const storage = new StorageManager();