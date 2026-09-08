// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Nikita Mikson and contributors
import { useRef, useState } from "react";
import { Icon } from "./Icon";
export function PhotoUpload({
  onUpload,
  busy,
  name
}: {
  onUpload: (file: File) => void;
  busy: boolean;
  name?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  return (
    <div
      className={`upload-area ${dragging ? "dragging" : ""} ${name ? "has-photo" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        if (!busy) setDragging(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node))
          setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (!busy && event.dataTransfer.files[0])
          onUpload(event.dataTransfer.files[0]);
      }}
    >
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="Vali portreefoto"
        disabled={busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onUpload(file);
        }}
      />
      <div className="upload-icon">
        <Icon name={name ? "check" : "upload"} size={24} />
      </div>
      <strong>{name ? "Sinu foto on valmis" : "Sinu parim õpetajapilt"}</strong>
      <p>{name ? name : "Lohista oma foto siia või vali seadmest."}</p>
      <button
        className="button button-green"
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        <Icon name={name ? "image" : "upload"} size={17} />
        {name ? "Vali teine foto" : "Vali foto"}
        <Icon name="arrow" size={17} />
      </button>
      <small>JPG, PNG või WebP · kuni 30 MB</small>
    </div>
  );
}
