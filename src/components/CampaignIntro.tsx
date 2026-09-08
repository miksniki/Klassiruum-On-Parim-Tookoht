// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Nikita Mikson and contributors
import { Icon } from "./Icon";

export function CampaignIntro() {
  return (
    <section className="campaign-intro" aria-labelledby="campaign-title">
      <div className="campaign-date">
        <span /> ÕPETAJANÄDAL · 5.–11. OKTOOBER
      </div>
      <h1 id="campaign-title">
        Klassiruum on
        <br /> <span>parim töökoht</span>
      </h1>
      <p className="campaign-subtitle">
        aga õpetamise kirg vajab tuge, et kesta ja kasvada
      </p>

      <a className="campaign-scroll" href="#fotostuudio">
        <span className="campaign-scroll-label">
          Loo oma õpetajapilt
          <small>Liitu kampaaniaga ja pane end pildile</small>
        </span>
        <span className="campaign-scroll-arrow">
          <Icon name="arrow" size={22} style={{ transform: "rotate(90deg)" }} />
        </span>
      </a>

      <p className="campaign-lead">
        <strong>Rapla Gümnaasium kutsub kõiki Eesti koole</strong> osalema
        üle-eestilises õpetajanädala kampaanias, mis toimub 5.–11. oktoobril.
        Kampaania eesmärk on tuua avalikkuse ette õpetajatöö mitmekülgsus,
        rõõmud ja tähendus, mis sageli jäävad varju õpetajaameti väljakutsete
        kõrval.
      </p>

      <div className="campaign-story">
        <p>
          Eesti haridussüsteemi pinged on tuntavad, kuid õpetajad jätkavad oma
          tööd kire ja pühendumusega. Õpetajanädal pakub võimalust märgata ja
          jagada neid hetki, mis annavad jõudu ja rõõmu – olgu selleks
          inspireerivad kohtumised, õpilaste edusammud või siirad tänusõnad.
        </p>
        <p>
          Rapla Gümnaasium kutsub üles erinevaid ühiskonna gruppe: ettevõtjaid,
          hariduse sõpru, spordiklubisid, pankasid jt liituma kampaaniaga,
          jagama oma lugusid ja toetama õpetajaameti väärtustamist.
        </p>
      </div>
    </section>
  );
}
