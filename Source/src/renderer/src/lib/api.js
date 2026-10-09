export const api = typeof window !== 'undefined' ? window.fileup : null;
export const hasApi = !!api;
export const PLATFORM = api ? api.platform : 'linux';
