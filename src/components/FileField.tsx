"use client";

import React, { useId, useState } from "react";

type FileFieldProps = {
  id?: string;
  name: string;
  accept?: string;
  buttonText?: string;
  className?: string;
};

export default function FileField({
  id,
  name,
  accept,
  buttonText = "Choose File",
  className = "",
}: FileFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <div className={className}>
      <input
        id={inputId}
        name={name}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          const f = e.target.files && e.target.files[0];
          setFileName(f ? f.name : null);
        }}
      />
      <label
        htmlFor={inputId}
        className="inline-flex items-center rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer"
      >
        {buttonText}
      </label>
      {fileName ? (
        <span className="ml-2 text-sm text-neutral-600 dark:text-neutral-300 break-all">
          {fileName}
        </span>
      ) : null}
    </div>
  );
}
