import { cn } from "@utils/stringUtils";
import { CheckIcon, CopyIcon } from "lucide-react";
import { ReactNode, useState } from "react";
import { Button } from "./button/button";

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
    <CopyIcon className={cn("nsv:size-3", logoClassName)} />,
  );
  const [internalLabel, setInternalLabel] = useState<ReactNode>(label);
  const onClipboardCopy = () => {
    setLogo(<CheckIcon className={cn("nsv:size-3", logoClassName)} />);
    setTimeout(() => {
      setLogo(<CopyIcon className={cn("nsv:size-3", logoClassName)} />);
      setInternalLabel(label);
    }, 1000);
  };
  return (
    <Button
      aria-label="Copy to clipboard"
      size="xs"
      disabled={disabled}
      className={cn(
        "nsv:flex nsv:items-center nsv:gap-2 nsv:p-0! nsv:disabled:cursor-not-allowed nsv:dark:disabled:text-zinc-600",
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
    </Button>
  );
};
