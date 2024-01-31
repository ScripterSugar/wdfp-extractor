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

export const ANIMATION_COMMON_POSTFIXES = [
  'start',
  'charge',
  'fire',
  'attack',
  'loop',
  'set',
  'end',
  'start1',
  'charge1',
  'fire1',
  'attack1',
  'loop1',
  'set1',
  'end1',
  'start2',
  'charge2',
  'fire2',
  'attack2',
  'loop2',
  'set2',
  'end2',
  'start3',
  'charge3',
  'fire3',
  'attack3',
  'loop3',
  'set3',
  'end3',
  'start4',
  'charge4',
  'fire4',
  'attack4',
  'loop4',
  'set4',
  'end4',
  'start5',
  'charge5',
  'fire5',
  'attack5',
  'loop5',
  'set5',
  'end5',
];

export const ACTION_DSL_FORMAT_DEFLATE = '.action.dsl.amf3.deflate';
export const ENEMY_DSL_FORMAT_DEFLATE = '.esdl.amf3.deflate';

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

export const BASE_ODD_MAP = {
  3: 0.7,
  4: 0.25,
  5: 0.05,
};

export const POSSIBLE_PATH_REGEX = /[.$a-zA-Z_0-9-]+?\/[.$a-zA-Z_0-9/-]+/g;

export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

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

export const COMMON_FILE_FORMAT = [".php",".html",".txt",".htm",".aspx",".asp",".js",".css",".pgsql.txt",".mysql.txt",".pdf",".cgi",".inc",".gif",".jpg",".swf",".xml",".cfm",".xhtml",".wmv",".zip",".axd",".gz",".png",".doc",".shtml",".jsp",".ico",".exe",".csi",".inc.php",".config",".jpeg",".ashx",".log",".tar",".ini",".asa",".tgz",".PDF",".flv.bak",".rar",".asmx",".xlsx",".page",".phtml",".dll",".JPG",".asax.msg",".pl",".GIF",".ZIP",".csv",".nsf",".Pdf",".Gif",".bmp",".sql",".Jpeg",".Jpg",".xml.gz",".Zip",".new",".avi",".psd",".rss.wav",".action",".db",".dat",".do",".xsl",".class",".mdb",".include.cs",".class.php",".htc",".mov",".tpl.js.php",".mpg",".rdf",".rtf.ascx",".mvc.files",".master",".jar",".fla",".require",".de",".docx.wci",".readme.cfg",".aspx.cs",".cfc",".dwt",".ru",".LCK",".Config",".gif_var_DE",".net",".ttf",".HTM",".X-AOM",".jhtml",".mpeg",".ASP",".LOG",".vcf",".X-RMA",".X-OFFERS",".X-FCOMP",".X-GIFTREG",".X-PCONF",".X-SURVEY",".tif",".dir",".json.Zif",".wma.mid",".rm",".aspx.vb",".tar.gz",".woa",".main",".ram",".feed",".lasso.shtm",".sitemap",".scc",".tmp",".backup",".sln",".org",".conf",".uk",".TXT",".orig",".kml",".lck",".pps",".asx",".bok",".msi.c",".fcgi",".fopen",".html.",".bin",".htaccess",".info",".java",".jsf",".tmpl",".DOC",".bat",".com.html",".print",".resx",".ics",".php.php",".x",".PNG",".data",".dcr",".enfinity",".html.html",".licx",".mno",".plx",".vm",".dwg",".edu",".search",".static",".wws",".OLD.co.uk",".ece",".epc",".ice",".jspa",".lst",".php-dist",".svc",".vbs",".ai",".cur",".dmg",".img",".inf",".seam",".smtp.php",".ajax",".cfm.cfm",".chm",".csp",".edit",".file",".py",".sh",".test",".zdat.admin",".dev",".eps",".fr",".fsockopen",".new.html",".p",".store",".webinfo",".xml.php",".BAK",".htm.",".php.bak",".bk",".bsp",".cms",".d",".html,",".htmll",".idx",".images",".jad",".master.cs",".prev_next",".ssf",".stm",".txt.gz",".as",".asp.asp",".au",".cnf",".dhtml",".enu",".html.old",".lock",".m",".phps",".pm",".pptx",".sav",".ssi",".suo",".vbproj",".wml",".xsd",".ASPX",".JS",".PHP",".array-keys",".atom",".award",".bkp",".crt",".default",".eml",".epl",".fancybox",".fil",".geo",".h",".hmtl",".html.bak",".ida",".implode",".index.php",".iso",".kmz",".php.old",".php.txt",".rec",".storefront",".taf",".war",".xslt.CSS",".NSF",".Sponsors",".a",".aquery",".ascx.cs",".cat",".contrib",".ds",".dwf",".film",".g",".go",".googlebook",".gpx",".hotelName",".htm.htm",".ihtml",".in-array",".index",".ini.php",".layer",".maninfo",".odt",".price",".read",".sit",".src",".tpl.php",".trck",".uguide",".vorteil",".wbp",".AVI",".Asp",".EXE",".WMV",".asax.vb",".aspx.aspx",".btr",".cer",".common.php",".de.html",".jbf",".lbi",".lib.php",".lnk",".login",".login.php",".mhtml",".mpl",".mso",".original",".pgp",".ph",".php.",".preview",".search.htm",".site",".text",".view.ICO",".Web",".XLS.asc",".asp.bak",".aspx.resx",".browse",".code",".csproj",".dtd",".en.html",".ep",".eu",".index.html",".it",".nl",".ogg",".out",".pgt",".php",".po",".prt",".query",".rb",".rhtml",".ru.html",".save",".search.php",".t",".wsdl",".CFM",".MOV",".MPEG",".Master",".PPT",".TTF",".Templates",".XML",".adp",".ajax.php",".apsx",".asf",".bck",".bu",".calendar",".captcha",".cart",".com.crt",".core",".dict.php",".dot",".egov",".en.php",".eot",".git",".ht",".hta",".html.LCK",".ini.sample",".lib",".lic",".map",".master.vb",".mi",".mkdir",".o.pac",".pd",".phtm",".png.php",".portal",".printable",".psql",".pub",".q",".ra",".reg",".rpm",".strpos",".tcl",".template",".tiff",".tv",".us",".WAV",".acgi",".alt",".back",".cfml",".cmd",".detail",".disabled",".dist.php",".djvu",".dta",".e",".extract",".fpl",".framework",".fread",".htm.LCK",".inc.js",".includes",".jp",".jpg.html",".l",".letter",".local",".num",".pem",".php.sample",".php",".php~",".pot",".preg-match",".process",".ps",".r",".raw",".rc",".s",".search.",".server",".sis",".sql.gz",".squery",".subscribe",".svg",".svn",".thtml",".tpl.html",".ua",".vcs",".xhtm",".xml.asp",".xpi.A",".PAGE",".SWF",".add",".array-rand",".asax.cs",".asax.resx",".ascx.vb",".aspx,",".aspx.",".awm",".b",".bhtml",".bml",".ca",".cache",".cfg.php",".cn",".cz",".de.txt",".diff",".email",".en",".error",".faces",".filesize",".hml",".htmls",".htx",".i",".idq",".jpe",".js.aspx",".js.gz",".jspf",".load",".media.mspx",".mv",".mysql",".new.php",".ocx",".oui",".outcontrol",".pad",".pages",".pdb",".pdf.",".pnp",".popup.php",".pvk",".results",".run",".scripts",".sdb",".ser",".shop",".smi",".start",".ste",".swf.swf",".templates",".textsearch",".torrent",".v",".web",".wmf",".wpd",".ws",".xpml",".y",".AdCode",".Aspx",".C.",".COM",".Html",".Run.AdCode",".Skins",".Z",".ajax.asp",".app",".asd",".asm",".assets",".at",".bad.blog",".casino",".cc",".cdr",".children",".com,",".content",".copy",".count",".cp",".custom",".dbf",".deb",".delete",".dic",".divx",".download",".epub",".err",".es",".exclude",".home",".htlm",".htm,",".html-",".image",".inc.html",".it.html",".j",".jnlp",".link",".mc_id",".menu.php",".mgi",".mod",".net.html",".news",".none",".prg",".print.html",".print.php",".pwd",".pyc",".red",".se",".sea",".sema",".session",".setup",".sitx",".smil",".srv",".swi",".swp",".sxw.tem",".temp",".top",".txt.php",".types",".unlink",".url",".vspscc",".vssscc",".w",".work",".wvx",".xspf",".-",".Admin",".E.",".Engineer",".INC",".LOG.new",".MAXIMIZE",".MPG",".NDM",".Php",".R",".SIM",".SQL",".Services",".file",".accdb",".act",".admin.php",".ads",".alhtm",".all",".ani",".apf",".apj",".ar",".arc",".bfhtm",".br",".browser",".build",".buscar",".categorias",".categories",".ccs",".ch",".cl",".click.php",".cls",".cls.php",".com.ar",".com.br",".com.htm",".com.old",".common",".conf.php",".control",".core.php",".create.php",".dbm",".dct",".dmb",".doc.doc",".dxf",".ed",".en.htm",".engine",".env",".error-log",".esp",".ex",".exc",".exe,",".ext",".external",".ficheros",".fichiers",".flush",".fmt",".fn",".footer",".form_jhtml",".friend",".g.",".geo.xml",".ghtml",".google.com",".gov",".gpg",".hl",".href",".htm.d",".htm.html",".html.sav",".html",".html",".htmlprint",".htm~",".hts",".hu",".hwp",".ibf",".il",".image.php",".imagejpeg",".iml",".imprimer",".imprimir",".info.html",".info.php",".ini.bak",".inl",".inv",".join",".jpg.jpg",".jps",".key",".kit",".lang",".lignee",".ltr",".lzh.mail",".metadesc",".metakeys",".mht",".min",".mld",".mobi",".mobile.n",".nfo",".nikon",".nodos",".nxg",".obyx",".old.html",".open",".ord",".org.zip",".ori",".partfinder",".pho",".php-",".phpl",".phpx",".pix",".pls",".prc",".pre",".prhtm",".print.",".printer",".properties",".propfinder",".pvx",".php",".recherche",".redirect",".req",".safe",".sbk",".se.php",".search.asp",".sec",".seo",".serv",".server.php",".servlet",".settings",".sf",".show",".sht",".skins",".so",".sph",".split",".sso",".stats.php",".story",".swd",".swf.html",".sys",".tex",".tga",".thm",".tlp",".tml",".tmp.php",".touch",".tsv",".txt.",".txt.html",".ug",".vsprintf",".vstemplate",".vtl",".wbmp",".webc",".webproj",".wihtm",".wp",".wps",".wri",".wsc",".www",".xsp",".xsql",".zip,",".zml",".ztml",". T.",". php",".A..AEFA",".ALT",".ASC.",".Appraisal",".BBC.BMP",".C.R.D.",".CAA",".Cfm",".Commerce",".Css",".D.",".D.R.",".DBF.DESC.",".DLL",".DOCX",".Direct",".EEA.Email",".Eus.FAE",".FRK",".H.I.",".INFO",".INI",".ISO",".Includes",".K.E.",".K.T.",".KB",".L.",".L.jpg",".LassoApp",".MLD",".Main",".NET",".Old",".Org.master",".Org.sln",".Org.vssscc",".P.",".PSD",".Publish",".RAW",".S",".SideMenu",".T.A",".T.A.",".TEST",".Tung.php",".WTC",".XMLHTTP",".Xml","._._order","._order",".a.html.aac",".access",".act.php",".action.php",".actions",".ad.php",".add.php",".adenaw.com",".adm",".advsearch",".ag.php",".aj_",".all.hawaii",".ap",".api",".apk",".archiv",".arj",".array-map",".art",".artdeco",".articlePk",".artnet.",".ascx.resx",".asia",".asp-",".asp.LCK",".asp",".asp_files",".aspl",".aspp",".asps",".aspx_files",".aspxx",".aspy",".asxp",".at.html",".avatar.php",".awstats",".backup.php",".bak.php",".banan.se",".banner.php",".barnes",".baut",".bc",".beta",".biz",".bmp.php",".board.asd",".boom",".buyadspace",".bycategory",".bylocation",".bz",".c.html",".cache.php",".car",".cat.php",".catalog",".cdf",".ce",".cfm.bak",".cfswf",".cfx",".cgis",".chat",".chdir",".cmp",".cnt",".co",".co.il",".com.au",".com.php",".com.ua",".com_files",".comments",".comments.",".conf.html",".console",".contact",".corp",".cqs",".cron",".crx",".csr",".css.LCK",".css.gz",".cssd",".csv.php",".ctp",".cx",".dal",".daniel",".data.php",".data_",".davis",".dbml",".dcf",".de.jsp",".del",".deleted",".dell",".demo",".dig",".dist",".dk",".dm",".dms",".dnn",".dogpl",".dontcopy",".du",".dump",".dws",".ebay",".ehtml",".en.jsp",".enn",".es.html",".es.jsp",".eur",".exec",".exp",".f.l.",".feeds.php",".ffa",".ficken.cx",".filereader",".flac",".flypage",".fon",".form.php",".forms",".forum",".frk",".ft",".ftl",".fucks.nl",".funzz.fr",".garcia",".gb",".get",".gif.count",".glasner.ru",".google",".gray",".gsp",".guiaweb.tk",".gutschein",".guy",".ha",".hasrett.de",".hawaii",".header.php",".henry",".him",".history",".hlr",".hm",".ho",".hokkaido",".hold",".home.php",".home.test",".homepage",".hp",".htm.bak",".htm.rc",".htm_",".html,,",".html-c",".html-old",".html-p",".html.htm",".html.inc",".html.none",".html.pdf",".html.start",".html_old",".htmla",".htmlc",".htmlfeed",".htmlq",".htmlu",".htn",".htpasswd",".html",".iac.",".iconv",".idf",".ignore.php",".ihmtl",".ihya",".imp",".in",".inactive",".incl",".indt",".insert",".ipl",".issues",".itml",".ixi",".jhtm",".job",".joseph",".jpf",".jpg.xml",".jpg",".js,",".js.LCK",".jsa",".jsd",".jso",".jsp.old",".jsps",".jtp",".keyword",".kk",".kokuken",".ks",".lang.php",".last",".latest",".lha",".links",".listing",".lng",".loc",".local.cfm",".lynkx",".mag",".mail.php",".mbizgroup",".mel",".members",".meus.php",".midi",".min_",".mkv",".mmap",".mp",".mreply.rc",".msp",".mvn",".mysqli",".net-en",".new.htm",".newsletter",".nl.html",".nonude.org",".nth",".nz",".od",".offer.php",".offline",".ogv",".ok.old.htm",".old.old",".older",".oliver",".online",".opensearch",".orig.html",".origin.php",".osg",".outbound",".owen",".pae",".pan",".parse-url",".part",".pass",".patch",".paul",".pdd",".pdf.html",".pdf.pdf",".pdf.php",".pdfx",".phdo",".photo",".php.LCK",".php.backup",".php.html",".php.inc",".php.mno",".php_",".php_OLD",".php_old",".phphp",".phppar",".php",".pht",".pl.html",".plugins",".png,bmp",".popup",".pornz.tv",".prev",".print.jsp",".prl",".prosdo.com",".psb",".qtgp",".qxd",".r.",".rabattlp",".rails",".readfile",".rec.html",".remove",".remove.php",".removed",".resultados",".resume",".rhtm",".rmvb",".ro",".roma",".rpt",".rsp",".rss.php",".rss_cars",".rss_homes",".rss_jobs",".rtfd",".rvt",".s.html",".safariextz",".sc",".scandir",".sec.cfm",".section",".secure",".send",".sent-",".service",".set",".sgf",".show.php",".shtml.html",".sidebar",".sisx",".sitemap.",".skin",".snuffx.com",".sort",".sp.srch",".srf",".srvl",".sta",".staged.php",".staging",".start.php",".stat",".stats",".step",".stml",".sts.php",".suarez",".submit",".support",".swf.LCK",".sym",".system",".tab-",".table.html",".tb",".tech",".temp.php",".test.cgi",".test.php",".tf",".tg",".thanks",".theme",".thompson",".thumb.jpg",".tim",".tk",".tls",".to",".trace",".trade",".ts",".tst",".tvpi",".txt.txt",".ufo",".update",".upgrade",".var.verify",".video",".vn",".vs",".vx",".vxlpub",".wax",".webalizer",".webarchive",".webm",".weedooz.eu",".wgx",".wimzi.php",".wireless",".wm",".working",".wpl",".wplus",".wps.rtf",".write.php",".xcam.at",".xconf",".xcwc.com",".xgi.xlt",".xm",".xml.old",".xpdf",".xqy",".xslx",".xst",".xsx",".xy.php",".yp",".ys",".z",".za",".zh.html",".zhtml",".zip.php"] // eslint-disable-line
