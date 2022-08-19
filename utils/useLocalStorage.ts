import { useCallback, useEffect, useState } from "react";
import { useHasMounted } from ".";

// As seen in -> https://codesandbox.io/s/z20gn?file=/pages/index.js:336-397

export type UseLocalStorageOptions<T> = { key: string; initialValue?: T };

type StateValueState<T> = T | null;

type UseLocalStorageReturnType<T> = [
  StateValueState<T>,
  React.Dispatch<React.SetStateAction<StateValueState<T>>>,
  { getLocalStorageValue: () => StateValueState<T>; setLocalStorageValue: (newVal: T) => void }
];

export const useLocalStorage = <T>({ initialValue, key }: UseLocalStorageOptions<T>): UseLocalStorageReturnType<T> => {
  const [hasMounted] = useHasMounted();
  const [stateValue, setStateValue] = useState<StateValueState<T>>(initialValue || null);

  const getLocalStorageValue = useCallback((): StateValueState<T> => {
    let stickyValue = localStorage.getItem(key);
    if (!stickyValue) return null;

    try {
      const parsedJSON = JSON.parse(stickyValue);
      if (parsedJSON && typeof parsedJSON === "object") {
        stickyValue = parsedJSON;
      }
    } catch {}

    return stickyValue as StateValueState<T>;
  }, [key]);

  const setLocalStorageValue = useCallback(
    (newVal: T) => {
      const formattedValue = ["string", "number"].includes(typeof newVal) ? newVal : JSON.stringify(newVal);
      localStorage.setItem(key, String(formattedValue));
    },
    [key]
  );

  useEffect(() => {
    if (!hasMounted) return;
    setStateValue(getLocalStorageValue());
  }, [hasMounted, getLocalStorageValue]);

  useEffect(() => {
    if (!hasMounted || stateValue == null) return;
    setLocalStorageValue(stateValue);
  }, [hasMounted, stateValue, setLocalStorageValue]);

  return [stateValue, setStateValue, { getLocalStorageValue, setLocalStorageValue }];
};
