export const ELIGIBLE_PATH_PREFIXES = [
  'dump/upload/',
  'dump/medium_upload/',
  'dump/small_upload',
];

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
  (character) => `character/${character}/ui/story/anger`,
  (character) => `character/${character}/ui/story/anger_b`,
  (character) => `character/${character}/ui/story/anger_c`,
  (character) => `character/${character}/ui/story/anger_d`,
  (character) => `character/${character}/ui/story/anger_e`,
  (character) => `character/${character}/ui/story/anger_f`,
  (character) => `character/${character}/ui/story/base_0`,
  (character) => `character/${character}/ui/story/base_0_b`,
  (character) => `character/${character}/ui/story/base_0_c`,
  (character) => `character/${character}/ui/story/base_0_d`,
  (character) => `character/${character}/ui/story/base_0_e`,
  (character) => `character/${character}/ui/story/base_0_f`,
  (character) => `character/${character}/ui/story/base_1`,
  (character) => `character/${character}/ui/story/base_1_b`,
  (character) => `character/${character}/ui/story/base_1_c`,
  (character) => `character/${character}/ui/story/base_1_d`,
  (character) => `character/${character}/ui/story/base_1_e`,
  (character) => `character/${character}/ui/story/base_1_f`,
  (character) => `character/${character}/ui/story/normal`,
  (character) => `character/${character}/ui/story/normal_b`,
  (character) => `character/${character}/ui/story/normal_c`,
  (character) => `character/${character}/ui/story/normal_d`,
  (character) => `character/${character}/ui/story/normal_e`,
  (character) => `character/${character}/ui/story/normal_f`,
  (character) => `character/${character}/ui/story/sad`,
  (character) => `character/${character}/ui/story/sad_b`,
  (character) => `character/${character}/ui/story/sad_c`,
  (character) => `character/${character}/ui/story/sad_d`,
  (character) => `character/${character}/ui/story/sad_e`,
  (character) => `character/${character}/ui/story/sad_f`,
  (character) => `character/${character}/ui/story/serious`,
  (character) => `character/${character}/ui/story/serious_b`,
  (character) => `character/${character}/ui/story/serious_c`,
  (character) => `character/${character}/ui/story/serious_d`,
  (character) => `character/${character}/ui/story/serious_e`,
  (character) => `character/${character}/ui/story/serious_f`,
  (character) => `character/${character}/ui/story/shame`,
  (character) => `character/${character}/ui/story/shame_b`,
  (character) => `character/${character}/ui/story/shame_c`,
  (character) => `character/${character}/ui/story/shame_d`,
  (character) => `character/${character}/ui/story/shame_e`,
  (character) => `character/${character}/ui/story/shame_f`,
  (character) => `character/${character}/ui/story/shout`,
  (character) => `character/${character}/ui/story/shout_b`,
  (character) => `character/${character}/ui/story/shout_c`,
  (character) => `character/${character}/ui/story/shout_d`,
  (character) => `character/${character}/ui/story/shout_e`,
  (character) => `character/${character}/ui/story/shout_f`,
  (character) => `character/${character}/ui/story/smile`,
  (character) => `character/${character}/ui/story/smile_b`,
  (character) => `character/${character}/ui/story/smile_c`,
  (character) => `character/${character}/ui/story/smile_d`,
  (character) => `character/${character}/ui/story/smile_e`,
  (character) => `character/${character}/ui/story/smile_f`,
  (character) => `character/${character}/ui/story/surprise`,
  (character) => `character/${character}/ui/story/surprise_b`,
  (character) => `character/${character}/ui/story/surprise_c`,
  (character) => `character/${character}/ui/story/surprise_d`,
  (character) => `character/${character}/ui/story/surprise_e`,
  (character) => `character/${character}/ui/story/surprise_f`,
  (character) => `character/${character}/ui/story/sweat`,
  (character) => `character/${character}/ui/story/sweat_b`,
  (character) => `character/${character}/ui/story/sweat_c`,
  (character) => `character/${character}/ui/story/sweat_d`,
  (character) => `character/${character}/ui/story/sweat_e`,
  (character) => `character/${character}/ui/story/sweat_f`,
  (character) => `character/${character}/ui/story/think`,
  (character) => `character/${character}/ui/story/think_b`,
  (character) => `character/${character}/ui/story/think_c`,
  (character) => `character/${character}/ui/story/think_d`,
  (character) => `character/${character}/ui/story/think_e`,
  (character) => `character/${character}/ui/story/think_f`,
  (character) => `character/${character}/ui/story/vigilant`,
  (character) => `character/${character}/ui/story/vigilant_b`,
  (character) => `character/${character}/ui/story/vigilant_c`,
  (character) => `character/${character}/ui/story/vigilant_d`,
  (character) => `character/${character}/ui/story/vigilant_e`,
  (character) => `character/${character}/ui/story/vigilant_f`,
];

export const CHARACTER_AMF_PRESERTS = [
  (character) => `character/${character}/pixelart/pixelart.frame.amf3.deflate`,
  (character) =>
    `character/${character}/pixelart/sprite_sheet.parts.amf3.deflate`,
  (character) =>
    `character/${character}/pixelart/pixelart.timeline.amf3.deflate`,
  (character) => `character/${character}/pixelart/special.frame.amf3.deflate`,
  (character) =>
    `character/${character}/pixelart/special_sprite_sheet.parts.amf3.deflate`,
  (character) =>
    `character/${character}/pixelart/special.timeline.amf3.deflate`,
  (character) =>
    `character/${character}/pixelart/special_sprite_sheet.atlas.amf3.deflate`,
  (character) =>
    `character/${character}/pixelart/sprite_sheet.atlas.amf3.deflate`,
];

export const POSSIBLE_PATH_REGEX = /[.$a-zA-Z_0-9]+?\/[.$a-zA-Z_0-9\/]+/g;

export const CHARACTER_VOICE_PRESETS = [
  (character) => `character/${character}/voice/ally/evolution.mp3`,
  (character) => `character/${character}/voice/ally/join.mp3`,
  (character) => `character/${character}/voice/battle/battle_start_0.mp3`,
  (character) => `character/${character}/voice/battle/battle_start_1.mp3`,
  (character) => `character/${character}/voice/battle/outhole_0.mp3`,
  (character) => `character/${character}/voice/battle/outhole_1.mp3`,
  (character) => `character/${character}/voice/battle/power_flip_0.mp3`,
  (character) => `character/${character}/voice/battle/power_flip_1.mp3`,
  (character) => `character/${character}/voice/battle/skill_0.mp3`,
  (character) => `character/${character}/voice/battle/skill_1.mp3`,
  (character) => `character/${character}/voice/battle/skill_ready.mp3`,
  (character) => `character/${character}/voice/battle/win_0.mp3`,
  (character) => `character/${character}/voice/battle/win_1.mp3`,
];

export const NOX_PORT_LIST = [62001, 62025];
export const DATEFORMAT_A = 'YYYY-MM-DD HH:mm';
