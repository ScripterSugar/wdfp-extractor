# World Filpper Asset Extractor FAQs

These Frequantly asked quetions have been taken from Guthub Issues and other comments made from the commmunity.

📝 Controbutions to this documentation are encouraged.

## Q: What operating Systems are currently supported for this tool?

Currently, only Windows is supported. (recommended 10 or higher)

## Q: Why is extracting assets from my real device not working?

Althought there may be other reasons, the most common issue is becuase your device is not rooted.

## Q: Where do I find the 5 Element Icons?

These assets can be found in the sprite sheet `output\assets\scene\general\sprite_sheet_minimal.png` and in the folder `output\assets\scene\general\sprite_sheet\vector_icon_color-assets`.

## Q: Why don't I have the `output\assets\scene\general` folder after extracting?

Some assets, especially those with prefix `scene/general`, are not downloadable through asset API and they're shipped with APK itself (/assets/bundle.zip). The tool's already built to search for those assets (more likely to, if you have full swf scripts decompiled), and if its not found on your end, you need to either pull assets directly from your device using the tool or manually extract them from APK and put it to `dump/` directory along with other asset dumps.

So if you want to extract those assets manually, follow the next steps.

1. Unpack application APK file.

2. Locate the bundled assets saved in `PATH_TO_UNPACKED_APK/assets/bundle.zip.`

3. Unzip it.

4. Copy all the contents inside `bundle.zip/production/bundle` `bundle.zip/production/medium_bundle` into `WORK_DIRECTORY/dump/upload`. WORK_DIR is the Extraction Directory you selected from the tool. (Make sure copied raw asset file paths are look like `WORK_DIR/dump/upload/73/4130924e07d945ae79acac1599758c4e50c432`)

5. Open `WORK_DIR/metadata.json` file and modify the key `lockedHashMap` value to `false`.

    5.1. If you want to confirm everything was done correctly, try executing the command `image scene/general/sprite_sheet.png`. If that command successfully exports the designated asset then you're good to go.

6. Try extracting assets again.

If you can't still find assets after 6 but command in 5.1 works, make sure you turned on the `Search ActionScripts for assets` option and put all the decompiled SWF scripts in the right location. or you can try manually extract them one by one using commands. note that the paths you mentioned above are generated paths and they're actually included in one same sprite file named `scene/general/sprite_sheet` so you'd want to run sprite `scene/general/sprite_sheet` command to crop the image and save cropped sprite to designated path.

