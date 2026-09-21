// ════════════════════════════════════════════════════════════════════════════
// 🌐 EN / 中文 (#16)
// English is the game's own wording and doubles as the lookup key; ZH maps it to Chinese.
// A missing entry falls back to the English, so an untranslated line shows up in English —
// never as a broken key. Keys with {placeholders} match whole strings ("ROUND {n}" ↔ "ROUND 3").
// Names — weapons, skins, maps, characters — stay as they are (several double as ids).
//
// How text gets translated, so game.js barely has to know about any of this:
//  • a MutationObserver translates text nodes and placeholder/title/aria-label attributes as
//    the game writes them (innerHTML panels, textContent updates), remembering each node's
//    English source so switching back restores it exactly;
//  • alert / confirm / prompt are wrapped to translate their message;
//  • I18N.t(s) for the few strings that never reach the DOM.
// Elements marked data-no-i18n (and inputs) are never touched — chat, names people typed.
// ════════════════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  const ZH = {
    // ── Login ────────────────────────────────────────────────────────────────
    'Free 3D arena shooter · no download': '免费 3D 竞技射击 · 免下载',
    'Nickname': '昵称',
    'Password': '密码',
    'Have an account? Log in to keep your progress ▾': '已有账号？登录以保存进度 ▾',
    "Pick a throwaway password — it only saves your shop progress. Don't reuse one from anywhere else.": '随便起一个密码就行——它只用来保存商店进度。别用你在别处用过的密码。',
    'PLAY': '开始游戏',
    '⬇️ DOWNLOAD ZIP': '⬇️ 下载离线版（ZIP）',
    '🟢 {n} players online': '🟢 {n} 人在线',
    "🟢 You're the first one here — bots fill every match": '🟢 现在就你一个人——每局都有机器人陪你打',
    'Signing in…': '登录中…',
    'Joining…': '进入中…',
    'Creating new account "{name}"…': '正在创建新账号「{name}」…',
    'Logged in as {name}': '已登录：{name}',
    'Nicknames need 2–16 characters': '昵称需要 2–16 个字符',
    'Enter the nickname of your account': '请输入你账号的昵称',
    'That nickname has a password — enter it above, or pick another nickname': '这个昵称设过密码——在上面输入密码，或者换一个昵称',
    '"{name}" was taken — you\'re {new}': '「{name}」已经有人用了——你现在是 {new}',
    'Welcome back, {name}': '欢迎回来，{name}',
    'Welcome back, {name} · {n} admin items unlocked': '欢迎回来，{name} · 已解锁 {n} 个管理员物品',
    'Login failed': '登录失败',
    'cannot reach server — is it running on port 3001?': '连不上服务器——它在 3001 端口运行了吗？',
    'cannot reach the server right now — check your connection and try again': '暂时连不上服务器——检查一下网络再试',
    // server errors shown to players
    'user not found': '找不到这个用户',
    'wrong password': '密码不对',
    'invalid password': '密码不对',
    'username taken': '这个昵称已经有人用了',
    'username 2-16 chars': '昵称需要 2–16 个字符',
    'username and password required': '需要昵称和密码',
    'auth failed': '登录状态失效，请重新登录',
    'not enough donuts': '甜甜圈不够',
    'shop error': '商店出错了',
    'case error': '皮肤箱出错了',
    'wheel error': '转盘出错了',
    'unknown skin case': '没有这种皮肤箱',
    'Log out? You\'ll have to sign in again.': '要退出登录吗？之后需要重新登录。',
    "Log out? This guest profile only lives on this device — you won't be able to get it back.": '要退出登录吗？这个游客存档只存在这台设备上——退出后就找不回来了。',

    // ── Mode screen ──────────────────────────────────────────────────────────
    'SELECT MODE': '选择模式',
    'BOTS FILL EVERY SLOT · RANDOM LOADOUTS': '空位由机器人补齐 · 随机装备',
    '← LOBBY': '← 大厅',
    'Back to Lobby 13 (Esc)': '回 13 号大厅（Esc）',
    '🛒 OPEN SHOP': '🛒 商店',
    '📖 WIKI': '📖 百科',
    '🔊 SHOOT FX': '🔊 枪声',
    '🎯 AIM ASSIST': '🎯 瞄准辅助',
    '🎨 GUN SKINS': '🎨 枪械皮肤',
    '📹 KILL LOG': '📹 击杀记录',
    '💬 CHARACTER CHAT': '💬 角色聊天',
    '🎭 SKINS': '🎭 角色皮肤',
    '🔑 ENTER UNLOCK CODE': '🔑 输入兑换码',
    'LOG OUT': '退出登录',
    // vehicles and mortars on a phone (#23), and their announcements (never translated before)
    'PILOT': '驾驶', 'EXIT': '离开',
    '{icon} Tap PILOT to get in the {what} · HP {hp}': '{icon} 点「驾驶」上{what} · 生命 {hp}',
    '🎯 Tap PILOT to use the mortar · {a}/{b} shells · HP {hp}': '🎯 点「驾驶」操作迫击炮 · {a}/{b} 发炮弹 · 生命 {hp}',
    '{a}/{b} shells · FIRE to fire · EXIT to leave': '{a}/{b} 发炮弹 · 点开火发射 · 点离开下来',
    '🚙 ENTERED JEEP': '🚙 上车了', '🚁 ENTERED HELI': '🚁 上直升机了',
    'WASD drive · LMB fire · F exit': 'WASD 驾驶 · 左键开火 · F 下车',
    'WASD move · Space up · Ctrl down · LMB fire · F exit': 'WASD 移动 · 空格上升 · Ctrl 下降 · 左键开火 · F 离开',
    'Stick to drive · FIRE shoots · EXIT to leave': '摇杆驾驶 · 开火射击 · 离开下车',
    'Stick to fly · hold JUMP up · hold CROUCH down · FIRE shoots · EXIT to leave': '摇杆飞行 · 按住跳升高 · 按住蹲下降 · 开火射击 · 离开下飞机',
    // leaving a match, the loadout's way out (#26)
    '⚙ MATCH MENU': '⚙ 对局菜单', '▶ RESUME': '▶ 继续', '🔁 CHANGE MODE': '🔁 换模式', '🏠 BACK TO LOBBY 13': '🏠 回 13 号大厅',
    "Leave this match? It won't count.": '这局还没打完，确定离开吗？这局不计分。',
    'Leave this match? It counts as a loss.': '这局还没打完，现在离开算输。确定离开吗？',
    '← BACK': '← 返回', '🚪 LEAVE MATCH': '🚪 离开比赛',
    // the simpler mode screen (#24)
    'SHOP': '商店', 'SKINS': '皮肤', 'GUN SKINS': '枪械皮肤', 'CHAT': '聊天', 'MORE': '更多',
    'QUICK START': '快速开始', 'ALL MODES': '全部模式',
    '5 bots · all vs all': '5 个机器人 · 各自为战', 'TEAM 5v5': '团队 5v5', '1v1 DUEL': '1v1 单挑', 'GUN GAME': '枪王之路',
    '🗺️ MAP': '🗺️ 地图', '🤖 BOT DIFFICULTY': '🤖 机器人难度',
    'TEAM': '团队', 'FFA': '混战', 'SPECIAL': '特殊', 'ARCADE': '街机',
    'Map': '地图', 'Bot difficulty': '机器人难度', 'Close': '关闭',
    'frags · 📦 {c}c/{r}r · 🎁 {s} skin · 🪖 {n}/24{rest}': '碎片 · 📦 普通 {c} / 稀有 {r} · 🎁 {s} 个皮肤箱 · 🪖 {n}/24{rest}',
    'MAP': '地图',
    'AUTO': '自动',   // the map picker's AUTO and a gun's full-auto — one word fits both
    'Maps with built-in modes (D-Day, Range, KOTH) use their own map regardless of this choice.': '自带地图的模式（诺曼底、靶场、山丘之王）不受这里的选择影响。',
    'BOT DIFFICULTY': '机器人难度',
    'EASY': '简单', 'MEDIUM': '普通', 'HARD': '困难', 'EXPERT': '专家',
    'Original AI · no reload · no leading · no reaction delay': '原版 AI · 不换弹 · 不预判 · 没有反应延迟',
    '+ Reloading · Bullet leading · Reaction time · Skill variation · Smarter melee charges': '+ 会换弹 · 会预判弹道 · 有反应时间 · 水平有高有低 · 近战冲锋更聪明',
    '+ Personalities · Weapon abilities · Focus fire · Low-HP retreat · Last-seen memory': '+ 各有性格 · 会用武器技能 · 集火 · 残血撤退 · 记得你最后出现的位置',
    '+ Faster aim/fire/reload · Weapon-aware pressure · Team comms · Punishes reloading · Trajectory prediction': '+ 瞄准/开火/换弹更快 · 看武器施压 · 团队配合 · 专抓你换弹 · 预判走位',
    'TEAM DEATHMATCH': '团队死斗',
    '1 enemy': '1 个敌人',
    '1 ally · 2 enemies': '1 个队友 · 2 个敌人',
    '2 allies · 3 enemies': '2 个队友 · 3 个敌人',
    '4 allies · 5 enemies': '4 个队友 · 5 个敌人',
    '9 allies · 10 enemies': '9 个队友 · 10 个敌人',
    'FREE FOR ALL': '自由混战',
    'FFA · 5 Bots': '混战 · 5 个机器人',
    'FFA · 15 Bots': '混战 · 15 个机器人',
    'All vs All': '各自为战',
    'SPECIAL MODES': '特殊模式',
    'FRONTLINES': '前线推进', 'Push the battle line': '把战线推到对面',
    'LAST STAND': '最后防线', 'Survive endless waves': '撑过一波又一波',
    'D-DAY': '诺曼底', 'Defend the hill · 3 waves': '守住山头 · 3 波',
    'SHOOTING RANGE': '靶场', 'Practice · No enemies': '练枪 · 没有敌人',
    '🛋️ LOBBY 13': '🛋️ 13 号大厅', 'Chill hub · organize 1v1s · no scoring': '休闲区 · 约 1v1 · 不计分',
    '👑 KING OF THE HILL': '👑 山丘之王', '10 players · 3 lives · vehicles · last alive wins': '10 名玩家 · 3 条命 · 有载具 · 活到最后的赢',
    '🎮 ARCADE MODES': '🎮 街机模式',
    '🔫 GUN GAME': '🔫 枪王之路', 'Each kill upgrades weapon · knife wins': '每杀一人换一把枪 · 最后用刀收尾',
    '🎯 ONE IN THE CHAMBER': '🎯 一发入魂', '1 bullet · 1 shot kill · melee fallback': '1 颗子弹 · 一枪毙命 · 没子弹就近战',
    '🛡️ JUGGERNAUT': '🛡️ 重装战士', '1 OP super-soldier vs everyone': '1 个超强战士单挑所有人',
    '🧟 INFECTION': '🧟 感染', 'Zombies infect on melee · last human wins': '僵尸近战会传染 · 最后的人类获胜',
    '🔭 SNIPER ONLY': '🔭 狙击专场', 'SR-X only · long-range chess': '只有 SR-X · 远距离斗智',
    '⏱️ SPEEDRUN': '⏱️ 速通', 'Kill 20 bots as fast as possible · solo': '尽快击败 20 个机器人 · 单人',
    '🥧 PIE FIGHT': '🥧 奶油派大战', 'Cream pies only · splat everyone · FFA': '只有奶油派 · 糊所有人一脸 · 混战',
    // map descriptions (the names themselves stay)
    'Random — game picks one for you each match': '随机——每局帮你挑一张图',
    'Classic — open arena with crosshatch walls (original)': '经典——开阔的场地和网格墙（最初的地图）',
    'Urban Plaza — corner buildings, cars as low cover': '城市广场——街角楼房，汽车当掩体',
    'Warehouse — stacked crates, pipes, narrow lanes': '仓库——成堆的货箱、管道、窄通道',
    'Forest Clearing — trees + rocks, mostly open': '森林空地——树和石头，大部分很开阔',
    '🇻🇳 Vietnam — huge dense jungle, thick canopy, tight sightlines': '🇻🇳 越南——茂密的大丛林，树冠厚，视野很近',
    '🔥 Volcano — lava pools deal 4 dmg/sec': '🔥 火山——岩浆池每秒掉 4 点血',
    '⚡ Cyber Alley — neon city, JUMP PADS launch you up': '⚡ 赛博小巷——霓虹城市，跳板能把你弹上天',
    'Desert Ruins — broken pillars + sand dunes, open sightlines': '沙漠遗迹——断柱和沙丘，视野开阔',
    '❄️ Tundra — ice patches make you slip and slide': '❄️ 冻原——冰面会让你打滑',
    '🌌 Space Station — LOW GRAVITY zones · jump higher': '🌌 空间站——低重力区 · 跳得更高',
    '🛬 Airport — break glass + lights · gets darker as lights die': '🛬 机场——玻璃和灯都能打碎 · 灯越少越黑',
    '🪖 Trenches — barbed wire + 4 PILOTABLE mortar cannons (F to use)': '🪖 壕沟——铁丝网 + 4 门能操作的迫击炮（按 F 使用）',
    '☢️ Chernobyl — toxic gas (1 dmg/s) + 4 destructible reactors (500 HP each)': '☢️ 切尔诺贝利——毒气（每秒掉 1 点血）+ 4 座能炸毁的反应堆（每座 500 血）',
    'Oil Refinery — oil slicks make you slide + explosive barrels': '炼油厂——油渍会让你滑 + 爆炸桶',
    'Skydock Launch — many jump pads + raised gantry fights': '天空码头——很多跳板，高台上交火',
    'Acid Sewer — toxic pools force bridge fights': '酸液下水道——毒池逼你在桥上打',
    'Gravity Lab — low gravity domes + launch pads': '重力实验室——低重力穹顶 + 弹射板',
    'Glassworks — breakable glass maze + barrel traps': '玻璃工坊——能打碎的玻璃迷宫 + 炸药桶陷阱',
    '🚢 Carrier — flat runway top deck · hangars + control tower': '🚢 航母——平坦的甲板跑道 · 机库和塔台',
    '🌲 Overgrowth — abandoned city reclaimed by nature': '🌲 荒城——被大自然吞没的废弃城市',
    '🛰️ Orbital Station — modular pods + central hub': '🛰️ 轨道站——一个个舱段围着中央枢纽',
    '🏭 Foundry — conveyor belts, molten pools, giant gears': '🏭 铸造厂——传送带、熔池、巨型齿轮',
    '🎪 Carnival — ferris wheel, tents, bumper-car arena': '🎪 游乐园——摩天轮、帐篷、碰碰车场',
    '🧬 Biosphere — 4-zone dome (jungle / desert / frozen / dirt)': '🧬 生物圈——四个区域的穹顶（丛林 / 沙漠 / 冰原 / 泥地）',
    '🚨 Lockdown — prison cell blocks + security tower': '🚨 封锁——监狱牢房 + 岗楼',
    '🎥 Studio — western, sci-fi, and castle sets back-to-back': '🎥 片场——西部、科幻、城堡三个布景挨在一起',
    '🕍 Temple — stone columns, giant idol, trap pits': '🕍 神殿——石柱、巨型神像、陷阱坑',
    '🎄 Holiday — snowy village + giant tree + frozen lake': '🎄 节日——雪村 + 大圣诞树 + 冰湖',
    '🧪 Labyrinth — maze of walls, lots of corners': '🧪 迷宫——墙组成的迷宫，拐角特别多',
    '🏟️ Arena — green field surrounded by stadium walls': '🏟️ 体育场——看台围着的绿茵场',
    '🎭 Opera — stage + balconies + chandelier': '🎭 歌剧院——舞台 + 包厢 + 大吊灯',
    '🌋 Doomsday — collapsing city, fire pillars, abandoned heli': '🌋 末日——崩塌的城市、火柱、废弃的直升机',
    '🚂 Train Terminal — 3 tracks, platforms + canopy, footbridge, level crossing': '🚂 火车站——3 条铁轨、站台和雨棚、天桥、道口',
    '🌌 Dreamscape — floating stairs + impossible shapes': '🌌 梦境——漂浮的楼梯和不可能的形状',

    // ── HUD / touch controls ─────────────────────────────────────────────────
    'HEALTH': '生命',
    '🎮 MODES': '🎮 模式',
    'PRIMARY': '主武器', 'SECONDARY': '副武器', 'MELEE': '近战', 'SUPPORT': '辅助',
    'RELOADING...': '换弹中…',
    '🗑 F · SWAP WEAPONS': '🗑 F · 换武器',
    'SCOREBOARD': '计分板', 'NAME': '名字', 'KILLS': '击杀', 'DEATHS': '阵亡', 'HP': '生命',
    'YOU DIED': '你阵亡了',
    'Respawning in 3s...': '3 秒后复活…',
    'Respawning in 2.5s...': '2.5 秒后复活…',
    'Select your loadout...': '选择装备…',
    'Waiting for round to end...': '等待本回合结束…',
    'Tiebreaker — eliminated!': '加时赛——你被淘汰了！',
    'Kills: {n}': '击杀：{n}',
    '🛡 SPAWN SHIELD': '🛡 出生保护',
    'ENEMY': '敌方', 'BASE': '基地', 'SECTOR 2': '区域 2', 'MID': '中线', 'SECTOR 4': '区域 4', 'ALLY': '我方',
    'WAVE {a}/{b}': '第 {a}/{b} 波',
    '{n} ENEMIES': '{n} 个敌人',
    'PREPARE': '准备',
    'SHOTS {a}  ·  HITS {b}  ·  ACC {c}%': '射击 {a}  ·  命中 {b}  ·  命中率 {c}%',
    'COINS: {n}': '金币：{n}',
    'WAVE COMPLETE': '本波结束', 'BUY UPGRADES': '购买升级', 'SKIP': '跳过',
    'GET READY': '准备', 'GO!': '开始！',
    'FIRE': '开火', 'ADS': '瞄准', 'R': '换弹', 'SLIDE': '滑铲', 'CROUCH': '蹲', 'JUMP': '跳',
    'SWAP': '换装', 'DUEL': '约战', 'START': '开打',
    // ammo at the crosshair (#34)
    'LOW AMMO': '弹药不足', 'TAP ↻ TO RELOAD': '点 ↻ 换弹', 'PRESS R TO RELOAD': '按 R 换弹',
    'OUT OF AMMO · SWITCH WEAPON': '没子弹了 · 换把武器',
    // Lobby 13 (#35)
    'LOBBY 13 · CHILL ZONE · NO DAMAGE': '13 号大厅 · 休闲区 · 不计伤害',
    'No damage in the lobby — ⚔️ DUEL or 🎮 MODES to fight': '大厅里不会受伤 —— 点 ⚔️ 约战 或 🎮 模式 开打',
    // ⚔️ duel picker + end-screen rivals (#31)
    '⚔️ DUEL': '⚔️ 约战', '⚔️ DUEL 1V1': '⚔️ 约战 1V1',
    'RECENTLY FOUGHT': '最近交过手', 'BEST RECORD': '战绩最好的',
    'UP FOR A FIGHT': '想打一架的', 'EVERYONE ({n})': '全部角色（{n}）',
    '1V1 · random arena · your current difficulty and loadout': '1V1 · 随机竞技场 · 你当前的难度和装备',
    '⚔️ JUST FOUGHT · TAP TO 1V1 THEM': '⚔️ 刚才交过手 · 点「约战」马上单挑',
    'nemesis': '宿敌', 'top of the match': '本局最强', 'beat you last time': '上局赢了你',
    'killed you {n}x': '击杀你 {n} 次', 'you killed them {n}x': '你击杀他 {n} 次',
    '{n} kills this match': '本局 {n} 杀',
    '{n} kills on you': '击杀你 {n} 次', 'you got them {n}': '你击杀他 {n} 次', '{n} wins': '{n} 场胜利',
    'played with you': '一起打过',
    'Chill zone · ⚔️ DUEL picks your 1V1 · the blue/red pads run 2V2 and 3V3':
      '休闲区 · 点「⚔️ 约战」挑人单挑 · 站上红蓝台子打 2V2 / 3V3',
    '⚔️ {area} · 🟦 {b}/{n} · 🟥 {r}/{n} · press F to start': '⚔️ {area} · 🟦 {b}/{n} · 🟥 {r}/{n} · 按 F 开打',
    '⚔️ {area} · 🟦 {b}/{n} · 🟥 {r}/{n} · tap START to start': '⚔️ {area} · 🟦 {b}/{n} · 🟥 {r}/{n} · 点「开打」',
    // ⚔️ challenging a real player in Lobby 13 (#46)
    'REAL PLAYERS HERE ({n})': '大厅里的真人玩家（{n}）',
    'Nobody else is in Lobby 13 right now — send a friend the link.': '13 号大厅现在只有你——把链接发给朋友一起玩。',
    'CHALLENGE': '挑战', 'ACCEPT': '接受', 'DECLINE': '拒绝', 'CANCEL': '取消',
    '⚔️ Waiting for {name} · {n}s': '⚔️ 等 {name} 回应 · {n} 秒',
    '⚔️ {name} challenges you to a 1V1': '⚔️ {name} 向你发起 1V1 挑战',
    '⚔️ NO DUEL': '⚔️ 约战没成',
    '{name} said no': '{name} 拒绝了', "{name} didn't answer": '{name} 没有回应',
    '{name} left Lobby 13': '{name} 离开了 13 号大厅', '{name} is already in a challenge': '{name} 正在另一场约战里',
    '⚔️ CHALLENGE WITHDRAWN': '⚔️ 对方撤回了挑战',
    'Your opponent left · no reward this time': '对手离开了 · 这局不发奖励',
    // several real players in a team match (#48)
    'The host left · no reward this time': '房主离开了 · 这局不发奖励',
    'Your host left — your team loses · no reward this time': '房主离开了——你们队判负 · 这局不发奖励',
    'The host left — you win · no reward this time': '房主离开了——你们队获胜 · 这局不发奖励',
    '🤝  MATCH OVER': '🤝  比赛结束',
    'TIME UP · a draw': '时间到 · 平局',
    'MELEE ': '近战', 'RANGE': '射程', 'USES': '次数',
    '↑ AUTO': '↑ 自动',
    '[HOLD]': '[按住]',
    'SPECTATING': '观战中',
    '🎬 KILLCAM · killed by {name}': '🎬 击杀回放 · 击杀者：{name}',
    'an enemy': '一名敌人',
    'SWITCHBLADE': '折叠刀枪',
    'KNIFE · melee · 50 dmg': '刀 · 近战 · 50 伤害',
    'PISTOL · ranged · 50 dmg': '手枪 · 远程 · 50 伤害',
    'CHARGED · 100 dmg': '已蓄力 · 100 伤害',
    '[E] swap mode': '[E] 切换形态',
    // match HUD strip
    'YOUR TEAM  {a}/{b}': '我方  {a}/{b}',
    '{a}/{b}  ENEMY': '{a}/{b}  敌方',
    'ALLY  {a}/{b}': '我方  {a}/{b}',
    'ALLY ◀': '我方 ◀',
    '▶ ENEMY': '▶ 敌方',
    'SHOTS {n}': '射击 {n}',
    'ACC {n}%': '命中率 {n}%',
    '❤️ {a}/{b} LIVES': '❤️ {a}/{b} 条命',
    '{n} PLAYERS ALIVE': '剩 {n} 人',
    'TIER {a}/{b}': '第 {a}/{b} 级',
    'KILLS {a}/{b}': '击杀 {a}/{b}',
    'PB {t}s': '最佳 {t} 秒',
    '🛡️ JUGG: {name}': '🛡️ 重装：{name}',
    'JUGGERNAUT': '重装战士',
    'YOUR KILLS: {n}': '你的击杀：{n}',
    '🧟 {n} INFECTED': '🧟 {n} 人被感染',
    'INFECTION': '感染',
    'BULLETS: {n}': '子弹：{n}',
    'KILLS: {n}': '击杀：{n}',
    '🎮 ARCADE': '🎮 街机',
    'YOU: {n} kills': '你：{n} 击杀',
    'TOP BOT: {n}': '最强机器人：{n}',
    // lobby / interact prompts
    '{icon} Press F to pilot {what} · HP {hp}': '{icon} 按 F 驾驶{what} · 生命 {hp}',
    'helicopter': '直升机', 'jeep': '吉普车',
    '🎯 Press F to pilot mortar · {a}/{b} shells · HP {hp}': '🎯 按 F 操作迫击炮 · {a}/{b} 发炮弹 · 生命 {hp}',

    // ── Loadout ──────────────────────────────────────────────────────────────
    'SELECT LOADOUT': '选择装备',
    'SWAP LOADOUT': '更换装备',
    '📋 BEST LOADOUTS': '📋 推荐装备',
    'READY': '出发',
    'Auto in {n}s · tap any item to stay': '{n} 秒后自动出发 · 点装备可停下',
    'Auto in {n}s · click any item to stay': '{n} 秒后自动出发 · 点装备可停下',
    'FREE': '免费', 'STOCK': '默认', '✓ OWNED': '✓ 已拥有', '🧪 TRIAL': '🧪 试用', '🪖 ADMIN': '🪖 管理员',
    '· SKIN': '· 皮肤', 'SEMI': '半自动', 'REFILL AMMO': '补充弹药', 'REGEN': '回血',
    // weapon type labels on cards (the common ones; exotic combos keep their flavour name)
    'AR': '步枪', 'Burst AR': '点射步枪', 'Precision AR': '精准步枪', 'Battle Rifle': '战斗步枪', 'Marksman': '精确射手步枪',
    'SMG': '冲锋枪', 'SMG+': '冲锋枪+', 'LMG': '轻机枪', 'MG': '机枪', 'Shotgun': '霰弹枪', 'Sniper': '狙击枪', 'Heavy Sniper': '重型狙击枪',
    'Secondary': '副武器', 'Secondary+': '副武器+', 'Heavy': '重武器', 'Rocket': '火箭筒', 'Explosive': '爆炸物', 'Thrown': '投掷物',
    'Projectile': '抛射武器', 'Charge': '蓄力武器', 'Beam': '光束武器', 'Paintball': '彩弹枪', 'Joke Launcher': '搞笑发射器',
    'Melee': '近战', 'Heavy Melee': '重型近战', 'Reach Melee': '长柄近战', 'Punch': '拳击', 'Brass Knuckles': '指虎', 'Shield': '盾牌',
    'Throwable Melee': '可投掷近战', 'Lifesteal Melee': '吸血近战', 'Vampiric Melee': '吸血近战',
    'Heal': '治疗', 'Quick Heal': '快速治疗', 'Auto Heal': '自动治疗', 'Heal Drone': '治疗无人机', 'Utility': '道具', 'Teleport': '传送',
    'Resupply': '补给', 'Buff': '增益', 'Trap': '陷阱', 'Decoy': '诱饵', 'Magnet': '磁铁', 'Mobility': '机动', 'Drone': '无人机',
    'Stun': '眩晕', 'Launch': '弹射', 'Auto Turret': '自动炮塔', 'Admin': '管理员',
    'PRIMARY WEAPONS': '主武器', 'SECONDARIES': '副武器', 'MELEES': '近战武器', 'UTILITIES': '道具',
    'Curated meta builds - tap to equip. Missing items show in the shop.': '精选强势搭配——点一下就装备。缺的物品会在商店里显示。',
    '⚠ unowned items': '⚠ 有未拥有的物品',
    "Can't equip \"{name}\" — missing/unowned items:\n\n• {items}\n\nBuy or trial them in the shop first.": '装备不了「{name}」——缺少这些物品：\n\n• {items}\n\n先去商店购买或试用。',
    'CHANGE LOADOUT': '更换装备',
    'LOADOUT UPDATED': '装备已更新',
    'Active next round': '下回合生效',

    // ── Match lobby ──────────────────────────────────────────────────────────
    '🏛️ MATCH LOBBY': '🏛️ 比赛大厅',
    '{rest} · WAITING FOR PLAYERS': '{rest} · 等待玩家', 'WAITING FOR PLAYERS': '等待玩家',
    'MAP: {m}': '地图：{m}',
    'RANDOM': '随机',
    'TEAM ALLY ({a}/{b})': '我方（{a}/{b}）',
    'TEAM ENEMY ({a}/{b})': '敌方（{a}/{b}）',
    'empty': '空',
    '{icon} {name} (YOU)': '{icon} {name}（你）',
    'Fill missing slots with bots': '用机器人补满空位',
    'SWITCH TEAM': '换队',
    '⏳ READY UP': '⏳ 准备',
    '✅ READY!': '✅ 已准备！',
    'LEAVE LOBBY': '离开大厅',
    'Match starts when all players ready · Bots will fill empty slots': '所有人准备好就开始 · 空位由机器人补齐',
    'Match starts when all players ready · No bots — playing as-is': '所有人准备好就开始 · 不加机器人',
    'MATCH FOUND': '匹配成功',
    '🔎 Looking for a real opponent · {n}s': '🔎 正在找真人对手 · {n} 秒',
    '🤖 PLAY A BOT NOW': '🤖 直接打机器人',
    '🔎 Looking for more real players · {n}s': '🔎 正在找更多真人 · {n} 秒',
    '🤖 START WITH BOTS NOW': '🤖 直接带机器人开打',
    'The first real player to pick 1v1 plays you — or a bot does': '第一个选 1v1 的真人就是你的对手——没人来就打机器人',
    '{n} player(s) · You are {team}{host}': '{n} 名玩家 · 你在{team}{host}',

    // ── End of match ─────────────────────────────────────────────────────────
    '🏆  VICTORY': '🏆  胜利',
    '💀  DEFEAT': '💀  失败',
    'VICTORY': '胜利',
    'PLAY AGAIN': '再来一局',
    'CHANGE MODE': '换模式',
    'BACK TO LOBBY 13': '回 13 号大厅',
    '{rest} · same loadout': '{rest} · 同一套装备', 'same loadout': '同一套装备',
    'Kills {k}  ·  Deaths {d}': '击杀 {k}  ·  阵亡 {d}',
    'Rounds  {a} – {b}': '回合  {a} – {b}',
    'Kills  Your Team {a}  ·  Enemy {b}  (goal {g})': '击杀  我方 {a}  ·  敌方 {b}（目标 {g}）',
    'Waves survived: {a}/3  ·  Enemies killed: {b}': '撑过 {a}/3 波  ·  击败敌人：{b}',
    'Your kills: {a}  ·  Top bot: {b}': '你的击杀：{a}  ·  最强机器人：{b}',
    'First to {n} rounds': '先赢 {n} 回合',
    'First to {n} round wins': '先赢 {n} 回合者胜',
    'TIME UP · Most kills wins': '时间到 · 击杀最多者胜',
    'TIME UP · Bot had more kills': '时间到 · 机器人击杀更多',
    'TIME UP · You had the most kills!': '时间到 · 你的击杀最多！',
    'TIEBREAKER — You fell first': '加时赛——你先倒下了',
    'TIEBREAKER — You survived!': '加时赛——你活下来了！',
    'KILL GOAL REACHED': '达到击杀目标',
    'FRONTLINE REACHED YOUR BASE': '战线被推到了我方基地',
    'FRONTLINE REACHED ENEMY BASE': '战线推到了敌方基地',
    'All defenders eliminated': '守军全部阵亡',
    'All enemy waves repelled': '打退了所有敌潮',
    '🏆 GUN GAME WIN · You climbed the ladder!': '🏆 枪王之路胜利 · 你爬到了最顶级！',
    '💀 {name} climbed the ladder first!': '💀 {name} 先爬到了顶级！',
    '💀 SPEEDRUN FAILED · {a}/{b}': '💀 速通失败 · {a}/{b}',
    '⏱️ SPEEDRUN COMPLETE · {rest}': '⏱️ 速通完成 · {rest}',
    '👑 LAST ONE STANDING!': '👑 最后的幸存者！',
    '🏆 ZOMBIES ELIMINATED': '🏆 僵尸全灭',
    '🧟 LAST HUMAN STANDING... not quite': '🧟 最后的人类……差一点',
    "🧟 INFECTED — You're a zombie now": '🧟 被感染了——你现在是僵尸',
    '💀 BETTER LUCK NEXT TIME': '💀 下次好运',
    '{icon} +{n} donuts earned': '{icon} 获得 {n} 个甜甜圈',
    '{icon} +{n} donuts earned · 📦 +1 Common': '{icon} 获得 {n} 个甜甜圈 · 📦 +1 普通宝箱',
    '{icon} +{n} donuts earned · 🟣 +1 Rare': '{icon} 获得 {n} 个甜甜圈 · 🟣 +1 稀有宝箱',
    '{icon} +{n} donuts earned · 📦 +1 Common · 🟣 +1 Rare': '{icon} 获得 {n} 个甜甜圈 · 📦 +1 普通宝箱 · 🟣 +1 稀有宝箱',

    // ── Announcements ────────────────────────────────────────────────────────
    'ROUND {n}': '第 {n} 回合',
    'MATCH START': '比赛开始',
    'First to {g} kills · {t}': '先拿 {g} 杀 · {t}',
    'Most kills in {t}': '{t} 内击杀最多者胜',
    'Push the battle line to their base!': '把战线推到对方基地！',
    'Defend the hill! Enemies incoming!': '守住山头！敌人来了！',
    'Hit the targets · No enemies!': '打靶 · 没有敌人！',
    '{n} players · 3 lives each · last alive wins': '{n} 名玩家 · 每人 3 条命 · 活到最后的赢',
    '💡 DID YOU KNOW?': '💡 你知道吗？',
    'ELIMINATED': '已淘汰',
    'FROZEN': '冻住了', 'You turned to ice': '你变成了冰块',
    'Killed by {name}': '被 {name} 击杀',
    'DRAW': '平局', 'Round replayed': '本回合重打',
    'YOUR TEAM WINS!': '我方获胜！', 'ENEMY WINS!': '敌方获胜！',
    'ROUND WIN!': '赢下本回合！', 'ROUND LOST': '输掉本回合',
    'Score {a} – {b}': '比分 {a} – {b}',
    'TIMEOUT · HP {a} vs {b}': '超时 · 生命 {a} vs {b}',
    'TIMEOUT · Both at {a} HP': '超时 · 双方都是 {a} 生命',
    '⚔️ TIEBREAKER': '⚔️ 加时赛', 'No respawn · whoever dies first loses': '不能复活 · 谁先死谁输',
    'BASE CAPTURED!': '攻下基地！', 'Your team pushed to the enemy base!': '我方把战线推到了敌方基地！',
    'BASE LOST!': '基地失守！', 'Enemy pushed through to your base!': '敌人推进到了我方基地！',
    'INCOMING FIRE!': '炮火来袭！', 'Grenade barrage — take cover!': '手雷轰炸——快找掩体！',
    'WAVE 1': '第 1 波', '20 troops charging the hill!': '20 名士兵冲向山头！',
    'WAVE 2': '第 2 波', '20 more troops incoming!': '又来了 20 名士兵！',
    'FINAL WAVE': '最后一波', '50 troops — HOLD THE LINE!': '50 名士兵——守住防线！',
    'VICTORY!': '胜利！', 'The hill is defended! Operation successful!': '山头守住了！行动成功！',
    'BUNKERS LOST': '碉堡失守', 'All gunners eliminated!': '机枪手全部阵亡！',
    '🔫 GUN GAME': '🔫 枪王之路', 'Climb {n} weapon tiers · knife wins!': '一路升 {n} 级武器 · 用刀收尾获胜！',
    '1 bullet · 1-shot kill · refill on kill': '1 颗子弹 · 一枪毙命 · 击杀补子弹',
    '🛡️ YOU ARE JUGGERNAUT': '🛡️ 你是重装战士', '1000 HP · GAU-19 · kill them all': '1000 生命 · GAU-19 · 全部干掉',
    '{name} is the juggernaut!': '{name} 是重装战士！',
    '🛡️ NEW JUGGERNAUT': '🛡️ 新的重装战士', '{name} took the crown': '{name} 夺走了王冠',
    'Zombies infect on hit · last human wins!': '僵尸打中就传染 · 最后的人类获胜！',
    'SR-X only · long-range chess match': '只有 SR-X · 远距离斗智',
    'Cream pies only · splat everyone · most pies wins!': '只有奶油派 · 糊所有人一脸 · 糊最多的赢！',
    'Kill {n} bots as fast as possible!': '尽快击败 {n} 个机器人！',
    '🏅 YOUR PB': '🏅 你的最佳成绩',
    '⚔️ FINAL TIER': '⚔️ 最后一级', 'Get a knife kill to win!': '用刀击杀一人就赢！',
    '⚠️ THREAT': '⚠️ 注意', '{name} reached tier {n}!': '{name} 升到了第 {n} 级！',
    '🧟 INFECTED': '🧟 被感染', '{name} turned!': '{name} 变成僵尸了！',
    '💔 LIFE LOST': '💔 少了一条命', '{a}/{b} lives remaining': '还剩 {a}/{b} 条命',
    '💀 ELIMINATED': '💀 已淘汰', "You're out of lives": '你的命用完了',
    '⚔️ DUEL': '⚔️ 约战',
    'A bot': '一个机器人', 'Someone': '有人',
    'RECOMBINED': '已合体', 'CHARGED': '已蓄力', 'Next shot: 100 dmg': '下一发：100 伤害',
    '⚔️ SKEWERED': '⚔️ 串起来了',
    '💚 HEAL GUN': '💚 治疗枪',
    'ADRENALINE': '肾上腺素', '{x}× speed · faster reload': '{x} 倍速度 · 换弹更快',
    'TRIPWIRE SET': '绊线已布置',
    'DECOY DEPLOYED': '诱饵已放出',
    'MAGNET MINE': '磁力地雷', '{n}m pull radius': '吸引半径 {n} 米',
    'ORBITAL STRIKE INCOMING': '轨道打击来袭',
    'GUARDIAN DRONE': '守护无人机',
    '⚡ TESLA COIL': '⚡ 特斯拉线圈', '{n}s · zaps nearby enemies': '{n} 秒 · 电击附近的敌人',
    '🐝 BEE JAR': '🐝 蜜蜂罐', '{n}s · the bees are angry': '{n} 秒 · 蜜蜂很生气',
    'LAND MINE ARMED': '地雷已布设', '{n} dmg + launch': '{n} 伤害 + 炸飞',
    '🔨 GLASS BROKEN': '🔨 玻璃碎了',
    '💡 LIGHT OUT': '💡 灯灭了', '{n}% brightness': '亮度 {n}%',
    '☢️ REACTOR DESTROYED': '☢️ 反应堆被炸毁', '12 m AOE explosion!': '12 米范围大爆炸！',
    'BARREL BOOM': '油桶爆炸', '7 m AOE explosion!': '7 米范围爆炸！',
    '🌌 HULL BREACH': '🌌 舱体破裂', 'The vacuum is pulling everyone in!': '真空正把所有人吸过去！',
    '🚨 LIGHTS OUT': '🚨 停电了', 'Power failure — visibility cut!': '断电——视野变差！',
    '🎭 CHANDELIER!': '🎭 吊灯掉下来了！', 'CLEAR THE CENTER!': '快离开中间！',
    '🎯 MORTAR ARMED': '🎯 迫击炮就绪', '{a}/{b} shells · LMB to fire · F to exit': '{a}/{b} 发炮弹 · 左键发射 · F 离开',
    'LEFT MORTAR': '离开迫击炮', 'OUT OF SHELLS': '炮弹打完了',
    '💣 C4 PLACED': '💣 C4 已放置', 'Press E to detonate': '按 E 引爆',
    '💣 CLAYMORE ARMED': '💣 阔剑地雷已布设', 'Front-facing trap': '朝前的陷阱',
    '🛰️ PREDATOR UAV': '🛰️ 捕食者无人机', '{n}s · enemies revealed': '{n} 秒 · 敌人全部现形',
    '📦 CARE PACKAGE': '📦 空投补给', 'Walk to the box for a random buff': '走到箱子旁边拿随机增益',
    '☢️ TACTICAL NUKE INBOUND': '☢️ 战术核弹来袭',
    'NANO SHIELD': '纳米护盾',
    'BOUNCE PAD': '弹跳板', 'Launches up at {n} m/s': '以每秒 {n} 米的速度弹起',
    '👑 THE CHAOS EMPEROR': '👑 混沌皇帝', 'Traffic Cone Republic salutes you': '雪糕筒共和国向你致敬',
    'they walk among us': '它们就在我们身边',
    'CHAOS UNLEASHED': '混乱释放',
    '💀 EVERYBODY DIES': '💀 全员阵亡', 'Admin nuke deployed': '管理员核弹已投放',
    '❤️ FULL HEAL': '❤️ 回满血', '📦 AMMO REFILLED': '📦 弹药已补满',
    '🏁 ROUND WON': '🏁 赢下本回合', 'All enemies eliminated': '敌人全部消灭',

    // ── Settings & its panels ────────────────────────────────────────────────
    '⚙ SETTINGS': '⚙ 设置',
    'LANGUAGE': '语言',
    'SHOW FPS': '显示帧率', 'AUTO RELOAD': '自动换弹', 'ADS MODE': '瞄准方式',
    'LOOK SENSITIVITY': '滑屏灵敏度', 'MOUSE SENSITIVITY': '鼠标灵敏度',
    'BUTTON SIZE': '按钮大小', 'SMALL': '小', 'NORMAL': '中', 'BIG': '大',
    'HOLD': '按住', 'TOGGLE': '切换', 'ON': '开', 'OFF': '关',
    'CAMERA SHAKE': '镜头晃动', 'SCREEN EFFECTS': '屏幕特效',
    'Tweak the muzzle blast on every gun. Saved per device.': '调整所有枪的开枪声音，只保存在这台设备上。',
    'VOLUME': '音量', 'PITCH': '音调', 'ATTACK (snap)': '起音（清脆）', 'BODY (boom)': '厚度（轰鸣）', 'DURATION': '时长',
    '🔫 TEST': '🔫 试听', 'RESET': '重置',
    'Toggle each aid on or off. Saved per device. Works against bots and other players in a match.': '每一项都能单独开关，只保存在这台设备上。比赛里对机器人和真人都有效。',
    'AIM ASSIST': '瞄准辅助', 'AIM BOT': '自动锁定', 'AUTO SHOOT': '自动开火', 'AI AIM': 'AI 预判',
    'Opponent on screen → view drifts to their body at 5°/s.': '对手出现在屏幕上 → 视角以每秒 5° 慢慢移向对方。',
    'Opponent on screen 0.2s → snaps to them at 50°/s.': '对手出现 0.2 秒 → 以每秒 50° 直接锁定。',
    'Crosshair on an opponent for 0.01s → fires on its own. Turn OFF if you want to pull the trigger yourself.': '准星对准对手 0.01 秒 → 自动开枪。想自己扣扳机就关掉。',
    'Red dot predicts where the opponent moves next — your call whether to trust it.': '红点预判对手下一步会去哪——信不信由你。',
    '✕ CLOSE': '✕ 关闭',

    // ── Shop ─────────────────────────────────────────────────────────────────
    '🛒 WEAPON SHOP': '🛒 武器商店',
    '💼 BUNDLES': '💼 礼包', '🎛️ ABILITIES': '🎛️ 技能', '🔫 PRIMARY': '🔫 主武器', '🔫 SECONDARY': '🔫 副武器',
    '⚔️ MELEE': '⚔️ 近战', '🧰 UTILITY': '🧰 道具', '📦 CHESTS': '📦 宝箱', '🎡 WHEEL': '🎡 转盘', '✨ UPGRADES': '✨ 升级',
    'BUY · {p}': '购买 · {p}',
    'TRIAL · {p}': '试用 · {p}',
    'OPEN': '打开', 'ACTIVE': '生效中', '✓ ACTIVE — {n} min left': '✓ 生效中——还剩 {n} 分钟',
    'You have:': '你有：',
    '{kind} CHEST': '{kind}宝箱',
    '🟣 RARE': '🟣 稀有', '📦 COMMON': '📦 普通',
    '🪖 ADMIN PASS · 10 MINUTES': '🪖 管理员通行证 · 10 分钟',
    'Unlocks EVERY weapon (admin items included) for one 10-minute window. Try anything.': '10 分钟内解锁全部武器（包括管理员物品），随便试。',
    "🎡 Spin the wheel for donuts, fragments, or — if you're VERY lucky (0.3%) — a free rare weapon. 1 free spin per day; extra spins cost {p}.": '🎡 转转盘赢甜甜圈、碎片，运气特别好的话（0.3%）还能白拿一把稀有武器。每天免费转 1 次，多转一次花 {p}。',
    'BUY {p}': '购买 {p}', 'UNLOCK': '解锁',
    'Open chests to get 🧩 weapon fragments + {icon} donuts. Use 100 fragments to unlock any weapon, or upgrade ones you own. Earn chests by playing matches (chance per match), or buy them here.': '开宝箱能拿到 🧩 武器碎片和 {icon} 甜甜圈。100 个碎片可以解锁任意武器，或者升级你已有的武器。打比赛有机会掉宝箱，也可以在这里买。',
    '{a} frags': '{a} 碎片', '{a} donuts': '{a} 甜甜圈', '5% chance of a free weapon': '5% 概率白送一把武器',
    '✨ Spend fragments to upgrade weapons you own. Each stat can be levelled up to {n} times independently — max +120% damage, +250% mag, -85% reload.': '✨ 花碎片升级你已有的武器。每项属性都能单独升 {n} 级——最多伤害 +120%、弹匣 +250%、换弹时间 -85%。',
    'Costs scale: {rest} fragments per level. Effects per level: +12% damage, +25% magazine, -15% reload time.': '费用逐级递增：每级 {rest} 碎片。每级效果：伤害 +12%、弹匣 +25%、换弹时间 -15%。',
    'Total: {a}/{b}': '总计：{a}/{b}',
    '+12% DMG ({a})': '+12% 伤害（{a}）', '+25% MAG ({a})': '+25% 弹匣（{a}）', '-15% RELOAD ({a})': '-15% 换弹时间（{a}）',
    'Each weapon can hold several abilities and run one at a time. Buy the ones you want, then equip whichever suits the match. Fire it with [E].': '每把武器可以有好几个技能，但一次只能用一个。买下想要的，再按比赛情况装备。按 [E] 释放。',
    'No ability': '无技能',
    'This weapon aims and shoots. That is the whole trick.': '这把武器就是瞄准、开枪，没有别的花样。',
    '🎁 FREE SPIN': '🎁 免费转一次', 'SPIN · {p}': '转一次 · {p}',
    'Spinning…': '转盘转动中…', '— spin failed —': '——转盘出错了——',
    '✨ JACKPOT! Unlocked: {w}': '✨ 大奖！解锁：{w}',
    '🧩 +{n} fragments!': '🧩 +{n} 碎片！', '🧩 +{n} fragments': '🧩 +{n} 碎片',
    '{icon} +{n} donuts': '{icon} +{n} 甜甜圈',
    '+12% DMG': '+12% 伤害', '+25% MAG': '+25% 弹匣', '-15% RELOAD': '-15% 换弹时间', 'MAXED': '已满级', '✓ FULLY MAXED': '✓ 全部满级',
    'No abilities for sale yet.': '暂时还没有技能可买。',
    'EQUIP': '装备', '✓ EQUIPPED': '✓ 已装备', '✓ FULLY OWNED': '✓ 全部拥有',
    '{a}/{b} owned': '已拥有 {a}/{b}', 'save {s} (was {w})': '省 {s}（原价 {w}）',
    // bundle blurbs (the bundle names are product names and stay)
    'Classic loadout: AR · shotgun · pistol · melee · smoke': '经典搭配：步枪 · 霰弹枪 · 手枪 · 近战 · 烟雾弹',
    'Quirky old-school weapons · 70% off': '古怪的复古武器 · 3 折',
    'Upgrade past the freebies': '比免费装备更进一步',
    'Minigun · GL · machine revolver': '转管机枪 · 榴弹发射器 · 机关左轮',
    'Long-range duelist kit': '远距离对决套装',
    'Fast SMGs + speed boost': '快速冲锋枪 + 加速',
    'Get up close and stay there': '贴身肉搏到底',
    'Close-range chaos': '近距离大乱斗',
    'Energy weapons & EMP': '能量武器和电磁脉冲',
    'Blow stuff up': '把东西炸飞',
    'Bows, knives, traps': '弓、刀、陷阱',
    'Patient precision shooter': '耐心的精准射手',
    'Burn it all down': '全部烧光',
    'Goofy weapons only': '只有搞笑武器',
    'Silent, deadly, hidden': '无声、致命、隐蔽',
    'Electricity and shocks': '电流与电击',
    'Tank-style survival': '坦克式生存',
    'High-end P2W power fantasy · ~45% off': '顶级氪金爽感 · 约 55 折',
    'Household weapons only': '只有家居用品武器',
    'Swords and shotguns': '剑和霰弹枪',
    'Freeze, blast, finish': '冻住、轰飞、收尾',
    'Send them flying': '把他们打飞',
    'Tracking, drones, mines': '追踪、无人机、地雷',
    'Indirect fire specialists': '曲射火力专家',
    'Every sci-fi P2W item · 30% off': '所有科幻氪金物品 · 7 折',
    'DMG': '伤害', 'HEAL': '治疗',
    'DMG {n}': '伤害 {n}', 'MAG {n}': '弹匣 {n}', 'RANGE {n}': '射程 {n}', 'USES {n}': '次数 {n}',
    'HEAL {n}': '治疗 {n}', 'BLINK {n}': '闪现 {n}', '{n}/s': '{n}/秒', '{n} kills': '{n} 击杀', 'TRIAL {p}': '试用 {p}',
    'Log in first.': '请先登录。',
    'Please log in first.': '请先登录。',
    'That item is not purchasable.': '这个物品不能购买。',
    'Not enough donuts.\nNeed {a} · You have {b}': '甜甜圈不够。\n需要 {a} · 你有 {b}',
    'Not enough donuts.\nBundle costs {a} · You have {b}': '甜甜圈不够。\n礼包价格 {a} · 你有 {b}',
    'Not enough donuts for trial.\nNeed {a} · You have {b}': '试用的甜甜圈不够。\n需要 {a} · 你有 {b}',
    'Buy "{w}" for {p}?\n\nYou have {n} donuts.': '花 {p} 买「{w}」吗？\n\n你有 {n} 个甜甜圈。',
    'Trial "{w}" for {p} (one match only)?': '花 {p} 试用「{w}」吗？（只限一局）',
    'You already own every item in this bundle!': '这个礼包里的东西你全都有了！',
    '✅ Unlocked {n} new items! Balance: {b} donuts': '✅ 解锁了 {n} 个新物品！余额：{b} 个甜甜圈',
    'Buy one Skin Case Gen 1 for {p}?\n\nOpen it in Lobby 13 to reveal one basic stat-changing skin.': '花 {p} 买一个第一代皮肤箱吗？\n\n在 13 号大厅打开，能开出一个会改变属性的基础皮肤。',
    'Open skin cases in Lobby 13. It is more dramatic there.': '去 13 号大厅开皮肤箱，那里更有气氛。',
    'No unopened Gen 1 cases. Buy one for {p}.': '没有没开的第一代皮肤箱。花 {p} 买一个吧。',
    'You already have an active Admin Pass — {n} min left.': '你的管理员通行证还在生效——还剩 {n} 分钟。',
    'Need {a} · You have {b} donuts': '需要 {a} · 你有 {b} 个甜甜圈',
    'Buy Admin Pass for {p}?\n\nUnlocks EVERY weapon (including admin items) for 10 minutes.': '花 {p} 买管理员通行证吗？\n\n10 分钟内解锁全部武器（包括管理员物品）。',
    'Buy a {t} chest for {p}?': '花 {p} 买一个 {t} 宝箱吗？',
    "You don't have any {t} chests.": '你没有 {t} 宝箱。',
    'That item has no fragment cost.': '这个物品不能用碎片兑换。',
    'Need {a} fragments · You have {b}': '需要 {a} 碎片 · 你有 {b}',
    'Unlock "{w}" for {n} fragments?': '花 {n} 碎片解锁「{w}」吗？',
    'Max level ({n}) reached for that stat.': '这一项已经升到最高级（{n}）。',
    'Enter unlock code:': '输入兑换码：',
    '⚠️ You already have "{item}" unlocked.': '⚠️ 你已经解锁过「{item}」了。',
    '✅ UNLOCKED: {item}\n\nTotal admin items: {n}': '✅ 已解锁：{item}\n\n管理员物品总数：{n}',
    'Your browser does not support canvas video capture.': '你的浏览器不支持录制画面。',
    'Recording not supported: {e}': '不支持录制：{e}',
    'This replay is favorited. Delete anyway?': '这段回放已收藏，还要删除吗？',

    // ── Skins / cases / kill log ─────────────────────────────────────────────
    '🎨 GUN SKINS ': '🎨 枪械皮肤',
    '🎨 COLOUR THEMES': '🎨 配色主题',
    '🔫 WEAPON MODELS': '🔫 武器模型',
    '🔪 MELEE MODELS': '🔪 近战模型',
    'MELEE SKINS': '近战皮肤',
    'One pick applies to every gun. Country themes use real national flags; the German theme is the Iron Cross military mark (no Nazi imagery).': '选一次，所有枪都生效。国家主题用的是真实国旗；德国主题用的是铁十字军徽（不含纳粹标志）。',
    'These replace the gun, not its colour. Same stats, same reload — different weapon in your hands. Press T in game to look it over. 🔒 realistic military skins pull from Gen 1 cases below; the ones that play an animation as you draw them pull from Gen 2.': '这些换的是枪本身，不是颜色。属性一样、换弹一样——只是手里换了一把枪。游戏里按 T 可以仔细看。🔒 写实军用皮肤要从下面的第一代皮肤箱里抽；拔枪时会演一段动画的，要从第二代箱里抽。',
    'These replace the weapon itself, not its colour. Same damage, same reach, same ability — a different object in your hand. 🔒 ones draw with an animation and pull from Gen 2.': '这些换的是武器本身，不是颜色。伤害、攻击距离、技能都一样——只是手里换了个东西。🔒 的那几把拔出来时会演一段动画，要从第二代箱里抽。',
    // character skins (names stay)
    'Standard issue. Your look comes from your name.': '标准配置，外观由名字决定。',
    'Black tactical armor + glowing blue visor.': '黑色战术护甲 + 发蓝光的面罩。',
    'Tactical armor with cool sunglasses.': '战术护甲配一副酷墨镜。',
    'Dark jacket + red bandana. Has patience.': '深色夹克 + 红头巾。很有耐心。',
    'Olive fatigues + combat helmet.': '橄榄绿作训服 + 战斗头盔。',
    'Spiky hair, no helmet. Your P90 does 5 damage.': '刺猬头，不戴头盔。你的 P90 只打 5 点伤害。',
    'Soft green cap. Default loadout enjoyer.': '软软的绿帽子。默认装备爱好者。',
    'All black, pale face. The strongest wear crowns.': '一身黑，脸色苍白。最强的人才戴王冠。',
    "👑 The match's top fragger wears the crown.": '👑 本局击杀最多的人戴王冠。',
    '📦 SKIN CASE GEN 1': '📦 第一代皮肤箱',
    'Buy cases anywhere, but open them in Lobby 13. Each case reveals one basic stat-changing skin.': '皮肤箱在哪都能买，但要在 13 号大厅打开。每个箱子开出一个会改变属性的基础皮肤。',
    'You have not pulled that skin yet. Open Gen 1 cases in Lobby 13.': '你还没抽到这个皮肤。去 13 号大厅开第一代皮肤箱吧。',
    'You have not pulled that skin yet. Open Donut Cases in Lobby 13.': '你还没抽到这个皮肤。去 13 号大厅开甜甜圈箱吧。',
    '🍩 DONUT CASE': '🍩 甜甜圈箱',
    'Pull from the Donut Case.': '需要从甜甜圈箱抽取。',
    'Top-tier cosmetic case. Tiny pool: The Glazer revolver and Ring King katana.': '最高级的外观箱，池子很小：糖霜左轮「The Glazer」和甜甜圈武士刀「Ring King」。',
    '🎬 SKIN CASE GEN 2 · ENTRANCES': '🎬 第二代皮肤箱 · 出场动画',
    'Every skin that plays an animation when you draw it: crystals assembling into an AK, a balisong flipping open, a knife falling out of a black hole. Cases always deal a skin you do not own yet — the Rainbow AK is the one that almost never comes.': '所有拔出来会演一段动画的皮肤都在这里：水晶碎片拼成一把 AK、蝴蝶刀甩开、小刀从黑洞里掉出来。每个箱子都会先给你还没有的皮肤——彩虹 AK 是那个几乎永远抽不到的。',
    'Pull from Gen 2 — it makes an entrance.': '需要从第二代箱抽取——它出场自带动画。',
    'You have not pulled that skin yet. Open Gen 2 cases in Lobby 13.': '你还没抽到这个皮肤。去 13 号大厅开第二代皮肤箱吧。',
    '📦 GEN 1 CASE': '📦 第一代箱', '📦 GEN 2 CASE': '📦 第二代箱', '📦 DONUT CASE': '📦 甜甜圈箱',
    'Buy one Skin Case Gen 1 for {p}?\n\nOpen it in Lobby 13 to reveal one cosmetic skin.': '花 {p} 买一个第一代皮肤箱吗？\n\n在 13 号大厅打开，能开出一个外观皮肤。',
    'Buy one Skin Case Gen 2 for {p}?\n\nOpen it in Lobby 13 to reveal one cosmetic skin.': '花 {p} 买一个第二代皮肤箱吗？\n\n在 13 号大厅打开，能开出一个外观皮肤。',
    'Buy one Donut Case for {p}?\n\nOpen it in Lobby 13 to reveal one cosmetic skin.': '花 {p} 买一个甜甜圈箱吗？\n\n在 13 号大厅打开，能开出一个外观皮肤。',
    'No unopened Skin Case Gen 1s. Buy one for {p}.': '没有没开的第一代皮肤箱。花 {p} 买一个吧。',
    'No unopened Skin Case Gen 2s. Buy one for {p}.': '没有没开的第二代皮肤箱。花 {p} 买一个吧。',
    'No unopened Donut Cases. Buy one for {p}.': '没有没开的甜甜圈箱。花 {p} 买一个吧。',
    'FFA Legend skins are earned in FFA: deal 1,000,000 damage or win 5,000 FFA matches.': 'FFA 传奇皮肤只能在 FFA 里赢得：造成 1,000,000 点伤害，或赢下 5,000 场 FFA 对局。',
    '{a} / 1,000,000 FFA damage · or · {b} / 5,000 FFA wins': '{a} / 1,000,000 FFA 伤害 · 或 · {b} / 5,000 场 FFA 胜利',
    '🔥 FFA LEGEND UNLOCKED — the Legend skins are yours': '🔥 FFA 传奇已解锁 —— 传奇皮肤归你了',
    'NEW SKIN UNLOCKED': '解锁新皮肤',
    'Duplicate. Emotionally devastating, mechanically harmless.': '重复了。心理打击很大，实际没影响。',
    'Mystery Skin': '神秘皮肤',
    'A thing happened.': '发生了点什么。',
    'OK': '好的', 'Cancel': '取消',
    // killcam (#42)
    "KILLER'S VIEW": '击杀者视角', 'BEHIND THE KILLER': '击杀者身后', 'SIDE VIEW': '侧面视角', 'SLOW MOTION': '慢动作', 'SKIP ▶▶': '跳过 ▶▶',
    // names + sign-in (#38, #39)
    '"{name}" is taken — try {s}, or type another': '「{name}」已被使用 —— 试试 {s}，或者换一个',
    '"{name}" is taken — pick another nickname': '「{name}」已被使用，换一个昵称吧',
    'This account just signed in on another device, so this one has been signed out.': '这个账号刚在另一台设备上登录，这里已经下线。',
    '🚪 LOG OUT': '🚪 退出登录',
    'As admin, you always wear the crown.': '你是管理员，王冠永远戴在你头上。',
    '📹 KILL LOG ': '📹 击杀记录',
    'No kills recorded yet — go get some!': '还没有击杀记录——快去打几个！',
    '⭐ favorite (immune to cleanup) · 📌 pin to top · 🗑️ delete · tap the row to watch': '⭐ 收藏（不会被自动清理） · 📌 置顶 · 🗑️ 删除 · 点一行就能观看',
    '🎬 SAVE CLIP': '🎬 保存片段',
    '● REC…': '● 录制中…',
    'Killer': '击杀者', 'Victim': '被击杀者', 'You': '你', 'Player': '玩家',

    // ── Character chat (chat.js; the messages themselves are never touched) ──────────────
    'SEND': '发送',
    'Say something to the crew...': '跟大家说点什么…',
    'Message {name}...': '给 {name} 发消息…',
    '👥 GROUP CHAT — the whole crew (they will fight)': '👥 群聊——全员到齐（他们会吵起来）',
    'Pick someone to chat 1-on-1 · or jump into the Group Chat where the cast argues. Draft as many teammates (⚔️) and opponents (💀) as you like — they spawn next match.': '挑一个人一对一聊天，或者进群聊看角色们吵架。队友（⚔️）和对手（💀）想拉多少拉多少——下一局他们就会出场。',
    'In the room: {who} — type a message (or @name) and watch the chaos.': '在场：{who}——发条消息（或者 @名字），看他们闹起来。',

    // ── Comms wheel (translated where shown; what's sent stays English for the bots) ─────
    'PRIMARY CHAT [Z]': '快捷语 [Z]',
    'SECONDARY CHAT [X]': '快捷语 2 [X]',
    'Run!': '快跑！', 'Charge!': '冲啊！', 'Cover me!': '掩护我！', 'Enemy spotted!': '发现敌人！',
    'Push together!': '一起推进！', 'Fall back!': '撤退！', 'Sorry!': '抱歉！', 'Nice shot!': '好枪法！', 'Scatter!': '散开！',
    'We need to break the deadlock!': '得打破僵局了！', 'Hold position!': '守住位置！', 'Regroup on me!': '到我这集合！',
    'Sniper!': '有狙击手！', 'Watch your flank!': '小心侧翼！', 'Low HP!': '我快没血了！', 'Thanks!': '谢谢！',
    'GG!': 'GG！', 'Distract them!': '吸引火力！',

    // ── Fun facts ────────────────────────────────────────────────────────────
    '💡 The default loadout is more versatile than it looks.': '💡 默认装备其实比看上去好用。',
    '💡 Aiming down sights tightens spread on every gun.': '💡 开镜瞄准能让每把枪都打得更准。',
    '💡 Reloading early loses your reserve bullets — finish the mag.': '💡 提前换弹会浪费备弹——把弹匣打空再换。',
    '💡 You can buy a Trial for 1/20 the price to test a weapon for one match.': '💡 花 1/20 的价格就能试用一把武器一局。',
    '💡 Match wins award more donuts than losses — try to live.': '💡 赢一局拿的甜甜圈比输多——尽量活下来。',
    '💡 Upgrades cost fragments — open chests to stack them.': '💡 升级要花碎片——多开宝箱攒碎片。',
    '💡 Free spin resets daily at midnight UTC.': '💡 免费转盘每天 UTC 零点（北京时间早上 8 点）刷新。',
    '💡 The shop is open between matches from the mode-select screen.': '💡 两局之间可以在模式选择页打开商店。',
    '💡 Tap G to use your weapon ability; cooldown shown bottom-right.': '💡 按 G 使用武器技能，冷却时间显示在右下角。',
    '💡 Free starter loadout: AK20 + SG-8 + Pistol + Flare + Fists + Pan + Frag + Medkit.': '💡 免费初始装备：AK20 + SG-8 + Pistol + Flare + 拳头 + 平底锅 + 破片手雷 + 医疗包。',
    '🎯 Cycler never reloads — perfect for finishing weak enemies.': '🎯 Cycler 从不换弹——补刀残血敌人最合适。',
    '🎯 SR-X one-shots headshots — aim for the dome.': '🎯 SR-X 爆头一枪毙命——瞄准脑袋。',
    '🎯 SG100 hits like a truck up close, useless at range.': '🎯 SG100 近距离像卡车撞过来，远了就没用。',
    '🎯 Stim Shot is faster than Medkit — use it mid-fight.': '🎯 兴奋剂比医疗包快——打架中途就能用。',
    '🎯 Smoke bombs break enemy line-of-sight even with wallhacks.': '🎯 烟雾弹能挡住敌人视线，开了透视也看不见。',
    '🎯 Vampire Blade heals you per hit — duel multiple enemies.': '🎯 吸血刃每砍一下都回血——一挑多也不怕。',
    '🎯 RPD has no reload — perfect for prolonged firefights.': '🎯 RPD 不用换弹——最适合持久战。',
    '🎯 Knife users move 2× as fast — close gaps fast.': '🎯 拿刀跑得快一倍——迅速贴近敌人。',
    '🎯 Boombow charges up — a fully-drawn shot ignores armor.': '🎯 爆破弓要蓄力——拉满的一箭无视护甲。',
    '🎯 Throwing a frag at your feet during a finisher kills you and them.': '🎯 绝境时往脚下扔手雷，能和对方同归于尽。',
    "🎯 KOTH gives 3 lives — don't waste them rushing the center first.": '🎯 山丘之王有 3 条命——别一开局就冲中间送掉。',
    '🤫 Electric weapons hit harder on ice and water.': '🤫 电系武器在冰面和水里伤害更高。',
    '🤫 Fire weapons burn hotter in the forest.': '🤫 火系武器在森林里烧得更旺。',
    '🤫 Gravity weapons amplify in low-gravity zones.': '🤫 重力武器在低重力区威力更大。',
    '🤫 Frost weapons are extra brutal in the tundra.': '🤫 冰系武器在冻原格外凶残。',
    '🤫 Some sci-fi weapons grant you a double jump while equipped.': '🤫 有些科幻武器拿在手上能二段跳。',
    '🤫 You can climb the skyscraper in URBAN.': '🤫 在 URBAN 地图可以爬上摩天楼。',
    "🤫 Chernobyl's 4 reactors can be destroyed for an XP bonus.": '🤫 切尔诺贝利的 4 座反应堆炸掉有额外奖励。',
    '🤫 Airport glass + lights are breakable.': '🤫 机场的玻璃和灯都能打碎。',
    '🤫 Mortars in Trenches can be piloted by holding E.': '🤫 壕沟地图的迫击炮按住 E 就能操作。',
    '🤫 Helicopters in KOTH can be hijacked mid-air.': '🤫 山丘之王里的直升机能在半空中被劫走。',
    "🤫 The admin password is `(redacted)` — but it's patched now anyway.": '🤫 管理员密码是 `(已删除)`——反正已经修掉了。',
    '🤫 Type the right unlock code and get free admin weapons.': '🤫 输对兑换码就能免费拿管理员武器。',
    '🤫 0.3% wheel jackpot drops a random rare weapon ≥40,000 donuts.': '🤫 转盘有 0.3% 的大奖，送一把价值 40,000 甜甜圈以上的稀有武器。',
    '😂 Chainsaw users are legally required to scream while charging.': '😂 拿电锯冲锋的人按规定必须边冲边喊。',
    '😂 Frying Pan does NOT in fact deflect bullets. Stop trying.': '😂 平底锅真的挡不住子弹，别试了。',
    "😂 Confetti Cannon is everyone's favorite useless weapon.": '😂 彩纸炮是大家最爱的没用武器。',
    '😂 Trash123 has every admin item. Suspicious.': '😂 Trash123 拥有所有管理员物品，很可疑。',
    "😂 Tennis Racket reflects bullets. We don't know how.": '😂 网球拍能把子弹打回去，我们也不知道为什么。',
    '😂 Baguette ability "Eat" heals you. Carbs.': '😂 法棍的技能「吃」能回血。碳水的力量。',
    '😂 Royal Minigun costs 3500. The "Royalty Bundle" includes 4 of those-tier items for 4500. Math.': '😂 皇家机枪要 3500。「皇家礼包」里有 4 件同级别的东西只要 4500。自己算吧。',
    '😂 If you punch the wall, the wall punches back. Not really.': '😂 你打墙，墙会打回来。开玩笑的。',
    '😂 Tac Nuke is balanced because it costs 250 of your fragile feelings.': '😂 战术核弹很平衡，因为它要花掉你 250 点脆弱的感情。',
    '😂 Fists are free. They have always been free. They will always be free.': '😂 拳头免费。一直免费。永远免费。',
  };

  // ── engine ───────────────────────────────────────────────────────────────
  const STORE = 'pvp_lang';
  function detect() {
    try { const s = localStorage.getItem(STORE); if (s === 'en' || s === 'zh') return s; } catch (e) {}
    const langs = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || ''];
    return langs.some(l => /^zh\b/i.test(l)) ? 'zh' : 'en';
  }
  let lang = detect();

  const isPattern = k => /\{\w+\}/.test(k);
  const norm = k => k.replace(/\s+/g, ' ').trim(); // "Open chests…\n      Use 100…" ↔ one spaced line
  const exact = new Map();
  for (const [k, v] of Object.entries(ZH)) if (!isPattern(k)) exact.set(norm(k), v);
  const patterns = Object.entries(ZH).filter(([k]) => isPattern(k)).map(([k, v]) => {
    const names = [];
    const src = norm(k).split(/(\{\w+\})/).map(part => {
      const m = /^\{(\w+)\}$/.exec(part);
      if (m) { names.push(m[1]); return m[1] === 'rest' ? '([\\s\\S]*?)' : '((?:(?! · )[\\s\\S])*?)'; }
      return part.replace(/[.*+?^$()|[\]\\{}]/g, '\\$&');
    }).join('');
    return { re: new RegExp('^' + src + '$'), names, zh: v, weight: k.replace(/\{\w+\}/g, '').length };
  }).sort((a, b) => b.weight - a.weight);   // the most specific (longest literal) first

  const cache = new Map();
  function lookup(core) {
    let hit = cache.get(core);
    if (hit !== undefined) return hit;
    hit = exact.has(core) ? exact.get(core) : null;
    if (hit === null) {
      for (const p of patterns) {
        const m = p.re.exec(core);
        if (!m) continue;
        hit = p.zh.replace(/\{(\w+)\}/g, (all, name) => {
          const i = p.names.indexOf(name);
          if (i < 0) return all;
          const v = m[i + 1], tv = v.trim();
          return exact.has(tv) ? v.replace(tv, exact.get(tv)) : v; // a captured known phrase gets translated too
        });
        break;
      }
    }
    // "a · b · c" — cards, shop rows and banners are built from parts; translate part by part
    if (hit === null && core.includes(' · ')) {
      let changed = false;
      const parts = core.split(' · ').map(seg => {
        const tseg = seg.trim(), r = tseg ? lookup(tseg) : null;
        if (r == null) return seg;
        changed = true;
        return seg.replace(tseg, r);
      });
      if (changed) hit = parts.join(' · ');
    }
    if (cache.size > 4000) cache.clear();
    cache.set(core, hit);
    return hit;
  }
  function translateString(s) {
    if (lang !== 'zh' || !s || !/[A-Za-z]/.test(s)) return s;
    const lead = /^\s*/.exec(s)[0], trail = /\s*$/.exec(s)[0];
    const core = norm(s.slice(lead.length, s.length - trail.length));
    const hit = lookup(core);
    return hit == null ? s : lead + hit + trail;
  }
  function t(s, vars) {
    if (s == null) return s;
    let out = translateString(String(s));
    if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
    return out;
  }

  // ── the DOM side ─────────────────────────────────────────────────────────
  // input stays in: only its placeholder/title are touched, never its value
  const SKIP = '[data-no-i18n], script, style, textarea, select, #err, #cc-msgs';   // chat lines carry data-no-i18n now (#29)
  const ATTRS = ['placeholder', 'title', 'aria-label'];
  const textSrc = new WeakMap();   // text node → { src: English, out: what we wrote }
  const attrSrc = new WeakMap();   // element → { [attr]: { src, out } }

  function translateText(node) {
    const cur = node.nodeValue;
    const known = textSrc.get(node);
    const src = (known && cur === known.out) ? known.src : cur; // our own write → keep the source
    const out = translateString(src);
    if (out !== src || known) textSrc.set(node, { src, out });
    if (out !== cur) node.nodeValue = out;
  }
  function translateAttrs(el) {
    let rec = attrSrc.get(el);
    for (const a of ATTRS) {
      if (!el.hasAttribute(a)) continue;
      const cur = el.getAttribute(a);
      const known = rec && rec[a];
      const src = (known && cur === known.out) ? known.src : cur;
      const out = translateString(src);
      if (out !== src || known) { rec = rec || {}; rec[a] = { src, out }; attrSrc.set(el, rec); }
      if (out !== cur) el.setAttribute(a, out);
    }
  }
  function skipped(el) { return !!(el && el.closest && el.closest(SKIP)); }
  function translateTree(root) {
    if (!root) return;
    if (root.nodeType === 3) { if (!skipped(root.parentElement)) translateText(root); return; }
    if (root.nodeType !== 1 || skipped(root)) return;
    translateAttrs(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: n => (n.nodeType === 1 && n.matches(SKIP)) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
    });
    for (let n = walker.nextNode(); n; n = walker.nextNode()) n.nodeType === 3 ? translateText(n) : translateAttrs(n);
  }
  const observer = new MutationObserver(muts => {
    for (const m of muts) {
      if (m.type === 'characterData') translateTree(m.target);
      else if (m.type === 'attributes') { if (!skipped(m.target)) translateAttrs(m.target); }
      else for (const n of m.addedNodes) translateTree(n);
    }
  });

  // Dialogs never reach the DOM.
  const _alert = window.alert.bind(window), _confirm = window.confirm.bind(window), _prompt = window.prompt.bind(window);
  window.alert = m => _alert(t(m));
  window.confirm = m => _confirm(t(m));
  window.prompt = (m, d) => _prompt(t(m), d);

  function applyLangAttr() {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.querySelectorAll('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  }
  function setLang(next) {
    if ((next !== 'en' && next !== 'zh') || next === lang) return;
    lang = next;
    try { localStorage.setItem(STORE, next); } catch (e) {}
    cache.clear();
    applyLangAttr();
    translateTree(document.body);
    document.dispatchEvent(new CustomEvent('langchange', { detail: next }));
  }

  // Exact phrases only — for text people type (chat), where a pattern like "BUY {p}" must never fire.
  function exactOnly(s) {
    if (lang !== 'zh' || s == null) return s;
    const k = norm(String(s));
    return exact.has(k) ? exact.get(k) : s;
  }

  window.I18N = { t, exact: exactOnly, setLang, get lang() { return lang; }, translate: translateTree };

  // Loaded at the end of <body>, before game.js: the static markup is already here.
  applyLangAttr();
  translateTree(document.body);
  observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-lang]');
    if (b) setLang(b.dataset.lang);
  });
})();
