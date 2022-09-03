<img width="739" alt="image" src="https://user-images.githubusercontent.com/19164553/160076501-bae10b89-a610-4d17-a340-0d7c0dafa337.png">


Supported commands are like below:

## animate [option]

Crop normal/special sprite sheet of specific character and create animated gif of it. characterId is dev id of specific character, for example characterId of fluffy is combat_animal.

#### Options:
**-character \<characterId\>**    Specify characterId you want to create animation for.

#### Example:
animate -character combat_animal


## sprite [option] [assetpath]

Crop sprites and scale cropped images to the specified ratio.

#### Options:
**-scale \<ratio\>**              Specify scale ratio of cropped sprite images. default to 1. 

**-delta \<deltaVer\>**           Specify target delta version to change work directory to that delta directory.

**-eliyabot**                   Set this flag if you want to extract equipment sprites from item/sprite_sheet specially formatted for eliyabot asset format.

#### Example:
sprite -scale 4 -eliyabot item/sprite_sheet

sprite -scale 16 character/battle_maid_xm19/pixelart/sprite_sheet


## search [assetpath]

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


