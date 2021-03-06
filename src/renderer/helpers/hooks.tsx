import { useRef, useState } from 'react';

export const usePermanentState = <T,>(
  defaultState: T,
  permanentKey: string,
  getter: (string) => any = (val) => val,
  setter: (string) => any = (val) => val
): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [permanentValue, setPermanentValueOrigin] = useState(
    getter(localStorage.getItem(permanentKey)) || defaultState
  );

  const setPermanentValue = (newValue) => {
    setPermanentValueOrigin(newValue);

    if (newValue) {
      localStorage.setItem(permanentKey, setter(newValue));
    } else {
      localStorage.removeItem(permanentKey);
    }
  };

  return [permanentValue, setPermanentValue];
};

export const useStateRef = (initialValue) => {
  const [state, stateSetterOrigin] = useState(initialValue);

  const stateRef = useRef(state);

  const stateSetter = (nextState) => {
    if (typeof nextState === 'function') {
      let res = nextState(state);

      stateRef.current = res;

      if (typeof res === 'function') {
        res = () => res;
      }
      return stateSetterOrigin(res);
    }
    stateRef.current = nextState;

    return stateSetterOrigin(nextState);
  };

  return [state, stateSetter, stateRef];
};

export const asd = 1;
