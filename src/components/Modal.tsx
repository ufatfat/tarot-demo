import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { audio } from "../audio";
let openModals = 0;
let originalOverflow = "";
export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  function close() {
    void audio.play("close");
    onClose();
  }
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    if (openModals === 0) originalOverflow = document.body.style.overflow;
    openModals++;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      openModals--;
      if (openModals === 0) document.body.style.overflow = originalOverflow;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "modal-wide" : ""}`}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
      aria-label={title}
    >
      <div className="modal-top">
        <span>{title}</span>
        <button className="icon-button" data-sound="none" onClick={close} aria-label="关闭">
          <X size={19} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
