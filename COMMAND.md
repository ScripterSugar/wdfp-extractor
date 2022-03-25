Supported commands are like below:

## Usage: animate [option]

### Options:
-character <characterId>    Specify characterId you want to create animation for.

### Example:
animate -character combat_animal

Crop normal/special sprite sheet of specific character and create animated gif of it. characterId is dev id of specific character, for example characterId of fluffy is combat_animal.


## Usage: sprite [option] [assetpath]

### Options:
-scale <ratio>              Specify scale ratio of cropped sprite images. default to 1.
-eliyabot                   Set this flag if you want to extract equipment sprites from item/sprite_sheet specially formatted for eliyabot asset format.

### Example:
sprite -scale 4 -eliyabot item/sprite_sheet
sprite -scale 16 character/battle_maid_xm19/pixelart/sprite_sheet

Crop sprites and scale cropped images to the specified ratio.


## Usage: exboost

Extract and create odds summary json for exboost odds table [JP Only]


## Usage: search [assetpath]

### Example:
search master/ex_boost/odds/ability/alterite_r3_a

Search the asset hash and file formats if anything matches your path query. Useful if you want to find hidden master table files or assets.


## Usage: master [assetpath]

### Example:
master master/ex_boost/odds/ability/alterite_r3_a.orderedmap

Rename, decompile and export master table (orderedmap) asset from assetpath to output/master directory


## Usage: image [assetpath]

### Example:
image item/sprite_sheet.png

Rename, decompile and export image asset from assetpath to output/asset directory.


## Usage: audio [assetpath]

### Example:
audio bgm/common/encyclopedia.mp3

Rename, decompile and export image asset from assetpath to output/asset directory.


## Usage: general [assetpath]

### Example:
general battle/action/skill/action/rare5/hero_girl_vt22$hero_girl_vt22_2.action.dsl.amf3.deflate

Rename, decompile and export general asset from assetpath to output/asset directory. (Automatically converts amf3 into json file format.)
