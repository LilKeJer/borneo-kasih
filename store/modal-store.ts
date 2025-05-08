// store/modal-store.ts
import { create } from "zustand";

type ModalType =
  | "createPatient"
  | "editPatient"
  | "deletePatient"
  | "createAppointment"
  | "editAppointment"
  | "cancelAppointment"
  | "createPrescription"
  | "viewMedicalRecord"
  | "confirm";

interface ModalData {
  [key: string]: any;
}

interface ModalState {
  type: ModalType | null;
  data: ModalData;
  isOpen: boolean;
  onClose: (() => void) | null;
  onConfirm: (() => void) | null;
  openModal: (
    type: ModalType,
    data?: ModalData,
    onClose?: () => void,
    onConfirm?: () => void
  ) => void;
  closeModal: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
  type: null,
  data: {},
  isOpen: false,
  onClose: null,
  onConfirm: null,
  openModal: (type, data = {}, onClose = null, onConfirm = null) =>
    set({ type, data, isOpen: true, onClose, onConfirm }),
  closeModal: () =>
    set({
      type: null,
      data: {},
      isOpen: false,
      onClose: null,
      onConfirm: null,
    }),
}));
