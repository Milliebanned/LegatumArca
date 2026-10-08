import { useCallback, useState } from "react";

// Names for beneficiary addresses ("Amara" for 0x91bC…). The contract stores
// addresses only, so these live in this browser, per connected wallet.

const key = (owner) => `legatumarca:people:${owner.toLowerCase()}`;
export const nameKey = (owner) => `legatumarca:name:${owner.toLowerCase()}`;

function read(storageKey, fallback) {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) ?? fallback;
  } catch {
    return fallback;
  }
}

function write(storageKey, value) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    // Storage unavailable (private window): names just won't persist.
  }
}

// [labels, saveLabels]: labels maps a lowercased address to a name;
// saveLabels takes [{ address, name }] rows and merges them in.
export function usePeople(owner) {
  const [labels, setLabels] = useState(() => read(key(owner), {}));
  const save = useCallback(
    (rows) =>
      setLabels((prev) => {
        const next = { ...prev };
        for (const { address, name } of rows) {
          if (name?.trim()) next[address.toLowerCase()] = name.trim();
          else delete next[address.toLowerCase()];
        }
        write(key(owner), next);
        return next;
      }),
    [owner]
  );
  return [labels, save];
}

// The owner's own display name, used in the greeting.
export function useDisplayName(owner) {
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem(nameKey(owner)) || "";
    } catch {
      return "";
    }
  });
  const save = useCallback(
    (next) => {
      setName(next);
      try {
        if (next) localStorage.setItem(nameKey(owner), next);
        else localStorage.removeItem(nameKey(owner));
      } catch {
        // Storage unavailable: the name just won't persist.
      }
    },
    [owner]
  );
  return [name, save];
}
