import { cn } from "@utils/stringUtils";
import { CheckIcon, CopyIcon } from "lucide-react";
import { ReactNode, useState } from "react";

export const CopyButton = ({
  label,
  buttonClassName,
  logoClassName,
  textToCopy,
  disabled,
}: {
  label: ReactNode;
  textToCopy: () => string;
  buttonClassName?: string;
  logoClassName?: string;
  disabled?: boolean;
}) => {
  const [logo, setLogo] = useState<ReactNode>(
    <CopyIcon className={cn("h-3 w-3", logoClassName)} />,
  );
  const [internalLabel, setInternalLabel] = useState<ReactNode>(label);
  const onClipboardCopy = () => {
    setLogo(<CheckIcon className={cn("size-3", logoClassName)} />);
    setInternalLabel("Copied!");
    setTimeout(() => {
      setLogo(<CopyIcon className={cn("size-3", logoClassName)} />);
      setInternalLabel(label);
    }, 1000);
  };
  return (
    <button
      aria-label="Copy to clipboard"
      disabled={disabled}
      className={cn(
        "flex items-center gap-2 disabled:cursor-not-allowed disabled:dark:dark:disabled:text-zinc-600",
        buttonClassName,
      )}
      onClick={() => {
        const text = textToCopy();
        navigator.clipboard.writeText(text);
        onClipboardCopy();
      }}
    >
      {logo}
      {internalLabel}
    </button>
  );
};
