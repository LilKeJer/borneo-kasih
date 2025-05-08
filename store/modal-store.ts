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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}
interface ModalState {
  type: ModalType | null;
  data: ModalData;
  isOpen: boolean;
  onClose: (() => void) | undefined;
  onConfirm: (() => void) | undefined;
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
  onClose: undefined,
  onConfirm: undefined,
  openModal: (type, data = {}, onClose = undefined, onConfirm = undefined) =>
    set({ type, data, isOpen: true, onClose, onConfirm }),
  closeModal: () =>
    set({
      type: null,
      data: {},
      isOpen: false,
      onClose: undefined,
      onConfirm: undefined,
    }),
}));
