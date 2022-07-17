# World Filpper Asset Extractor

#### DISCLAIMER: All the rights of extracted assets belong to cygames/citail and/or its affiliates. Do not share the files extracted by the tool. I do not encourage you to use any of extracted assets in inappropriate purpose. If you use any assets extracted by this tool, you do so at your sole risk.

Asset Extraction tool for World Flipper.

This tool extracts the assets from world flipper application installed on your device / emulator using ADB and FFDEC, rename digested file paths with original file path, restore corrupted png and mp3 data, export irregular (amf, orderedmap, etc) files in regular data format such as json.

Currently only supports Global / Japan variants. 

## Installation

Check out the [release page of this repo](https://github.com/ScripterSugar/wdfp-extractor/releases).

## Requirements

Currently only supports Windows (recommended 10 or higher)

#### Pulling from API

Some regions may not be able to call asset download api (For example, KR/CN Ips are banned from JP api server.) If you have trouble pulling assets from API, consider using VPN to call those APIs 

#### Pulling from devices/emulator

Requires [Java 8 or later](https://www.java.com/en/download/) to run FFDEC.

if you're willing to extract assets from real device, your device must be rooted.

## Recommended environments

The tool only tested for limited use cases, thus should have various bugs or even crahses among other enviornments. Basically this tool works best with modified, non-production adbd, which supports adb running as root permission and grants full access to data directory.

To use this tool, your device should at least have file-listing access to the /data directory.

#### General environmental concerns

The tool isnt greatly optimized performance-wise, so your machine's cpu/ram usage may reach very high load while extraction. 

#### Using Emulator
- Nox player (version 7.0.x) - **Recommended (Global)**
- Bluestacks 5 (Not recommended - bad performance due to unabled adbd root access.)

#### Using Real device
- Pixel 2 (Android 11)
- Pixel 4 XL (Android 12)

## Usage

#### Select workspace directory

Select the directory you want to use as workspace directory. Note that your directory must only includes english and dash. I recommend you to use root directory in the disk such as `C:/wafuriextract`

#### Pull Asset from API / Device / Emulator

You need to pull raw asset files from your device/emulator or directly from wdfp api server.

Click on the `Pull/Downlaod Assets` and select the asset source, region variant and pull the assets. Wait until the pulling process is done.

When using your device or emulator, The device must downloaded all the assets from world flipper client.


#### Extract assets

Once you pulled raw assets successfully, click on the `Extract Data` button and select options you want and proceed.

Once the extraction is done, you can find inflated asset files located in the output directory under your extraction directory.

**Do not close the app even if it hangs. The process might hangs a lot and several tasks require more than dozens of minutes. Be patient while extraction is in progress**

## Supported Assets
- APK
- Decompiled SWF
- Master table
- Character image assets
- Character image atlases/frame/parts/timeline (exported as json format)
- Miscellaneous image assets.
- Audio files including BGM, Character voice lines, S/E and more.
- Cropped sprites based on atlases and sprite sheet
- Animated images generated from sprites (Character images only)
- Skill/Action descriptors for characters / bosses / items, including all the details about the skills.
- Summarized Gacha, EX Boost rates table.

## Planned feature
- Support extraction of ability texts
- Data viewer

## Known issues
The library is open to your contribution! if you're having problem with the issues that listed here, feel free to open PRs to resolve it and make other pepople can benefit from your contribution.

- Whitespaces in Windows user name / extraction directory path causing crashes on extraction process. (Due date: TBD)

## Contributing

I won't actively troubleshoot the bugs as far as it works for me, so if you're having trouble using the tool on your side, in most cases you'll have to fix the problem yourself, or at least provide me all the details about your environments, runtime context, ETC. Please include all the details when you open issue here. Also feel free to open any PR.

If you want more asset coverage added to tool, please provide the details about assets you want to export, including file formats, asset path, format of data, etc.

The application built from the [electron-react-boilerplate](https://github.com/electron-react-boilerplate/electron-react-boilerplate). Refer to the repository to check how to install dependencies and start development on your local machine.




