// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Nikita Mikson and contributors
import { useCallback, useEffect, useRef, useState } from "react";
import { backgrounds } from "./backgrounds";
import {
  DEFAULT_SETTINGS,
  type GlassesStyle,
  type Photo,
  type Settings
} from "./types";
import { Icon, GlassesIcon } from "./components/Icon";
import { PhotoUpload } from "./components/PhotoUpload";
import { CampaignIntro } from "./components/CampaignIntro";
import { ImagePreview, type RenderedImage } from "./components/ImagePreview";
import { processPhoto, validatePhoto } from "./utils/processPhoto";
import { toBlob } from "./utils/canvas";
import "./styles.css";

function Slider({
  label,
  value,
  min,
  max,
  unit = "%",
  onChange,
  disabled = false
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className="slider-label">
      <span>
        {label}
        <output>
          {Math.round(value)}
          {unit}
        </output>
      </span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        style={
          {
            "--range-progress": `${((value - min) / (max - min)) * 100}%`
          } as React.CSSProperties
        }
      />
    </label>
  );
}

export default function App() {
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [background, setBackground] = useState(backgrounds[0]);
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT_SETTINGS });
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [compare, setCompare] = useState(false);
  const [rendered, setRendered] = useState<RenderedImage | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [help, setHelp] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const helpDialog = useRef<HTMLDialogElement>(null);
  const downloadUrls = useRef(new Set<string>());
  useEffect(() => {
    const urls = downloadUrls.current;
    return () => {
      controller.current?.abort();
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);
  useEffect(() => {
    if (help) helpDialog.current?.showModal();
    else helpDialog.current?.close();
  }, [help]);
  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setDownloaded(false);
  };
  const move = useCallback((x: number, y: number) => {
    setSettings((current) => ({
      ...current,
      x: Math.max(-45, Math.min(45, x)),
      y: Math.max(-60, Math.min(30, y))
    }));
    setDownloaded(false);
  }, []);
  const upload = async (file: File) => {
    try {
      validatePhoto(file);
    } catch (err) {
      setError((err as Error).message);
      return;
    }
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setBusy(true);
    setError("");
    setCompare(false);
    setDownloaded(false);
    try {
      const result = await processPhoto(file, current.signal, (message) => {
        if (!current.signal.aborted) setProgress(message);
      });
      if (!current.signal.aborted) {
        setPhoto(result);
        setSettings({ ...DEFAULT_SETTINGS });
      }
    } catch (err) {
      if (!current.signal.aborted)
        setError(
          err instanceof Error
            ? err.message
            : "Foto töötlemine ebaõnnestus. Proovi uuesti."
        );
    } finally {
      if (controller.current === current) setBusy(false);
    }
  };
  const cancel = () => {
    controller.current?.abort();
    controller.current = null;
    setBusy(false);
  };
  const reset = () => {
    cancel();
    setPhoto(null);
    setCompare(false);
    setError("");
    setDownloaded(false);
    setSettings({ ...DEFAULT_SETTINGS });
  };
  const ready =
    !!photo &&
    rendered?.photo === photo &&
    rendered?.settings === settings &&
    rendered?.background === background.src &&
    !busy;
  const download = async () => {
    if (!ready || !rendered) return;
    setDownloading(true);
    setError("");
    try {
      const blob = await toBlob(rendered.canvas);
      const url = URL.createObjectURL(blob);
      downloadUrls.current.add(url);
      const link = document.createElement("a");
      link.href = url;
      link.download = "klassiruum-on-parim-tookoht.png";
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        downloadUrls.current.delete(url);
      }, 60000);
      setDownloaded(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDownloading(false);
    }
  };
  return (
    <>
      <header className="site-header">
        <a
          className="brand"
          href="./"
          aria-label="Klassiruum on parim töökoht, avaleht"
        >
          <span className="brand-mark">
            <Icon name="book" size={24} />
          </span>
          <span>
            KLASSIRUUM<span className="brand-sub">ON PARIM TÖÖKOHT</span>
          </span>
        </a>
        <div className="header-right">
          <button className="help-button" onClick={() => setHelp(true)}>
            Kuidas see töötab?<span>↗</span>
          </button>
        </div>
      </header>
      <main>
        <CampaignIntro />
        <div className="workspace" id="fotostuudio">
          <aside className="controls-panel">
            <section className="control-section">
              <h2>
                <span className="step-number">01</span> Alusta endast{" "}
                <span className="tiny-star">✳</span>
              </h2>
              <PhotoUpload onUpload={upload} busy={busy} name={photo?.name} />
              <p className="photo-tip">
                <Icon name="sparkles" size={15} /> Kõige paremini sobib selge
                otsevaates portree.
              </p>
            </section>
            <section className="control-section">
              <h2>
                <span className="step-number">02</span> Vali oma taust
              </h2>
              <div className="background-options">
                {backgrounds.map((item) => (
                  <button
                    key={item.id}
                    className={`background-option ${background.id === item.id ? "selected" : ""}`}
                    aria-pressed={background.id === item.id}
                    onClick={() => {
                      setBackground(item);
                      setDownloaded(false);
                    }}
                  >
                    <span className="thumbnail">
                      <img src={item.src} alt={item.name} />
                      {background.id === item.id && (
                        <span className="selected-check">
                          <Icon name="check" size={12} />
                        </span>
                      )}
                    </span>
                    <span>{item.short}</span>
                  </button>
                ))}
              </div>
            </section>
            <section className="control-section effects-section">
              <h2>
                <span className="step-number">03</span> Lisa veidi iseloomu{" "}
                <span className="new-badge">LÕBUS OSA</span>
              </h2>
              <fieldset disabled={!photo?.faces.length || busy}>
                <Slider
                  label="Suuremad silmad"
                  value={settings.eyes}
                  min={0}
                  max={100}
                  onChange={(value) => update("eyes", value)}
                />
                <div className="range-captions">
                  <span>Täitsa mina</span>
                  <span>Oi, kui suured!</span>
                </div>
                <div className="field-label">Prillid</div>
                <div className="glasses-options">
                  {(
                    [
                      ["none", "Ilma"],
                      ["round", "Ümarad"],
                      ["square", "Kandilised"],
                      ["sun", "Päikese"]
                    ] as [GlassesStyle, string][]
                  ).map(([style, label]) => (
                    <button
                      key={style}
                      className={`glasses-option ${settings.glasses === style ? "selected" : ""}`}
                      aria-pressed={settings.glasses === style}
                      onClick={() => update("glasses", style)}
                    >
                      <GlassesIcon style={style} />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
                {photo && settings.glasses !== "none" && (
                  <details className="fine-tune">
                    <summary>Säti prillide sobivust</summary>
                    <Slider
                      label="Prillide suurus"
                      value={settings.glassesScale}
                      min={70}
                      max={140}
                      onChange={(value) => update("glassesScale", value)}
                    />
                    <Slider
                      label="Prillide kõrgus"
                      value={settings.glassesY}
                      min={-30}
                      max={30}
                      unit=""
                      onChange={(value) => update("glassesY", value)}
                    />
                  </details>
                )}
              </fieldset>
              {!photo && (
                <p className="muted-note">
                  Efektid ärkavad ellu, kui lisad oma foto.
                </p>
              )}
              {photo?.warning && (
                <p className="warning" role="status">
                  {photo.warning}
                </p>
              )}
            </section>
            {photo && (
              <section className="control-section position-section">
                <h2>
                  <Icon name="move" size={17} /> Sinu koht pildil
                  <button
                    className="text-button"
                    onClick={() =>
                      setSettings((current) => ({
                        ...current,
                        zoom: 100,
                        x: 0,
                        y: 0
                      }))
                    }
                  >
                    Keskele
                  </button>
                </h2>
                <Slider
                  label="Foto suurus"
                  value={settings.zoom}
                  min={50}
                  max={170}
                  onChange={(value) => update("zoom", value)}
                  disabled={busy}
                />
                <details className="fine-tune">
                  <summary>Täpsem paigutus</summary>
                  <Slider
                    label="Vasakule / paremale"
                    value={settings.x}
                    min={-45}
                    max={45}
                    unit=""
                    onChange={(value) => update("x", value)}
                  />
                  <Slider
                    label="Üles / alla"
                    value={settings.y}
                    min={-60}
                    max={30}
                    unit=""
                    onChange={(value) => update("y", value)}
                  />
                </details>
              </section>
            )}
          </aside>
          <section className="preview-panel" aria-label="Pildi eelvaade">
            <div className="photo-frame">
              <div className="tape" aria-hidden="true" />
              <div className="canvas-wrap">
                <ImagePreview
                  photo={photo}
                  settings={settings}
                  background={background.src}
                  compare={compare}
                  onRender={setRendered}
                  onError={setError}
                  onMove={move}
                />
                {!photo && !busy && (
                  <div className="empty-person">
                    <svg viewBox="0 0 240 270" aria-hidden="true">
                      <path d="M71 85c0-68 98-68 98 0 0 70-98 70-98 0Zm-54 177c0-83 29-112 103-112s103 29 103 112" />
                    </svg>
                    <span>
                      Siia tuled sina <span>↗</span>
                    </span>
                  </div>
                )}
                {busy && (
                  <div
                    className="processing-overlay"
                    role="status"
                    aria-live="polite"
                  >
                    <div className="spinner" />
                    <strong>{progress}</strong>
                    <p>
                      Esimesel korral võib see võtta paar minutit.
                      <br />
                      Sinu foto jääb sinu seadmesse.
                    </p>
                    <button className="button button-light" onClick={cancel}>
                      Katkesta
                    </button>
                  </div>
                )}
                <span className="preview-tag">
                  {compare
                    ? "ORIGINAAL"
                    : photo
                      ? "SINU ÕPETAJAPILT"
                      : "SINU FOTO OOTAB SIND"}
                </span>
              </div>
              <div className="photo-caption">
                <span>{background.name}</span>
              </div>
            </div>
            <div className="preview-tools">
              <span>
                <Icon name={photo ? "move" : "image"} size={16} />
                {photo
                  ? "Lohista ennast õigesse kohta"
                  : "Lisa oma foto ja vaata, mis juhtub"}
              </span>
              <button
                className={`compare-button ${compare ? "active" : ""}`}
                disabled={!photo || busy}
                aria-pressed={compare}
                onClick={() => setCompare((value) => !value)}
              >
                <Icon name="eye" size={16} />
                {compare ? "Näita tulemust" : "Vaata originaali"}
              </button>
            </div>
            {error && (
              <div className="error-message" role="alert">
                <span>{error}</span>
                <button
                  aria-label="Sulge veateade"
                  onClick={() => setError("")}
                >
                  <Icon name="close" size={16} />
                </button>
              </div>
            )}
            <div className="download-card">
              <div>
                <h2>Valmis maailmale näitama?</h2>
                <p>
                  {downloaded
                    ? "Pilt on salvestamiseks valmis. Jaga oma õpetajapilti!"
                    : "Sinu uus õpetajapilt. Heas kvaliteedis, hea tujuga."}
                </p>
              </div>
              <button
                className="button button-green download-button"
                disabled={!ready || downloading}
                onClick={download}
              >
                <Icon name={downloaded ? "check" : "download"} size={19} />
                {downloading
                  ? "Salvestame…"
                  : downloaded
                    ? "Laadi uuesti alla"
                    : "Laadi pilt alla"}
                <Icon name="arrow" size={18} />
              </button>
            </div>
            <div className="under-download">
              <span>
                <Icon name="shield" size={15} /> Sinu foto on ainult sinu
                brauseris.
              </span>
              <button
                className="text-button"
                disabled={!photo && !busy}
                onClick={reset}
              >
                <Icon name="reset" size={14} /> Alusta uuesti
              </button>
            </div>
          </section>
        </div>
      </main>
      <footer>
        <span>Üks väike pilt. Üks suur sõnum.</span>
        <strong>#KLASSIRUUMonPARIMtöökoht</strong>
        <span>
          Tehtud õpetajatele, südamega. <span className="footer-heart">♡</span>
        </span>
        <nav className="footer-legal" aria-label="Litsentsid ja lähtekood">
          <a href={`${import.meta.env.BASE_URL}licenses.html`}>
            Litsentsid ja lähtekood
          </a>
        </nav>
      </footer>
      <dialog
        ref={helpDialog}
        aria-labelledby="help-title"
        onCancel={() => setHelp(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setHelp(false);
        }}
      >
        <button
          className="dialog-close"
          aria-label="Sulge juhend"
          onClick={() => setHelp(false)}
        >
          <Icon name="close" />
        </button>
        <span className="eyebrow">VÄIKE JUHEND</span>
        <h2 id="help-title">Kolm sammu. Sinu õpetajapilt.</h2>
        <ol>
          <li>
            <strong>Vali selge portreefoto.</strong> Kõige paremini töötab üks
            inimene, otsevaates ja hea valgusega. Taust eemaldatakse
            automaatselt.
          </li>
          <li>
            <strong>Leia oma iseloom.</strong> Vali taust, suurenda silmi ja
            proovi prille. Lohista inimest pildil või kasuta paigutuse
            liugureid.
          </li>
          <li>
            <strong>Salvesta ja jaga.</strong> Laadi alla 1536 × 1024 PNG-pilt.
          </li>
        </ol>
        <p>
          Foto töötlemine toimub sinu seadmes. Esimesel kasutamisel vajavad
          tööriistad internetti ja nende laadimine võib võtta paar minutit. Kui
          nägu pole hästi näha, saad ikkagi tausta vahetada.
        </p>
        <button className="button button-green" onClick={() => setHelp(false)}>
          Lähme pildile <Icon name="arrow" />
        </button>
      </dialog>
    </>
  );
}
