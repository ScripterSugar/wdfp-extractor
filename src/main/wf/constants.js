export const ELIGIBLE_PATH_PREFIXES = ['dump/upload/', 'dump/medium_upload/'];

export const MERGEABLE_PATH_PREFIXES = [
  'dump/android_upload/',
  'dump/android_small_upload/',
  'dump/android_medium_upload/',
  'dump/bundle/',
  'dump/medium_bundle/',
  'dump/small_bundle/',
];

export const CHARACTER_SPRITE_PRESETS = [
  (character, index) => `character/${character}/pixelart/sprite_sheet`,
  (character, index) => `character/${character}/pixelart/special_sprite_sheet`,
  (character, index) => `character/${character}/pixelart/special`,
  (character, index) => `character/${character}/ui/skill_cutin_${index}`,
  (character, index) => `character/${character}/ui/cutin_skill_chain_${index}`,
  (character, index) => `character/${character}/pixelart/pixelart`,
  (character, index) => `character/${character}/ui/thumb_party_unison_${index}`,
  (character, index) => `character/${character}/ui/thumb_party_main_${index}`,
  (character, index) =>
    `character/${character}/ui/battle_member_status_${index}`,
  (character, index) => `character/${character}/ui/thumb_level_up_${index}`,
  (character, index) => `character/${character}/ui/square_${index}`,
  (character, index) => `character/${character}/ui/square_132_132_${index}`,
  (character, index) =>
    `character/${character}/ui/square_round_136_136_${index}`,
  (character, index) => `character/${character}/ui/square_round_95_95_${index}`,
  (character, index) =>
    `character/${character}/ui/battle_member_status_${index}`,
  (character, index) => `character/${character}/ui/episode_banner_0`,
  (character, index) =>
    `character/${character}/ui/battle_control_board_${index}`,
  (character, index) =>
    `character/${character}/battle/character_detail_skill_preview`,
  (character, index) =>
    `character/${character}/ui/illustration_setting_sprite_sheet`,
  (character, index) =>
    `character/${character}/battle/character_info_skill_preview`,
  (character, index) =>
    `character/${character}/ui/full_shot_1440_1920_${index}`,
  (character, index) =>
    `character/${character}/ui/full_shot_illustration_setting_${index}`,
];

export const NOX_PORT_LIST = [62001, 62025];
export const DATEFORMAT_A = 'YYYY-MM-DD HH:mm';
