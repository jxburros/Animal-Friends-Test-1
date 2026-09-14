// Presentation-only collection: printed rarity, costs, deck limits and rules stay unchanged.
// The first twelve are printed cards (`spec/starter_card_set.json`); the rest are Maker shelf
// cards (`spec/maker_card_set.json`) that have since been given their own commissioned portrait.
// Both render through the same shared face — foil, full-art frame, gallery and reader alike.
export const FULL_ART_CARDS = Object.freeze({
  bb_clover_3: Object.freeze({ number: '01', title: "Clover, Master Botanist", url: new URL('../../assets/art/full-art/bb_clover_3.png', import.meta.url).href }),
  rr_pip_3: Object.freeze({ number: '02', title: "Pip, Chief Archivist", url: new URL('../../assets/art/full-art/rr_pip_3.png', import.meta.url).href }),
  mh_bramble_5: Object.freeze({ number: '03', title: "Bramble, Guild Warden", url: new URL('../../assets/art/full-art/mh_bramble_5.png', import.meta.url).href }),
  mh_russet_4: Object.freeze({ number: '04', title: "Russet, Tea House Keeper", url: new URL('../../assets/art/full-art/mh_russet_4.png', import.meta.url).href }),
  mh_willow_5: Object.freeze({ number: '05', title: "Willow, Harbour Admiral", url: new URL('../../assets/art/full-art/mh_willow_5.png', import.meta.url).href }),
  mh_mortar_5: Object.freeze({ number: '06', title: "Mortar, Master Millwright", url: new URL('../../assets/art/full-art/mh_mortar_5.png', import.meta.url).href }),
  ww_marmalade_3: Object.freeze({ number: '07', title: "Marmalade, Harvest Head Baker", url: new URL('../../assets/art/full-art/ww_marmalade_3.png', import.meta.url).href }),
  ww_inkwell_3: Object.freeze({ number: '08', title: "Inkwell, Keeper of Stories", url: new URL('../../assets/art/full-art/ww_inkwell_3.png', import.meta.url).href }),
  ww_reading_lanterns: Object.freeze({ number: '09', title: "Reading Lanterns", url: new URL('../../assets/art/full-art/ww_reading_lanterns.png', import.meta.url).href }),
  mk_glasshouse_walk: Object.freeze({ number: '10', title: "Glasshouse Walk", url: new URL('../../assets/art/full-art/mk_glasshouse_walk.png', import.meta.url).href }),
  st_curiosity: Object.freeze({ number: '11', title: "Statue of Curiosity", url: new URL('../../assets/art/full-art/st_curiosity.png', import.meta.url).href }),
  dx_hard_winter: Object.freeze({ number: '12', title: "Hard Winter", url: new URL('../../assets/art/full-art/dx_hard_winter.png', import.meta.url).href }),
  mk_peanut_barista_1: Object.freeze({ number: '13', title: "Peanut, Barista", url: new URL('../../assets/art/full-art/mk_peanut_barista_1.png', import.meta.url).href }),
  mk_brooke_balloonist_4: Object.freeze({ number: '14', title: "Brooke, Balloonist", url: new URL('../../assets/art/full-art/mk_brooke_balloonist_4.png', import.meta.url).href }),
  mk_oatmeal_jazz_singer_3: Object.freeze({ number: '15', title: "Oatmeal, Jazz Singer", url: new URL('../../assets/art/full-art/mk_oatmeal_jazz_singer_3.png', import.meta.url).href }),
  mk_betty_firework_maker_3: Object.freeze({ number: '16', title: "Betty, Firework Maker", url: new URL('../../assets/art/full-art/mk_betty_firework_maker_3.png', import.meta.url).href }),
  mk_comet_astronaut_5: Object.freeze({ number: '17', title: "Comet, Astronaut", url: new URL('../../assets/art/full-art/mk_comet_astronaut_5.png', import.meta.url).href }),
  mk_rosabeth_apothecary_3: Object.freeze({ number: '18', title: "Rosabeth, Apothecary", url: new URL('../../assets/art/full-art/mk_rosabeth_apothecary_3.png', import.meta.url).href }),
  mk_copper_market_steward_5: Object.freeze({ number: '19', title: "Copper, Market Steward", url: new URL('../../assets/art/full-art/mk_copper_market_steward_5.png', import.meta.url).href }),
  mk_hazel_merchant_5: Object.freeze({ number: '20', title: "Hazel, Merchant", url: new URL('../../assets/art/full-art/mk_hazel_merchant_5.png', import.meta.url).href }),
  mk_moss_bridgewright_5: Object.freeze({ number: '21', title: "Moss, Bridgewright", url: new URL('../../assets/art/full-art/mk_moss_bridgewright_5.png', import.meta.url).href }),
  mk_maribel_horticulturist_4: Object.freeze({ number: '22', title: "Maribel, Horticulturist", url: new URL('../../assets/art/full-art/mk_maribel_horticulturist_4.png', import.meta.url).href }),
  mk_sota_telescope_fitter_3: Object.freeze({ number: '23', title: "Sota, Telescope Fitter", url: new URL('../../assets/art/full-art/mk_sota_telescope_fitter_3.png', import.meta.url).href }),
  mk_juniper_stargazer_5: Object.freeze({ number: '24', title: "Juniper, Stargazer", url: new URL('../../assets/art/full-art/mk_juniper_stargazer_5.png', import.meta.url).href }),
});

export function fullArtFor(def) {
  return def && Object.hasOwn(FULL_ART_CARDS, def.id) ? FULL_ART_CARDS[def.id] : null;
}

export function fullArtFrameSVG() {
  return `<svg viewBox="0 0 240 400" preserveAspectRatio="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="#e7d2a0" stroke-width=".8"><rect x="4" y="4" width="232" height="392" rx="11"/><path d="M10 39V19Q10 10 19 10H49 M191 10H221Q230 10 230 19V39 M10 361V381Q10 390 19 390H49 M191 390H221Q230 390 230 381V361"/><path d="M62 6H105L120 11L135 6H178 M62 394H105L120 389L135 394H178"/></g><g fill="#f5e5bb"><path d="M120 4l3 3-3 3-3-3z M120 390l3 3-3 3-3-3z"/></g></svg>`;
}
