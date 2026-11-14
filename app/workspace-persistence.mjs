export const STORAGE_KEY = 'vpc-lab-v1';

export class SaveConflict extends Error {
  constructor() {
    super('Another tab changed the saved workspace. Your edits are kept here. Export them or load the saved version before continuing.');
  }
}

// The browser Web Lock serializes these reads and writes across simulator tabs.
export function writeWorkspace(storage, expected, next) {
  if (storage.getItem(STORAGE_KEY) !== expected) throw new SaveConflict();
  if (expected !== next) storage.setItem(STORAGE_KEY, next);
  return next;
}

export function parseWorkspace(raw, loader, reference) {
  return loader(raw === null ? null : JSON.parse(raw), reference);
}
