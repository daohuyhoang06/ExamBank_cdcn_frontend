import { createRoot } from "react-dom/client";
import { Popup } from "@/components/ui/Popup/popup";

type ConfirmOptions = {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "success" | "info";
};

export function confirm(message: string, options?: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    function cleanup() {
      try {
        root.unmount();
      } catch {}
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    }

    const onConfirm = () => {
      resolve(true);
      cleanup();
    };

    const onCancel = () => {
      resolve(false);
      cleanup();
    };

    root.render(
      <Popup
        open={true}
        title={options?.title ?? "Xác nhận"}
        message={message}
        type={options?.type ?? "warning"}
        confirmText={options?.confirmText ?? "Xác nhận"}
        cancelText={options?.cancelText ?? "Hủy"}
        showCancel={true}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
  });
}

export function alert(message: string, options?: Omit<ConfirmOptions, "cancelText">): Promise<void> {
  return new Promise((resolve) => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    function cleanup() {
      try {
        root.unmount();
      } catch {}
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    }

    const onConfirm = () => {
      resolve();
      cleanup();
    };

    root.render(
      <Popup
        open={true}
        title={options?.title ?? "Thông báo"}
        message={message}
        type={options?.type ?? "info"}
        confirmText={options?.confirmText ?? "Đóng"}
        showCancel={false}
        onConfirm={onConfirm}
        onCancel={() => {
          resolve();
          cleanup();
        }}
      />,
    );
  });
}

export default { confirm, alert };
