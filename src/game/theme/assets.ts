export const ATLAS = {
  key: 'evil-forest-atlas',
  imagePng: 'assets/theme/atlas.png',
  imageWebp: 'assets/theme/atlas.webp',
  data: 'assets/theme/atlas.json',
} as const

export const IMAGE_KEYS = {
  bgFar: 'evil-bg-far',
  bgMid: 'evil-bg-mid',
  bgNear: 'evil-bg-near',
  fog: 'evil-fog',
  ground: 'evil-ground',
  vignette: 'evil-vignette',
} as const

export const IMAGE_PATHS = {
  [IMAGE_KEYS.bgFar]: 'assets/theme/bg_far.svg',
  [IMAGE_KEYS.bgMid]: 'assets/theme/bg_mid.svg',
  [IMAGE_KEYS.bgNear]: 'assets/theme/bg_near.svg',
  [IMAGE_KEYS.fog]: 'assets/theme/fog_tile.svg',
  [IMAGE_KEYS.ground]: 'assets/theme/ground.svg',
  [IMAGE_KEYS.vignette]: 'assets/theme/vignette.svg',
} as const

export const FRAMES = {
  crowIdle: 'crow_idle',
  crowDead: 'crow_dead',
  crowGlow: 'crow_glow',
  crowFlap: ['crow_flap_0', 'crow_flap_1', 'crow_flap_2', 'crow_flap_3'],
  obstaclesTop: ['gate_top_0', 'gate_top_1', 'gate_top_2'],
  obstaclesBottom: ['gate_bottom_0', 'gate_bottom_1', 'gate_bottom_2'],
  panelLarge: 'ui_panel_large',
  panelSmall: 'ui_panel_small',
  button: 'ui_button',
  scoreFrame: 'ui_score_frame',
  medalBronze: 'medal_bronze',
  medalSilver: 'medal_silver',
  medalGold: 'medal_gold',
  medalVoid: 'medal_void',
  iconRestart: 'icon_restart',
  iconMuteOn: 'icon_mute_on',
  iconMuteOff: 'icon_mute_off',
  iconMotionOn: 'icon_motion_on',
  iconMotionOff: 'icon_motion_off',
  particleEmber: 'particle_ember',
  particleDust: 'particle_dust',
  particleLeaf: 'particle_leaf',
} as const
