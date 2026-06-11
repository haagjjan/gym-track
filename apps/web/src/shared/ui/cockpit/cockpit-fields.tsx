"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { useState } from "react";
import { cockpitClassNames } from "./cockpit-utils";

type CockpitInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "type"> & {
  error?: string | undefined;
  hint?: ReactNode | undefined;
  id: string;
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
  label: ReactNode;
};

type CockpitCheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "type"> & {
  error?: string | undefined;
  hint?: ReactNode | undefined;
  id: string;
  label: ReactNode;
};

export function CockpitTextInput(props: CockpitInputProps): ReactNode {
  return <CockpitInput type="text" {...props} />;
}

export function CockpitNumberInput(props: CockpitInputProps): ReactNode {
  return <CockpitInput inputMode="decimal" type="number" {...props} />;
}

export function CockpitSearchInput(props: CockpitInputProps): ReactNode {
  return <CockpitInput type="search" {...props} />;
}

export function CockpitPasswordInput(props: CockpitInputProps): ReactNode {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="cockpitPasswordField">
      <CockpitInput type={isVisible ? "text" : "password"} {...props} />
      <button
        className="cockpitPasswordField__toggle"
        type="button"
        aria-label={isVisible ? "Hide access code" : "Show access code"}
        onClick={() => setIsVisible((current) => !current)}
      >
        {isVisible ? "HIDE" : "SHOW"}
      </button>
    </div>
  );
}

export function CockpitCheckbox({
  className,
  error,
  hint,
  id,
  label,
  ...props
}: CockpitCheckboxProps): ReactNode {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={cockpitClassNames("cockpitCheckboxField", className)}>
      <label className="cockpitCheckboxField__control" htmlFor={id}>
        <input
          aria-describedby={cockpitClassNames(hintId, errorId) || undefined}
          aria-invalid={error ? "true" : "false"}
          id={id}
          type="checkbox"
          {...props}
        />
        <span>{label}</span>
      </label>
      {hint ? <span id={hintId} className="cockpitField__hint">{hint}</span> : null}
      {error ? <span id={errorId} className="cockpitField__error">{error}</span> : null}
    </div>
  );
}

interface InternalInputProps extends CockpitInputProps {
  type: "number" | "password" | "search" | "text";
}

function CockpitInput({
  className,
  error,
  hint,
  id,
  label,
  type,
  ...props
}: InternalInputProps): ReactNode {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <label className={cockpitClassNames("cockpitField", className)} htmlFor={id}>
      <span className="cockpitField__label">{label}</span>
      <input
        aria-describedby={cockpitClassNames(hintId, errorId) || undefined}
        aria-invalid={error ? "true" : "false"}
        className="cockpitField__input"
        id={id}
        type={type}
        {...props}
      />
      {hint ? <span id={hintId} className="cockpitField__hint">{hint}</span> : null}
      {error ? <span id={errorId} className="cockpitField__error">{error}</span> : null}
    </label>
  );
}
