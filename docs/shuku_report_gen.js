// 宿曜自動鑑定書生成モジュール
// Day7保存時・鑑定書ページ表示時に自動生成し localStorage に保存する
// window.TsukiyomiReportGen として公開

(function(global){
  var AUTO_REPORT_KEY_PREFIX = 'tsukiyomi:autoReport:v1:';
  var STRUCTURED_DIARY_PREFIX = 'tsukiyomi:structuredDiary:v1:';

  // ===== 宿曜メッセージ =====
  var SHUKU_MSG = {
    '角宿':{ quality:'知性と調和の宿。広い視野で物事を見渡しながらバランスを保つ力が土台にあります。頭と心の両方を使うことで、最も自然に輝ける宿です。', next:'多様な人との交流の中で知恵が磨かれます。「学ぶ・伝える・つながる」を意識すると、道がひらけていきます。' },
    '亢宿':{ quality:'整える力と誠実さの宿。地に足のついた実践力が最大の土台です。急がず着実に積み上げることで、最も安定した豊かさへの道がひらきます。', next:'丁寧な日常の積み重ねが、やがて大きな信頼になります。「ひとつひとつ、ていねいに」を合言葉に。' },
    '氐宿':{ quality:'包容力と受け入れの宿。どんな人もやさしく迎える深い心の器があります。与えることと受け取ることのバランスを整えると、豊かな流れが自然に生まれます。', next:'縁をつなぐ天性の才能があります。人のために動くことが、めぐりめぐって自分の豊かさになる宿です。' },
    '房宿':{ quality:'情と信頼の宿。深い感情の力と、人を温かく迎える器があります。誠実に関係を育てることで、あなたの力は最大限に発揮されます。', next:'居場所をつくることが開運の鍵です。「ここにいていい」と感じられる場所を大切にしてください。' },
    '心宿':{ quality:'中心力と意志の宿。ぶれない核と強い意志力があります。自分の感覚を信じて進むとき、道は自然とひらけていきます。', next:'感情の豊かさが創造力の源です。「好きなこと」「心が動くこと」を手放さないでください。' },
    '尾宿':{ quality:'根を張る持続力の宿。一度決めたことを最後まで続けられる力があります。急がず時間をかけて熟成させることが、大きな実りにつながります。', next:'継続の先に、あなたらしい世界が花開きます。今すぐ結果が出なくても、根は確かに育っています。' },
    '箕宿':{ quality:'受け取る豊かさの宿。感謝の心と、恵みを自然に引き寄せる力があります。「もっと欲しい」より「今あることに気づく」視点が、豊かさの循環を加速させます。', next:'喜びを素直に表現することが才能です。ありがとうと感じた瞬間を言葉にすると、流れが変わります。' },
    '斗宿':{ quality:'量る知恵と調和の宿。物事の価値を見抜き、バランスよく整える力があります。「適切さ」を大切にする感覚が、周囲に安心感をもたらします。', next:'量と質、どちらも整えることで力が発揮されます。過不足なく、ちょうどいい「自分サイズ」を大切に。' },
    '女宿':{ quality:'柔軟性と美の宿。状況に応じてしなやかに形を変えながら、美しくあり続ける力があります。環境への適応力と美しいものへの感性が、大きな武器です。', next:'流れに乗る柔軟さが開運の道です。「こうあるべき」より「今の自分にできること」を大切に。' },
    '虚宿':{ quality:'空間と本質を見出す宿。余白の中に真実を見つける深い感性があります。「何もしない」時間が、実は最も豊かな気づきをもたらします。', next:'引き算の美学と静かな洞察力が最大の才能です。ゆっくりと、深く感じることを許してあげてください。' },
    '危宿':{ quality:'変化を乗り越える力の宿。試練をくぐり抜け、そこから強さを育てる力があります。危機こそが、あなたを次のステージへ連れていく扉です。', next:'変化を恐れず流れを信頼することが開運の鍵です。「大変だった」ことが、実は最大の財産になります。' },
    '室宿':{ quality:'守る力と包む温かさの宿。安全な場をつくり、人を温かく包む力があります。「安心」を提供することが天性の才能であり、そのまま使命につながります。', next:'自分を守ることと人を守ることは、同じ力から来ています。自分へのやさしさを忘れずに。' },
    '壁宿':{ quality:'境界と創造の宿。自分の軸をしっかり守りながら、新しい可能性に向けてひらいていく力があります。「守る」と「ひらく」のバランスが豊かさを生み出します。', next:'NOと言える強さが、本当のYESを生み出します。自分の境界線を大切にしながら進んでください。' },
    '奎宿':{ quality:'言葉と表現の宿。言葉や文章で世界とつながる才能があります。書くこと、伝えること、表現することが、自然とご縁とエネルギーを引き寄せます。', next:'書き続けてください。日記に残した言葉は、すでに未来のあなたへの手紙になっています。' },
    '婁宿':{ quality:'集める力とご縁の宿。人・物・チャンスを自然に引き寄せる磁力があります。ご縁を大切に育てることで、豊かさは循環していきます。', next:'与えた分が、形を変えて戻ってくる宿です。先に与えることへの信頼を深めてください。' },
    '胃宿':{ quality:'蓄える力と着実さの宿。コツコツと積み上げる誠実な力があります。表面的な速さより、深く根を張ることを選ぶとき、最も安定した豊かさが育まれます。', next:'蓄積が最大の武器です。今日の小さな一歩が、半年後の大きな実りになります。' },
    '昴宿':{ quality:'輝きと集中力の宿。一点に力を集めることで大きな光を放つ才能があります。「好き」「得意」に思いきり集中することが、道をひらく鍵です。', next:'輝くべき時を知る感性があります。広げすぎず、本当に大切なことに絞ることで、可能性が加速します。' },
    '畢宿':{ quality:'完成させる力の宿。物事を最後まで丁寧に仕上げる誠実さがあります。中途半端を嫌い、完成させることへのこだわりが、信頼と実績を積み上げます。', next:'「終わらせる」という行為が、次の始まりをひらきます。7日間を最後まで歩いたことが、その証明です。' },
    '觜宿':{ quality:'言葉と知性の宿。伝える力と好奇心があります。話す・書く・学ぶことが自然に力になる宿で、コミュニケーションが最大の開運ツールです。', next:'「伝える」ことが使命と結びついています。学んだことを誰かに話す習慣が、あなたの流れを動かします。' },
    '参宿':{ quality:'挑戦する勇気の宿。新しいことに果敢に立ち向かう行動力があります。動くことで道が見える宿です。まず踏み出すことが開運の鍵です。', next:'まず動いてみてください。完璧な準備より、不完全でも始めることがエネルギーを生みます。' },
    '井宿':{ quality:'深く掘る探究力の宿。表面だけでなく本質を探り当てる洞察力があります。深く学び、深く感じることが最大の資質です。', next:'本物の知恵を積み重ねることで道がひらきます。「なぜ？」という問いを大切にし続けてください。' },
    '鬼宿':{ quality:'見通す力と直感の宿。言葉にならない本質をつかむ直感力があります。頭より感覚を信じるとき、最も正確な判断ができます。', next:'感度を大切に。「なんとなく気になる」という感覚が、あなたにとっての羅針盤です。' },
    '柳宿':{ quality:'流れに乗る感性の宿。時流を読み、しなやかに変化していく適応力があります。「流れ」を信頼し、抵抗せずに進むことが最大の開運行動です。', next:'流れに逆らわないでください。今感じている「変わりたい」という気持ちは、正しい方向を指しています。' },
    '星宿':{ quality:'輝きを放つ存在感の宿。ただそこにいるだけで場を照らす力があります。自分の個性を隠さず輝かせることが、使命につながります。', next:'「目立ちすぎる」ことへの遠慮を手放してください。あなたの光は、誰かの道しるべになっています。' },
    '張宿':{ quality:'広げる力と影響力の宿。ビジョンを描き、周囲を巻き込んでいく力があります。大きく考え、広く動くことで、力は最大限に発揮されます。', next:'大きなビジョンを持ち続けてください。「自分にはまだ早い」という思いを越えた先に、本当の舞台があります。' },
    '翼宿':{ quality:'飛翔する自由の宿。枠を超えて飛び立つ創造力と自由な精神があります。「常識」より「自分の感覚」を優先するとき、最も輝ける宿です。', next:'制限を外してください。「こうあるべき」という思い込みが薄れるほど、可能性がひろがります。' },
    '軫宿':{ quality:'完結させる知恵の宿。物事の全体像を見渡し、美しくまとめあげる力があります。終わりを大切にする感性が、次のサイクルを豊かに育てます。', next:'区切りをつけることを大切にしてください。「手放す」という行為が、次の恵みを受け取る器を整えます。' }
  };

  // ===== 宿命ギャップ分析データ =====
  var SHUKU_ANALYSIS = {
    '昴宿':{ keywords:['理想','集中','こだわり','夢','目標','光','一点'],     label:'気高き理想の求道力',         gapAdvice:'力が散らばっている段階です。「これだけ」と決めて一点に絞るとき、昴宿の力が最大限に輝きます。今日、一つに絞る選択をしてみてください。',                                             alignAdvice:'「これだ」という集中のエネルギーが育っています。そのこだわりをもう一段深めていくときです。' },
    '畢宿':{ keywords:['続け','続く','丁寧','着実','完成','最後まで','誠実'],  label:'一途な初志の継続力',         gapAdvice:'始めることより「続けること」に意識を向けてみてください。畢宿の力は継続の中でこそ輝きます。今取り組んでいることをもう一日続けることが、宿命を活かす一歩になります。',             alignAdvice:'丁寧に続けているその姿勢が、信頼という大きな実を着実に育てています。' },
    '觜宿':{ keywords:['言葉','話','伝え','書','学','知識','聞','説明'],       label:'知識が宿る言葉の説得力',     gapAdvice:'あなたの宿命は言葉と知識で現実を動かすこと。7日間で感じた気づきを誰かに話す・書いて伝えるという行動が、宿命を活かす一歩になります。',                                          alignAdvice:'言葉の力を自然に使えています。その知識と言葉をさらに「伝える場」に活かしていくと、流れが加速します。' },
    '参宿':{ keywords:['動','やってみ','行動','試','挑戦','やった','始め'],    label:'繊細な気配りの勤勉力',       gapAdvice:'参宿の宿命は「まず動くこと」。完璧な準備より、小さくても動き始めることがエネルギーの源です。今日、一つだけ小さな行動を起こしてみてください。',                              alignAdvice:'動いている自分を感じています。その行動力をさらに方向性と結びつけると、勢いが加速します。' },
    '井宿':{ keywords:['なぜ','考え','分析','調べ','本質','理由','論','深'],   label:'高みへ向かう論理の推進力',   gapAdvice:'「なぜそう感じるのか」を一言掘り下げることが、井宿の力を使うことになります。表面の感情の下に、あなたの答えが隠れています。',                                                   alignAdvice:'深く考える力がすでに働いています。その洞察をアウトプットする場をひとつ作ると、力がさらに磨かれます。' },
    '鬼宿':{ keywords:['感じ','なんとなく','直感','気になる','ワクワク','ピン','ひらめ'],label:'弾む好奇心の明るい引力',gapAdvice:'「なんとなく」という感覚を大切にしてください。鬼宿の力は頭より先に感じる直感の中にあります。その感覚に従った小さな選択が、次の扉を開きます。',          alignAdvice:'感性のアンテナが動いています。その「ピンと来た」感覚を行動につなげる習慣を大切に。' },
    '柳宿':{ keywords:['流れ','変化','変わ','タイミング','柔軟','しなやか','合わせ'],  label:'芯の通った開拓の胆力',   gapAdvice:'「流れに乗れていない」感覚があるなら、それは流れを読もうとしている証拠です。柳宿の力は抵抗をやめた瞬間に動き始めます。「どう流れたいか」を感じてみてください。',          alignAdvice:'流れを感じながら動けています。その柔軟さが、次のステージへの扉を自然に開きます。' },
    '星宿':{ keywords:['輝','発信','伝え','表現','見せ','個性','目立'],        label:'夢を追い続ける純粋な底力',   gapAdvice:'星宿の宿命は「ただそこにいるだけで場を照らすこと」。自分を隠さず表現する一歩が使命とつながります。今日、自分らしい一言を誰かに届けてみてください。',                      alignAdvice:'すでに自分を表現しています。その輝きを広げることをもう少し意識してみてください。' },
    '張宿':{ keywords:['広げ','ビジョン','影響','リード','巻き込','大きく','未来'],    label:'場を彩る華やかな統率力',   gapAdvice:'張宿の力は「大きく描くこと」から始まります。今感じていることを10倍のスケールで考えてみてください。そのビジョンが周囲を動かすエネルギーになります。',                      alignAdvice:'大きな視点が育っています。そのビジョンをさらに言葉にして人に伝えていくと、動きが加速します。' },
    '翼宿':{ keywords:['自由','制限','枠','独自','創造','自分だけ','ユニーク'],label:'自由に羽ばたく完璧への追求力',gapAdvice:'「こうあるべき」という枠を一つ外してみてください。翼宿の力は、自分を縛っているものを手放した瞬間に羽ばたきます。',                                            alignAdvice:'自分らしい感覚が育っています。その「これが私」という感覚を、もっと信頼してください。' },
    '軫宿':{ keywords:['まとめ','整え','完結','終わり','区切り','全体','手放'],label:'奥ゆかしさに宿る社交の温かさ',gapAdvice:'軫宿の力は「終わらせること」にあります。今抱えているものの中で手放せるものを一つ選んでみてください。手放すことで、次の恵みが入ってきます。',                    alignAdvice:'整える力が働いています。完結させた後の余白に、次の豊かさが育まれます。' },
    '角宿':{ keywords:['伝え','交流','学','つながり','バランス','調和','知恵'],label:'器用さが生む颯爽たる行動力',  gapAdvice:'角宿の力は「学びとつながり」の中で輝きます。今日学んだことを一人に話す、または一つの学びを行動に変える習慣が、宿命を活かすカギです。',                                    alignAdvice:'交流と知性の力が育っています。そのつながりをさらに深める場をひとつ設けると、流れが加速します。' },
    '亢宿':{ keywords:['丁寧','誠実','着実','正直','正しい','真面目','コツコツ'],label:'揺るぎない正義のこだわり力',gapAdvice:'亢宿の力は「ひとつひとつを丁寧にやること」にあります。今日できる一番丁寧なことを一つ選んで、そこに意識を向けてみてください。',                                   alignAdvice:'誠実な姿勢が育っています。その着実さが、長期的な信頼と豊かさの土台になります。' },
    '氐宿':{ keywords:['受け取','与え','縁','包む','やさしさ','迎え','感謝'],  label:'地に足ついた目標の実現力',   gapAdvice:'氐宿の力は「受け取ること」からも育ちます。与えることに慣れているあなたが、今日誰かの好意を素直に受け取る練習が、宿命を活かすことになります。',                        alignAdvice:'縁をつなぐ力が働いています。その温かさが、あなたの周りの人の安心感の源になっています。' },
    '房宿':{ keywords:['安心','居場所','信頼','温かい','感情','深い','誠実'],  label:'財運と人気を呼ぶ自然な引力',  gapAdvice:'房宿の力は「感情を大切にすること」にあります。今感じていることを正直に言葉にする習慣が、深い信頼関係を育てます。「今どう感じているか」を一言書いてみてください。',        alignAdvice:'感情の力が育っています。その誠実さが、周囲の信頼を自然に引き寄せています。' },
    '心宿':{ keywords:['好き','心が動','ワクワク','意志','決めた','情熱','中心'],label:'気遣いに宿る表現の妙',     gapAdvice:'心宿の力は「好き・やりたい」という感情の中心から生まれます。「今一番心が動くもの」を一つ選んで、それだけに今日は意識を向けてみてください。',                             alignAdvice:'心の動きに正直に向き合っています。その「好き」という感覚が、使命への地図になります。' },
    '尾宿':{ keywords:['続け','毎日','習慣','積み重','じっくり','根気','熟成'],label:'器用さと頑固さが生む職人の矜持',gapAdvice:'尾宿の力は「時間をかけること」にあります。今すぐ結果が出なくても、根は育っています。今取り組んでいることをもう少し続けてみてください。その先に実りがあります。',alignAdvice:'継続の力が着実に積み上がっています。その根の深さが、やがて大きな実になります。' },
    '箕宿':{ keywords:['感謝','ありがとう','嬉しい','喜び','幸せ','良かった','楽しい'],label:'度胸が光る場の掌握力',gapAdvice:'箕宿の力は「感謝に気づくこと」から流れ出します。今日あったことの中で「ありがとう」と感じた瞬間を一つ見つけ、それを声に出してみてください。',            alignAdvice:'感謝と喜びの感覚が育っています。その豊かさを表現することが、さらに恵みを引き寄せます。' },
    '斗宿':{ keywords:['バランス','量','適切','整え','過不足','ちょうど','調整'],label:'知性で切り拓く征服の眼力',  gapAdvice:'今感じている「多すぎる・少なすぎる」という感覚を信じてください。その感覚がバランスを整えるサインです。一つ「ちょうどいい量」に調整してみてください。',                   alignAdvice:'適切さへの感覚が働いています。その「ちょうどいい」感覚を大切に、判断の軸にしていってください。' },
    '女宿':{ keywords:['柔軟','しなやか','美','感性','適応','環境','合わせ'],  label:'秩序の中に輝く揺るぎない実力',gapAdvice:'「こうあるべき」という硬さを少し緩めたとき、女宿本来の柔軟さが戻ってきます。無理せず今の環境に合わせることが、この宿の開運行動です。',                     alignAdvice:'流れに乗るしなやかさが育っています。その適応力がさらに美しく発揮されていきます。' },
    '虚宿':{ keywords:['余白','静か','深く','感じ','本質','ゆっくり','気づき'],label:'感性と知性が交わる独自の洞察力',gapAdvice:'虚宿の力は「何もしない時間」から生まれます。忙しさの中でも一つ余白を作ってみてください。静かな時間の中に、あなたへの答えがあります。',                    alignAdvice:'深く感じる力が育っています。その静かな洞察が、周囲への大きな贈り物になっています。' },
    '危宿':{ keywords:['乗り越え','変化','試練','強','回復','前に進','できた'],label:'行動力が広げる社交の輪',      gapAdvice:'今感じている「大変だ」という感覚は、次のステージへの入口です。危宿の力は変化の中で育つもの。乗り越えた先に、新しいあなたがいます。',                                     alignAdvice:'変化を前向きに受け取る力が育っています。その強さがさらに深まっていきます。' },
    '室宿':{ keywords:['守る','安心','安全','場所','温かい','包む','居場所'],  label:'無邪気なやんちゃさが生む場の求心力',gapAdvice:'室宿の力は「自分自身を守ること」から始まります。まず自分の心に「安心」をひとつ贈ってください。自分へのやさしさが、人を守る力の源になります。',              alignAdvice:'守る力と温かさが育っています。その安心感が、周囲の人の居場所になっています。' },
    '壁宿':{ keywords:['境界','断','自分軸','こだわり','信念','決めた','外せない'],label:'冷静さに宿る鋭い分析力',  gapAdvice:'「これはしない」と決めることが、逆に新しい可能性を開きます。壁宿の力は境界線の中に宿ります。今日一つ、自分の「NO」を大切にしてください。',                            alignAdvice:'自分の軸が育っています。その「ここは外せない」という感覚が、本当のYESへとつながっています。' },
    '奎宿':{ keywords:['書く','言葉','文章','表現','発信','伝え'],             label:'多彩な趣味が彩る理想の世界観', gapAdvice:'奎宿の宿命は「言葉で世界とつながること」。今日感じたことを一文で書いてみてください。その一行が、あなたの表現の力を育てます。書くことが最大の開運行動です。',              alignAdvice:'言葉を使う力が育っています。その表現をもっと外に向けて発信していくことで、さらにご縁が広がります。' },
    '婁宿':{ keywords:['与え','先に','贈る','人のために','ご縁','つながり','引き寄せ'],label:'一歩引く懐深さが生む行動の余白',gapAdvice:'婁宿の力は「先に与えること」から循環が始まります。見返りを考えずに誰かのために動いた経験が、やがて豊かさとなって戻ってきます。今日、一つ「与える」選択をしてみてください。',alignAdvice:'与える循環が育っています。その磁力が、自然とご縁と豊かさを引き寄せています。' },
    '胃宿':{ keywords:['積み上げ','蓄積','コツコツ','着実','誠実','実力','根'],label:'光る個性の求心力',            gapAdvice:'胃宿の力は「日々の積み上げ」にあります。今日できる小さな一つを積み上げてください。半年後のあなたは、今日の積み上げによって大きく変わっています。',                     alignAdvice:'蓄積の力が着実に育っています。その誠実な積み上げが、長期的な豊かさの礎になっています。' }
  };

  // ===== qテキストからの具体テーマ抽出 =====
  var KEY_THEME_RULES = [
    { kws: ['起業','独立'],               label: '起業・独立への道' },
    { kws: ['ビジネス','事業','講座'],    label: 'ビジネスの展開' },
    { kws: ['退職','辞め','やめる'],      label: '新しいステージへの移行' },
    { kws: ['転職'],                      label: '働き方の転換' },
    { kws: ['使命','やりたいこと','天職'], label: '使命・本当にやりたいこと探し' },
    { kws: ['副業','収入の柱'],           label: '収入の柱を増やすこと' },
    { kws: ['借金','返済','自己破産'],    label: 'お金の流れのリセット' },
    { kws: ['収入','稼ぐ','稼げ'],        label: '収入アップ' },
    { kws: ['結婚'],                      label: '結婚・パートナーシップ' },
    { kws: ['離婚'],                      label: '新しいつながりへの扉' },
    { kws: ['息子','娘','子供','子ども','受験'], label: '子供・家族の未来' },
    { kws: ['介護'],                      label: '介護と自分の両立' },
    { kws: ['リウマチ','病気','療養','休職'], label: '体の回復と心の安定' },
    { kws: ['不安','心配'],               label: '不安の解放' },
    { kws: ['人間関係','嫉妬','ライバル'], label: '人間関係の整え' },
    { kws: ['退屈','やる気','熱量'],      label: '情熱の再点火' },
    { kws: ['自分らしさ','本音','本当の自分'], label: '本当の自分を取り戻すこと' }
  ];

  function extractKeyTheme(qText) {
    var t = qText || '';
    for (var i = 0; i < KEY_THEME_RULES.length; i++) {
      var hit = KEY_THEME_RULES[i].kws.some(function(kw){ return t.indexOf(kw) !== -1; });
      if (hit) return KEY_THEME_RULES[i].label;
    }
    return null;
  }

  function extractQAction(qText) {
    var t = qText || '';
    if (/起業|独立/.test(t))             return '「これをやる」と決めた一つを、今週中に小さく動かしてみてください。完璧な準備より、動き始めることがエネルギーを生みます。';
    if (/ビジネス|講座|事業/.test(t))    return '今取り組んでいることを続けながら、発信の形をひとつだけ変えてみることがヒントになります。';
    if (/退職|辞め|転職/.test(t))        return '今感じているモヤモヤは、次の方向性のヒントです。急がず、感じ続けてください。';
    if (/使命|やりたいこと|天職/.test(t)) return '「好きなこと」と「自然にできること」が重なる瞬間を、日常の中でひとつ見つけてください。';
    if (/副業/.test(t))                   return '今ある資源（時間・得意・人脈）をひとつ書き出してみることが、次の柱の種になります。';
    if (/借金|返済|自己破産/.test(t))     return 'まず現状を紙に書き出すこと。それだけで、お金の流れは動き始めます。';
    if (/収入|稼ぐ|稼げ/.test(t))         return '収入より先に「何を提供したいか」を一言で言えるようにすると、流れが変わります。';
    if (/結婚/.test(t))                   return '自分が心地よいと感じる関係のかたちを、一言で書いてみてください。';
    if (/息子|娘|子供|受験/.test(t))      return '大切な人の未来を信頼することが、あなた自身の力になります。';
    if (/介護/.test(t))                   return '自分を満たすことが、支える力になります。まず自分へのやさしさを一つ選んでください。';
    if (/リウマチ|病気|療養|休職/.test(t)) return '今日の体の声をひとつ聞いてあげることが、最大の開運行動です。';
    if (/不安|心配/.test(t))              return '不安を感じている自分に「よく気づいているね」と声をかけてあげてください。それが解放の入口です。';
    if (/人間関係|嫉妬/.test(t))          return '距離感を一つ整えるだけで、エネルギーの流れが変わります。';
    if (/自分らしさ|本当の自分/.test(t))  return '「これは自分らしい」と感じる瞬間を、今日一つ見つけてください。';
    return null;
  }

  function analyzeShukuGap(diaryText, shuku) {
    var a = SHUKU_ANALYSIS[shuku];
    if (!a || !diaryText) return null;
    var hitWords = [];
    a.keywords.forEach(function(kw){ if (diaryText.indexOf(kw) !== -1) hitWords.push(kw); });
    return { aligned: hitWords.length >= 2, hitCount: hitWords.length, hitWords: hitWords, label: a.label };
  }

  function openingFromConcern(concern) {
    return /仕事/.test(concern)             ? 'この7日間で、あなたは「働く自分」を深いところから見つめてきました。'
         : /お金/.test(concern)             ? 'この7日間で、あなたは「豊かさ」というテーマと静かに向き合いました。'
         : /恋愛/.test(concern)             ? 'この7日間で、あなたは「つながり」という深いテーマを歩きました。'
         : /家族/.test(concern)             ? 'この7日間で、あなたは「縁」というテーマを丁寧に歩きました。'
         : /健康/.test(concern)             ? 'この7日間で、あなたは「体と心の声」に耳を澄ませてきました。'
         : /自分らしさ|生き方/.test(concern) ? 'この7日間で、あなたは「自分とは何者か」という問いを歩きました。'
         : 'この7日間で、あなたは自分の内側と静かに向き合ってきました。';
  }

  function genSection1(concern, q, shuku, diary) {
    var keyTheme = extractKeyTheme(q || '');
    var opening = keyTheme
      ? 'この7日間で、あなたは「' + keyTheme + '」というテーマと向き合ってきました。'
      : openingFromConcern(concern);
    var gap = analyzeShukuGap(diary, shuku);
    var a = SHUKU_ANALYSIS[shuku];
    if (gap && a) {
      if (gap.aligned) {
        return opening + '\n\n日記の言葉に、あなたの宿命「' + a.label + '」が自然に現れています。その感覚は本物です。その流れをさらに信じて深めていくときです。';
      } else {
        return opening + '\n\n感情に気づく力は育っています。「' + a.label + '」というあなたの宿命の力が、まだ日常の表に出てきていない段階かもしれません。それは今後の伸びしろです。';
      }
    }
    return opening + '\n\n答えはまだ出ていなくていい。今のあなたは、表面的な正解ではなく、心の奥にある本当の動機と向き合う段階にいます。';
  }

  function genSection2(concern, q, shuku, diary) {
    var keyTheme = extractKeyTheme(q || '');
    var gap = analyzeShukuGap(diary, shuku);

    // 日記から実際にヒットした言葉を直接引用して構成
    if (diary && gap && gap.hitWords && gap.hitWords.length > 0) {
      var words = gap.hitWords.slice(0, 3);
      var wordStr = words.map(function(w){ return '「' + w + '」'; }).join('、');
      if (gap.aligned) {
        return '日記の中から、' + wordStr + 'という言葉が自然に出てきていました。\nその言葉はあなた自身が選んだもの。宿命の力がすでに日常の中で動いているサインです。';
      } else {
        return '日記の言葉の中に、' + wordStr + 'という表現がありました。\nその感覚はまだ小さな芽かもしれません。でも、気づいているということは、もう動き始めています。';
      }
    }

    // 日記がない・ヒットなしの場合はqテーマ→concernで構成
    if (keyTheme) return '「' + keyTheme + '」のテーマが、7日間を通じてあなたの中で育っています。\nこのテーマは、今のあなたにとって最も大切な開運の扉の一つです。';
    if (/仕事/.test(concern))             return '仕事と使命へのテーマが育っています。あなたが今感じている「こうありたい」という声こそが、次の扉のカギです。';
    if (/お金/.test(concern))             return '豊かさへの意識が、意欲という形で育っています。お金との関係を見つめ直すことが、今のあなたにとって大切なテーマです。';
    if (/恋愛/.test(concern))             return '愛とつながりのテーマが育っています。誰かを大切にする前に、自分自身への愛を深める流れにあります。';
    if (/家族/.test(concern))             return '家族と縁のテーマが育っています。大切な人との関係の中で、自分の役割を新たな視点で見つめています。';
    if (/健康/.test(concern))             return '心と体の調和のテーマが育っています。日常の中で自分を大切にする習慣が、今のあなたへの月からの誘いです。';
    if (/自分らしさ|生き方/.test(concern)) return '自分らしい生き方のテーマが育っています。「本当はどう生きたいか」という問いと、静かに向き合っています。';
    return '内側の変化のテーマが育っています。今見えていることの先に、次の扉があります。';
  }

  function genSection4(shuku, q, diary) {
    var sd = SHUKU_MSG[shuku] || { next: '' };
    var a = SHUKU_ANALYSIS[shuku];
    var gap = analyzeShukuGap(diary, shuku);
    var qAction = extractQAction(q || '');
    if (gap && a) {
      var shukuAdvice = gap.aligned ? a.alignAdvice : a.gapAdvice;
      return shukuAdvice + (qAction ? '\n\n' + qAction : '');
    }
    var base = sd.next || '';
    return qAction
      ? base + '\n\n' + qAction
      : base + '\n\nこの7日間で感じたこと、気づいたことを、ぜひ日常のひとつひとつと結びつけてみてください。月のリズムは、続きます。';
  }

  // ===== 日記の言葉×アドバイス =====
  var VOICE_ADVICE_RULES = [
    { p: /感謝|ありがとう|良かった|助かっ|救われ/,
      t: '感謝の気持ちを言葉にできること自体が、豊かさを引き寄せる力になります。その視点が育つほど、毎日の流れが整い、周りの人にも自然とやさしくなれます。' },
    { p: /嬉し|楽し|幸せ|ワクワク|好き|喜び|嬉しかっ|楽しかっ/,
      t: '「嬉しい」「楽しい」という感覚は、天命への道しるべです。その感情が動いた瞬間を大切に。それがあなたの本当の方向を教えてくれています。' },
    { p: /不安|心配|怖|迷い|どうしよう|モヤモヤ|もやもや/,
      t: '不安を感じているとき、あなたの心は「大切にしたいもの」を探しています。その感覚を手放そうとせず、「何が大切なんだろう」と静かに問いかけてみてください。答えはすでにあなたの中にあります。' },
    { p: /疲れ|しんどい|つらい|辛い|頑張っ|頑張り/,
      t: '疲れを感じているとき、それはあなたが誠実に動いてきた証拠です。休むことも、流れを整える大切な行動。自分にやさしくする時間をひとつ作ってみてください。' },
    { p: /気づ|わかっ|発見|理解|見えてき|気がつ/,
      t: '気づきを言葉にできたこと自体が、大きな一歩です。その気づきをひとつだけ日常の行動に結びつけると、流れが加速していきます。' },
    { p: /変わ|変化|変えた|違う|ちがう|変わっ/,
      t: '変化に気づいているのは、すでに動いている証拠です。その小さな変化を「当たり前」にしないでください。積み重なったとき、大きな流れになっていきます。' },
    { p: /続け|続く|毎日|習慣|くり返|コツコツ|続いた/,
      t: '「続ける」という行為そのものが、あなたの力を育てています。結果より、続いた事実を大切にしてください。その積み重ねが、半年後のあなたを変えています。' },
    { p: /やりたい|したい|なりたい|目指|夢|叶え/,
      t: '「やりたい」という感覚は、天命のサインです。完璧な準備が整ってからではなく、今の自分にできる一番小さな行動から始めてみてください。' },
    { p: /できた|やった|行動|動いた|踏み出|実行|やってみ/,
      t: '行動した自分を認めてください。どんなに小さくても、動いたことがエネルギーを生み、次の流れをひらいています。' },
    { p: /人|家族|友達|仲間|つながり|会っ|話し/,
      t: '縁を大切にする意識が育っています。人との関わりの中に、あなたの宿命の力が動き出すヒントが隠れています。その縁を丁寧に育てていきましょう。' },
    { p: /整|きれい|片付|すっきり|スッキリ|整理/,
      t: '「整える」という行為は、外側だけでなく内側の流れも整えてくれます。空間が整うと、気持ちも運気の流れも動き始めます。' },
    { p: /お金|収入|豊か|稼|仕事|売上/,
      t: '「何で誰を喜ばせたいか」を一言で言えるようになると、お金と仕事の流れが変わり始めます。収入より先に、提供したい価値を言葉にしてみてください。' },
    { p: /自分|本音|本当|正直|らしく|自分らし/,
      t: '「自分らしく」という感覚に気づけているのは大切な一歩です。その感覚を基準に選択を重ねていくと、天命の方向が自然と見えてきます。' }
  ];

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function genLineAdvice(text, shuku) {
    for (var i = 0; i < VOICE_ADVICE_RULES.length; i++) {
      if (VOICE_ADVICE_RULES[i].p.test(text)) return VOICE_ADVICE_RULES[i].t;
    }
    var a = SHUKU_ANALYSIS[shuku];
    return a ? a.gapAdvice : 'この言葉に込めた気持ちを大切に。日常の中で、その感覚を少しずつ育てていきましょう。';
  }

  function collectDiaryVoices(identity, shuku) {
    var candidates = [];
    console.log('[Voices] identity=', identity);
    for (var day = 1; day <= 7; day++) {
      var key = STRUCTURED_DIARY_PREFIX + identity + ':day:' + day;
      try {
        var rec = JSON.parse(localStorage.getItem(key) || '{}');
        console.log('[Voices] day=' + day, 'rec.day=', rec.day, 'lines=', rec.lines ? rec.lines.length : 'none');
        if (!rec || !rec.day) continue;
        if (Array.isArray(rec.lines)) {
          rec.lines.forEach(function(line) {
            var text = (line.text || '').trim();
            console.log('[Voices]  line text=' + JSON.stringify(text) + ' len=' + text.length);
            if (text.length < 6) return;
            var hasRule = VOICE_ADVICE_RULES.some(function(r){ return r.p.test(text); });
            candidates.push({
              day: day,
              question: (line.placeholder || '').replace(/[\s\d\.\:。、]+$/, '').trim(),
              quote: text,
              advice: genLineAdvice(text, shuku),
              priority: hasRule ? text.length + 200 : text.length
            });
          });
        }
      } catch (e) {}
    }
    // ルールにヒットしたもの優先・同率は長い順・最大5件
    candidates.sort(function(a, b){ return b.priority - a.priority; });
    // 同じ日が連続しないよう分散させる
    var result = [], usedDays = {};
    candidates.forEach(function(c){
      if (result.length >= 5) return;
      if (!usedDays[c.day]) { result.push(c); usedDays[c.day] = true; }
    });
    // 5件に満たなければ残りを追加
    if (result.length < 5) {
      candidates.forEach(function(c){
        if (result.length >= 5) return;
        if (!result.some(function(r){ return r === c; })) result.push(c);
      });
    }
    result.sort(function(a, b){ return a.day - b.day; });
    return result;
  }

  function buildVoicesHtml(voices) {
    if (!voices || !voices.length) return '';
    return voices.map(function(v){
      var q = v.question ? '<span class="diary-voice-question">' + escHtml(v.question) + '</span>' : '';
      return '<div class="diary-voice-item">' +
        '<div class="diary-voice-day">Day' + v.day + q + '</div>' +
        '<blockquote class="diary-voice-quote">' + escHtml(v.quote) + '</blockquote>' +
        '<p class="diary-voice-advice">' + escHtml(v.advice) + '</p>' +
      '</div>';
    }).join('');
  }

  // ===== 日記テキスト収集（新キー形式 = diary_structured_save.js と同じ） =====
  function collectDiaryText(identity) {
    var parts = [];
    for (var day = 1; day <= 7; day++) {
      var key = STRUCTURED_DIARY_PREFIX + identity + ':day:' + day;
      try {
        var rec = JSON.parse(localStorage.getItem(key) || '{}');
        if (rec && Array.isArray(rec.lines)) {
          rec.lines.forEach(function(line){ if (line.text) parts.push(line.text); });
        }
        if (rec && Array.isArray(rec.extras)) {
          rec.extras.forEach(function(ex){ if (ex.text) parts.push(ex.text); });
        }
      } catch (e) {}
    }
    return parts.join('\n');
  }

  // Day7のレコードがあるかチェック
  function hasDay7(identity) {
    var key = STRUCTURED_DIARY_PREFIX + identity + ':day:7';
    try {
      var rec = JSON.parse(localStorage.getItem(key) || '{}');
      return !!(rec && rec.day);
    } catch (e) {
      return false;
    }
  }

  // ===== 保存・読み込み =====
  function autoReportKey(identity) {
    return AUTO_REPORT_KEY_PREFIX + identity;
  }

  function saveReport(identity, report) {
    localStorage.setItem(autoReportKey(identity), JSON.stringify(report));
  }

  function loadReport(identity) {
    try {
      var r = JSON.parse(localStorage.getItem(autoReportKey(identity)) || 'null');
      return r && r.s1 ? r : null;
    } catch (e) {
      return null;
    }
  }

  // ===== レポート生成 =====
  function generateReport(profile) {
    var identity = profile.participantId || profile.birth || profile.name || 'guest';
    var diary = collectDiaryText(identity);
    var shuku = (profile.shuku || '').replace(/\s/g, '');
    var sd = SHUKU_MSG[shuku] || { quality: '', next: '' };
    var shukuAnalysis = SHUKU_ANALYSIS[shuku];
    var s3Label = shukuAnalysis ? '　' + shukuAnalysis.label : '';

    var voices = collectDiaryVoices(identity, shuku);

    var report = {
      s1: genSection1(profile.concern || '', profile.q || '', shuku, diary),
      s2: genSection2(profile.concern || '', profile.q || '', shuku, diary),
      s3: shuku
        ? '【' + shuku + '】' + s3Label + '\n' + sd.quality
        : '宿曜情報がありません。',
      s4: genSection4(shuku, profile.q || '', diary),
      voicesHtml: buildVoicesHtml(voices),
      generatedAt: new Date().toISOString(),
      identity: identity
    };

    saveReport(identity, report);
    return report;
  }

  // Day7があれば生成、なければ null を返す
  function triggerIfReady(profile) {
    var identity = profile.participantId || profile.birth || profile.name || 'guest';
    if (!hasDay7(identity)) return null;
    return generateReport(profile);
  }

  // ===== グローバル公開 =====
  global.TsukiyomiReportGen = {
    generate: generateReport,
    load: loadReport,
    triggerIfReady: triggerIfReady
  };

})(window);
