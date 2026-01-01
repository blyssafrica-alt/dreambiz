import { useState, useCallback } from 'react';

export interface ModalState {
  visible: boolean;
  props?: any;
}

export function useModal() {
  const [modalState, setModalState] = useState<ModalState>({
    visible: false,
  });

  const showModal = useCallback((props?: any) => {
    setModalState({ visible: true, props });
  }, []);

  const hideModal = useCallback(() => {
    setModalState({ visible: false, props: undefined });
  }, []);

  return {
    visible: modalState.visible,
    props: modalState.props,
    showModal,
    hideModal,
  };
}

export function useConfirmDialog() {
  const { visible, props, showModal, hideModal } = useModal();

  const confirm = useCallback((
    options: {
      title: string;
      message: string;
      onConfirm: () => void | Promise<void>;
      type?: 'info' | 'warning' | 'danger' | 'success';
      confirmText?: string;
      cancelText?: string;
    }
  ) => {
    showModal(options);
  }, [showModal]);

  return {
    visible,
    props,
    confirm,
    hideModal,
  };
}

export function useAlertDialog() {
  const { visible, props, showModal, hideModal } = useModal();

  const alert = useCallback((
    options: {
      title: string;
      message: string;
      type?: 'info' | 'warning' | 'error' | 'success';
      buttonText?: string;
    }
  ) => {
    showModal(options);
  }, [showModal]);

  return {
    visible,
    props,
    alert,
    hideModal,
  };
}

export function useInputDialog() {
  const { visible, props, showModal, hideModal } = useModal();

  const prompt = useCallback((
    options: {
      title: string;
      message?: string;
      onSubmit: (value: string) => void | Promise<void>;
      placeholder?: string;
      defaultValue?: string;
      inputType?: 'text' | 'number' | 'email' | 'phone';
      multiline?: boolean;
      maxLength?: number;
    }
  ) => {
    showModal(options);
  }, [showModal]);

  return {
    visible,
    props,
    prompt,
    hideModal,
  };
}

export function useActionSheet() {
  const { visible, props, showModal, hideModal } = useModal();

  const show = useCallback((
    options: {
      title?: string;
      message?: string;
      options: {
        id: string;
        label: string;
        icon?: any;
        iconColor?: string;
        onPress: () => void;
        destructive?: boolean;
        disabled?: boolean;
      }[];
    }
  ) => {
    showModal(options);
  }, [showModal]);

  return {
    visible,
    props,
    show,
    hideModal,
  };
}
