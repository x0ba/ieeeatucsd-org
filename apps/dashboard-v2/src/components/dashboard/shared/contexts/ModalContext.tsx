import React, { createContext, useCallback, useContext, useState } from "react";

import type { ModalType } from "../types/modals";

interface ModalContextValue {
  activeModal: ModalType;
  registerModal: (modalType: ModalType) => void;
  unregisterModal: (modalType: ModalType) => void;
  isModalActive: (modalType: ModalType) => boolean;
}

const ModalContext = createContext<ModalContextValue | undefined>(undefined);

interface ModalProviderProps {
  children: React.ReactNode;
}

export function ModalProvider({ children }: ModalProviderProps) {
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const registerModal = useCallback((modalType: ModalType) => {
    setActiveModal(modalType);
  }, []);

  const unregisterModal = useCallback((modalType: ModalType) => {
    setActiveModal((current) => {
      if (current === modalType) {
        return null;
      }
      return current;
    });
  }, []);

  const isModalActive = useCallback(
    (modalType: ModalType) => activeModal === modalType,
    [activeModal],
  );

  const value: ModalContextValue = {
    activeModal,
    registerModal,
    unregisterModal,
    isModalActive,
  };

  return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>;
}

export function useModalContext(): ModalContextValue | undefined {
  return useContext(ModalContext);
}

export function useModalContextStrict(): ModalContextValue {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModalContext must be used within a ModalProvider");
  }
  return context;
}

export function useModalRegistration(modalType: ModalType, isOpen: boolean) {
  const context = useModalContext();
  const [hasWarned, setHasWarned] = React.useState(false);

  React.useEffect(() => {
    if (!context) {
      if (import.meta.env.DEV && !hasWarned && isOpen) {
        console.warn(
          `[useModalRegistration] ModalProvider not found for modal "${modalType}".`,
        );
        setHasWarned(true);
      }
      return;
    }

    const { registerModal, unregisterModal } = context;

    if (isOpen && modalType) {
      registerModal(modalType);
    } else if (modalType) {
      unregisterModal(modalType);
    }

    return () => {
      if (modalType) {
        unregisterModal(modalType);
      }
    };
  }, [context, hasWarned, isOpen, modalType]);
}
