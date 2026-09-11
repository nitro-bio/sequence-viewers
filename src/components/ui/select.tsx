"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@utils/stringUtils";

const Select = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "nsv:flex nsv:h-4 nsv:w-full nsv:items-center nsv:justify-between nsv:rounded-md nsv:bg-transparent nsv:py-2 nsv:pr-2 nsv:text-[0.75rem]/[1rem] nsv:whitespace-nowrap nsv:focus:[outline:1px_solid_currentColor] nsv:disabled:cursor-not-allowed nsv:disabled:opacity-50 nsv:[&>span]:line-clamp-1",

      className,
    )}
    {...props}
  >
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="nsv:text-sequences-foreground nsv:mr-1 nsv:h-4 nsv:w-4 nsv:opacity-50" />
    </SelectPrimitive.Icon>

    {children}
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      "nsv:flex nsv:cursor-default nsv:items-center nsv:justify-center nsv:py-1",
      className,
    )}
    {...props}
  >
    <ChevronUp className="nsv:h-4 nsv:w-4" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      "nsv:flex nsv:cursor-default nsv:items-center nsv:justify-center nsv:py-1",
      className,
    )}
    {...props}
  >
    <ChevronDown className="nsv:h-4 nsv:w-4" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "nsv-portal nsv:data-[state=open]:animate-in nsv:data-[state=closed]:animate-out nsv:data-[state=closed]:fade-out-0 nsv:data-[state=open]:fade-in-0 nsv:data-[state=closed]:zoom-out-95 nsv:data-[state=open]:zoom-in-95 nsv:data-[side=bottom]:slide-in-from-top-2 nsv:data-[side=left]:slide-in-from-right-2 nsv:data-[side=right]:slide-in-from-left-2 nsv:data-[side=top]:slide-in-from-bottom-2 nsv:relative nsv:z-50 nsv:max-h-96 nsv:min-w-32 nsv:overflow-hidden nsv:rounded-md nsv:[border-width:1px] nsv:[box-shadow:0_4px_6px_-1px_rgb(0_0_0/0.1),0_2px_4px_-2px_rgb(0_0_0/0.1)]",
        position === "popper" &&
          "nsv:data-[side=bottom]:[translate:0_0.25rem] nsv:data-[side=left]:[translate:-0.25rem_0] nsv:data-[side=right]:[translate:0.25rem_0] nsv:data-[side=top]:[translate:0_-0.25rem]",
        className,
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          "nsv:p-1",
          position === "popper" &&
            "nsv:h-(--radix-select-trigger-height) nsv:w-full nsv:min-w-(--radix-select-trigger-width)",
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn(
      "nsv:px-2 nsv:py-1.5 nsv:text-[0.875rem]/[1.25rem] nsv:[font-weight:600]",
      className,
    )}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "nsv:relative nsv:flex nsv:w-full nsv:cursor-default nsv:items-center nsv:rounded-sm nsv:py-1.5 nsv:pr-8 nsv:pl-2 nsv:text-[0.875rem]/[1.25rem] nsv:[outline-style:none] nsv:select-none nsv:data-disabled:pointer-events-none nsv:data-disabled:opacity-50",
      className,
    )}
    {...props}
  >
    <span className="nsv:absolute nsv:right-2 nsv:flex nsv:h-3.5 nsv:w-3.5 nsv:items-center nsv:justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="nsv:h-4 nsv:w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn(
      "nsv:bg-sequences-background nsv:-mx-1 nsv:my-1 nsv:h-px",
      className,
    )}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
