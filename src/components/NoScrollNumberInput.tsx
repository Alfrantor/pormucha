"use client";

import React from "react";

type NoScrollNumberInputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function NoScrollNumberInput(props: NoScrollNumberInputProps) {
  return (
    <input
      {...props}
      type="number"
      onWheel={(event) => {
        event.currentTarget.blur();
        props.onWheel?.(event);
      }}
    />
  );
}
