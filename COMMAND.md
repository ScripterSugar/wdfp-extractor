<img width="739" alt="image" src="https://user-images.githubusercontent.com/19164553/160076501-bae10b89-a610-4d17-a340-0d7c0dafa337.png">


Supported commands are like below:

## animate [option]

Crop normal/special sprite sheet of specific character and create animated gif of it. characterId is dev id of specific character, for example characterId of fluffy is combat_animal.

If you want to generate animated GIF of boss monsters (as in battle/boss/*), use the animateBoss command instead

#### Options:
**-character \<characterId\>**    Specify characterId you want to create animation for. Either this or general argument is required.

**-general \<path_to_sprite\>**   Specify path to the sprite_sheet you want to generate animated GIFs based on timeline/atlas file located along with the sprite. Either this or character argument is required.

**-scale \<ratio\>**              Specify scale of generated GIF. default to 1.

**-sheetName \<sheetName\>**      Specify name of the sprite sheet png file in the target directory. Default to "sprite_sheet".

**-atlasName \<atlasName\>**      Specify name of the *.atlas.json file in the target directory. Default to "sprite_sheet".

**-timelineName \<timeline\>**    Specify name of the *.timeline.json file in the target directory. Default to "pixelart".

**-metaName \<metaName\>**        Specify name of the sprite_sheet, atlas, timeline name at the same time, if they're all same.


#### Example:
animate -character combat_animal

animate -general character/big_bear_monster_light/pixelart -scale 2



## animateBoss [option]

Create animated gif based on specific sprite_sheet with .parts / .timeline / .atlas file. .parts file is required to execute this command.

If you want to generate animated GIF of common characters (as in character/*), use the animate command instead

#### Options:
**-sprite \<path_to_sprite\>**    Specify path to the sprite_sheet you want to generate animated GIFs based on parts file located along with the sprite. Required.

**-scale \<ratio\>**              Specify scale of generated GIF. default to 1.

**-meta \<partsName\>**           Specify name root of the parts/timeline/atlas file, if you'd like to pick just one. if this is not specified, command will target all the parts file that is found within target directory.

**-merge**                        If this flag is set, while generating GIFs, tool will try to merge same group of GIFs into a single GIF, such as `skill_start1, skill_charge1, skill_attack1, skill_attack_loop1, skill_attack_end1`

**-frameMs \<milliseconds\>**     Specify the time span of a single frame, in milliseconds. Default to 16 (60 frames in one second)

**-mergeLoopAmount \<int\>**      While merging, loop animations will loop number of times as specified. Default to 8.

**-mergeChargeAmount \<int\>**    While merging, charge animations will loop number of times as specified. Default to 3.


#### Example:
animateBoss -sprite battle/boss/maou_2nd/maou_2nd -scale 2 -merge

animateBoss -meta high_epuration_boss_3anv -sprite battle/boss/high_epuration_boss_3anv/high_epuration_boss_3anv -scale 4 -merge


## sprite [option] [assetpath]

Crop sprites and scale cropped images to the specified ratio.

#### Options:
**-scale \<ratio\>**              Specify scale ratio of cropped sprite images. default to 1. 

**-delta \<deltaVer\>**           Specify target delta version to change work directory to that delta directory.

**-eliyabot**                   Set this flag if you want to extract equipment sprites from item/sprite_sheet specially formatted for eliyabot asset format.

#### Example:
sprite -delta 1.570.21 -scale 4 -eliyabot item/sprite_sheet

sprite -scale 16 character/battle_maid_xm19/pixelart/sprite_sheet


## search [assetpath]
**-format \<.fileformat1|.fileformat2|...\>**
**-ff \<.fileformat1|.fileformat2|...\>**              Specify file formats to be used within format search.

**-extract**
**-e**           If found, proceed to extract the asset found by path query.

Search the asset hash and file formats if anything matches your path query. Useful if you want to find hidden master table files or assets.

#### Example:
search master/ex_boost/odds/ability/alterite_r3_a


## master [assetpath]

Rename, decompile and export master table (orderedmap) asset from assetpath to output/orderedmap directory

#### Example:
master master/ex_boost/odds/ability/alterite_r3_a.orderedmap


## image [assetpath]

Rename, decompile and export image asset from assetpath to output/asset directory.

#### Example:
image item/sprite_sheet.png


## audio [assetpath]

Rename, decompile and export image asset from assetpath to output/asset directory.

#### Example:
audio bgm/common/encyclopedia.mp3


## general [assetpath]

Rename, decompile and export general asset from assetpath to output/asset directory. (Automatically converts amf3 into json file format.)

#### Example:
general battle/action/skill/action/rare5/hero_girl_vt22$hero_girl_vt22_2.action.dsl.amf3.deflate


## enemyDsl [assetpath]

search for the path if .esdl file exist. if exist, export all related assets with found .esdl file.

#### Example:
master master/ex_boost/odds/ability/alterite_r3_a.orderedmap


## exboost

Extract and create odds summary json for exboost odds table [JP Only]

## fetchAssets [baseVersion]

Fetch assets from JP asset api server, using baseVersion as client asset version header.

#### Example:
fetchAssets 1.531.10

## character [characterId]

Force search for specific [characterId] assets and export them if exists. This command is useful if there's any character assets whose characterId isn't documented in character master table files yet.

#### Example:
character kyaru

## checkUnknowns [option]

Search and export images files u failed to recover hashes. (WARNING: do not run this command if u have unexported set of images, such as when u only exported character images but general image assets. these unexported set of images will be recognized as unknown images.)

Exported images are saved under [delta-assetVersion if exists, or workspace root]/output/assets/unknown/images

#### Options:
**-delta \<targetAssetVersion\>**              Specify target delta asset version if u need to search for specific delta directory. (Available for only those versions u exported with delta-extraction mode)

#### Example:
checkUnknowns

checkUnknowns -delta 1.532.20


