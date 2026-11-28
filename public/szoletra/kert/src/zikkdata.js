// Bábel tornya: szavak ("torony" téma), az emeletek tanítói, próbái és beszélgetései.
// [angol, magyar, példamondat, fordítás, szint]
export const TOWER_WORDS = {
  brick: ['brick', 'tégla', 'Every brick was stamped with the name of the king.', 'Minden téglába a király nevét nyomták.', 'a2'],
  clay: ['clay', 'agyag', 'The river gives us the best clay.', 'A folyó adja a legjobb agyagot.', 'b1'],
  kiln: ['kiln', 'égetőkemence', 'The bricks stay in the kiln for two days.', 'A téglák két napig maradnak a kemencében.', 'b2'],
  straw: ['straw', 'szalma', 'We mix straw into the clay to make it stronger.', 'Szalmát keverünk az agyagba, hogy erősebb legyen.', 'b1'],
  mortar: ['mortar', 'habarcs, malter', 'Put a thin layer of mortar between the bricks.', 'Tegyél egy vékony réteg habarcsot a téglák közé.', 'b2'],
  mould: ['brick mould', 'téglavető forma', 'He pressed the wet clay into the brick mould.', 'Belenyomta a nedves agyagot a téglavető formába.', 'b2'],
  scaffolding: ['scaffolding', 'állványzat', 'The workers climbed up the scaffolding.', 'A munkások felmásztak az állványzatra.', 'b2'],
  trowel: ['trowel', 'kőműveskanál', 'She spread the mortar with a trowel.', 'Kőműveskanállal kente szét a habarcsot.', 'b2'],
  bucket: ['bucket', 'vödör', 'Carry this bucket of water to the kiln.', 'Vidd ezt a vödör vizet a kemencéhez.', 'a2'],
  ziggurat: ['ziggurat', 'zikkurat, lépcsős templomtorony', 'The ziggurat rises above the whole city.', 'A zikkurat az egész város fölé magasodik.', 'b2'],
  shrine: ['shrine', 'szentély', 'Only the priests may enter the shrine.', 'A szentélybe csak a papok léphetnek be.', 'b2'],
  priest: ['priest', 'pap', 'The priest climbed the stairs at sunrise.', 'A pap napkeltekor felment a lépcsőn.', 'a2'],
  foreman: ['foreman', 'munkavezető', 'The foreman checks every row of bricks.', 'A munkavezető minden téglasort ellenőriz.', 'b2'],
  worker: ['worker', 'munkás', 'Hundreds of workers came from distant lands.', 'Munkások százai jöttek messzi földekről.', 'a2'],
  language: ['language', 'nyelv', 'The workers spoke many different languages.', 'A munkások sok különböző nyelven beszéltek.', 'a2'],
  sledge: ['sledge', 'szán (teherhúzó)', 'Oxen pulled the heavy stones on a sledge.', 'Ökrök húzták szánon a nehéz köveket.', 'b2'],
  // a felső emeletek szavai (4-7.)
  idiom: ['idiom', 'kifejezés, szólás', 'Every language has idioms that make no sense word by word.', 'Minden nyelvben vannak szólások, amelyeknek szó szerint nincs értelmük.', 'b2'],
  tale: ['tale', 'mese, történet', 'The old man told us a tale about a clever fox.', 'Az öregember mesét mondott nekünk egy okos rókáról.', 'b1'],
  storyteller: ['storyteller', 'mesemondó', 'The storyteller can make a whole crowd go silent.', 'A mesemondó egy egész tömeget el tud hallgattatni.', 'b2'],
  envoy: ['envoy', 'követ (diplomata)', 'The envoy brought a letter from a distant king.', 'A követ levelet hozott egy messzi királytól.', 'c1'],
  interpreter: ['interpreter', 'tolmács', 'The interpreter repeated every word in our language.', 'A tolmács minden szót megismételt a mi nyelvünkön.', 'b2'],
  treaty: ['treaty', 'szerződés (államok között)', 'The two kings signed a peace treaty.', 'A két király békeszerződést kötött.', 'c1'],
  astronomer: ['astronomer', 'csillagász', 'The astronomer watched the sky every night.', 'A csillagász minden éjjel az eget figyelte.', 'b2'],
  constellation: ['constellation', 'csillagkép', 'The Lion is a constellation of the spring sky.', 'Az Oroszlán a tavaszi égbolt egyik csillagképe.', 'b2'],
  planet: ['planet', 'bolygó', 'Venus is the brightest planet in the evening sky.', 'A Vénusz a legfényesebb bolygó az esti égen.', 'b1'],
  eclipse: ['eclipse', 'fogyatkozás (nap- vagy hold-)', 'The priests predicted the eclipse months before.', 'A papok hónapokkal előre megjósolták a fogyatkozást.', 'c1'],
  comet: ['comet', 'üstökös', 'A comet with a long bright tail appeared over the city.', 'Hosszú, fényes csóvájú üstökös jelent meg a város fölött.', 'b2'],
  horizon: ['horizon', 'látóhatár', 'From the top of the tower you can see the whole horizon.', 'A torony tetejéről az egész látóhatárt belátod.', 'b2'],
  omen: ['omen', 'előjel, ómen', 'The king believed that the comet was a bad omen.', 'A király hitte, hogy az üstökös rossz előjel.', 'c1'],
  zodiac: ['zodiac', 'állatöv', 'The Babylonians divided the zodiac into twelve parts.', 'A babiloniak tizenkét részre osztották az állatövet.', 'c1'],
  fate: ['fate', 'sors, végzet', 'The priests read the fate of the king in the stars.', 'A papok a csillagokból olvasták ki a király sorsát.', 'b2'],
};

// emeletenként: [név, hely, tanító, a szükséges rang (TIERS index)]
export const FLOORS = [
  ['Téglavetők udvara', 'a torony lábánál', 'Ilu-ibni, a téglavető mester', 0],
  ['Munkások terasza', 'az első teraszon', 'Shamash-nasir, a munkavezető', 1],
  ['A szétszórt szavak', 'a második teraszon', 'Ubar és Zakir, a munkások', 2],
  ['Kifejezések terasza', 'a harmadik teraszon', 'Tarhunta, a messzi földről jött kereskedő', 3],
  ['Hallgatók terasza', 'a negyedik teraszon', 'Kidin, a vak mesemondó', 4],
  ['Tolmácsok terasza', 'az ötödik teraszon', 'A király követe', 5],
  ['Marduk szentélye', 'a csúcson', 'Bel-ushezib, a főpap-csillagjós', 6],
];

// 1. emelet: téglarakás. Ezekből a szavakból kérdez (a többi szótárban lévő építkezési szóval együtt).
export const BRICK_POOL = ['brick', 'clay', 'kiln', 'straw', 'mortar', 'mould', 'scaffolding', 'trowel', 'bucket', 'sledge', 'rope', 'ladder', 'pulley', 'bitumen', 'basket', 'staircase', 'terrace', 'column', 'worker', 'foreman'];

// 2. emelet: múlt idő. [mondat ___-sel, [lehetőségek], helyes index, magyarul, magyarázat a hibához]
export const GAP_ITEMS = [
  ['Yesterday the workers ___ forty rows of bricks.', ['laid', 'layed', 'lain'], 0, 'Tegnap a munkások negyven sor téglát raktak le.', 'A lay (lerak) múlt ideje laid, nem "layed".'],
  ['The old ladder ___ under the heavy load.', ['breaked', 'broke', 'broken'], 1, 'A régi létra eltört a nehéz teher alatt.', 'A break rendhagyó: break, broke, broken. Múlt időben broke.'],
  ['We ___ water from the river in big buckets.', ['carry', 'carryed', 'carried'], 2, 'Nagy vödrökben hordtuk a vizet a folyóból.', 'Mássalhangzó + y után -ied: carried.'],
  ['Who ___ the rope to the top terrace?', ['brought', 'bringed', 'brung'], 0, 'Ki hozta fel a kötelet a felső teraszra?', 'A bring rendhagyó: bring, brought, brought.'],
  ['Last week we ___ the second terrace.', ['build', 'builded', 'built'], 2, 'Múlt héten megépítettük a második teraszt.', 'A build rendhagyó: build, built, built.'],
  ['I ___ a strange language on the stairs this morning.', ['heared', 'heard', 'hear'], 1, 'Ma reggel egy furcsa nyelvet hallottam a lépcsőn.', 'A hear múlt ideje heard (kiejtése: hörd).'],
  ['Nobody ___ what the new workers were saying.', ['understood', 'understanded', 'understand'], 0, 'Senki sem értette, mit mondanak az új munkások.', 'Understand, understood, understood.'],
  ['The tired donkey ___ down and refused to move.', ['laid', 'lay', 'layed'], 1, 'A fáradt szamár lefeküdt, és nem volt hajlandó megmozdulni.', 'Lie (fekszik) múlt ideje lay. A laid a lay (lerak valamit) múlt ideje.'],
  ['We ___ the clay with straw and water.', ['mix', 'mixed', 'mixt'], 1, 'Szalmával és vízzel kevertük össze az agyagot.', 'Szabályos ige: mix, mixed.'],
  ['Did you ___ the bitumen yet?', ['heated', 'heat', 'hot'], 1, 'Felmelegítetted már a bitument?', 'A did után az ige alapalakja jön: Did you heat…?'],
  ['The bricks ___ in the sun for three days.', ['dried', 'dryed', 'dry'], 0, 'A téglák három napig száradtak a napon.', 'Mássalhangzó + y után -ied: dried.'],
  ['The foreman ___ us to work faster.', ['telled', 'told', 'tell'], 1, 'A munkavezető azt mondta, dolgozzunk gyorsabban.', 'Tell, told, told.'],
];

// 3. emelet: mondatrendezés (a nyelvzavar). [angol mondat, magyarul]
export const ORDER_ITEMS = [
  ['Where is the rope?', 'Hol van a kötél?'],
  ['Can you pass me that brick?', 'Ide tudod adni azt a téglát?'],
  ['How many bricks do we need?', 'Hány téglára van szükségünk?'],
  ['Why did the ladder fall?', 'Miért esett le a létra?'],
  ['What does this word mean?', 'Mit jelent ez a szó?'],
  ['We have never seen such a tall tower.', 'Még sosem láttunk ilyen magas tornyot.'],
  ['Do you speak my language?', 'Beszéled a nyelvemet?'],
  ['The bricks are not dry yet.', 'A téglák még nem száradtak meg.'],
  ['Is the kiln hot enough?', 'Elég forró a kemence?'],
  ['Could you speak more slowly, please?', 'Beszélnél lassabban, kérlek?'],
  ['Where did you put my trowel?', 'Hova tetted a kőműveskanalamat?'],
  ['I do not understand what you are saying.', 'Nem értem, mit mondasz.'],
];

// a próbák: hány téglát kell lerakni; a hibás válasz egy téglát leejt
export const TRIALS = [
  { kind: 'pick', need: 8, title: 'Téglarakás', intro: ['Bring me the right bricks! Every word you know is a brick in the wall.', 'Hozd a megfelelő téglákat! Minden szó, amit tudsz, egy tégla a falban.'] },
  { kind: 'gap', need: 6, title: 'Mi történt tegnap?', intro: ['Tell me what happened yesterday on the tower. Choose the right word!', 'Mondd el, mi történt tegnap a toronyban. Válaszd ki a helyes szót!'] },
  { kind: 'order', need: 5, title: 'A nyelvzavar', intro: ['Help us! Zakir speaks, but his words come out all mixed up. Put them in order so that Ubar understands.', 'Segíts! Zakir beszél, de a szavai összekeveredve jönnek ki. Rakd sorba őket, hogy Ubar megértse.'] },
  { kind: 'idiom', need: 6, title: 'Mit jelent valójában?', intro: ['In my land we say: words are like camels, they do not always go where they seem to go. What do these sayings really mean?', 'Nálunk azt mondják: a szavak olyanok, mint a tevék, nem mindig arra mennek, amerre látszik. Mit jelentenek valójában ezek a mondások?'] },
  { kind: 'listen', need: 5, title: 'A vak mesemondó', intro: ['Close your eyes, child, as I have closed mine. Listen to my tales, then answer my questions.', 'Csukd be a szemed, gyermekem, ahogy én is. Hallgasd a meséimet, aztán felelj a kérdéseimre.'] },
  { kind: 'interp', need: 6, title: 'A követ szavai', intro: ['The king of a distant land speaks only Hungarian today. Pass on his words in English, and choose them carefully: one wrong word can start a war.', 'Egy messzi ország királya ma csak magyarul beszél. Add tovább a szavait angolul, és válogasd meg jól: egyetlen rossz szó háborút robbanthat ki.'] },
  { kind: 'mix', need: 7, title: 'Az ég könyve', intro: ['You have climbed all seven floors. Now the sky itself will test you: one question for every colour of the tower.', 'Megmászottad mind a hét emeletet. Most maga az ég tesz próbára: a torony minden színéért egy kérdés.'] },
];

export const TOWER_CONVOS = {
  tbrick: [
    { title: 'A téglavető', steps: [
      { say: 'Welcome to the brick yard! Have you ever made a brick?', hu: 'Üdv a téglavetők udvarán! Csináltál már valaha téglát?', replies: [
        ["No, I haven't. How do you make one?", 1, 'First you mix clay, straw and water. Then you press it into a mould.'],
        ["No, I didn't never.", 0, 'Hmm?', 'Kettős tagadás és rossz igeidő. Have you ever…? kérdésre: No, I haven\'t.'],
        ['Yes, I make brick yesterday.', 0, 'Yesterday? Then say "made"!', 'Múlt időben: I made a brick yesterday. De ide a No, I haven\'t illik.']] },
      { say: 'Then the bricks dry in the sun, and the best ones go into the kiln. Why do you think we burn them?', hu: 'Aztán a téglák a napon száradnak, a legjobbak a kemencébe kerülnek. Szerinted miért égetjük ki őket?', replies: [
        ['Because burnt bricks are harder and water cannot damage them.', 1, 'Exactly! The outer walls are made of burnt bricks.'],
        ['Because it is cold.', 0, 'Cold? In Babylon?', 'Az égetés oka nem a hideg, hanem hogy keményebb és vízálló legyen.'],
        ['Because burn is more better.', 0, 'More better? Just "better"!', 'A better már középfok, nem kell elé a more.']] },
    ] },
  ],
  tforeman: [
    { title: 'A munkavezető', steps: [
      { say: 'You climbed all those stairs? How long did it take you?', hu: 'Felmásztál ezeken a lépcsőkön? Mennyi ideig tartott?', replies: [
        ['It took me about ten minutes. The view is amazing!', 1, 'Ha! The workers need half an hour with a basket of bricks.'],
        ['It take me ten minute.', 0, 'Took! And minutes!', 'Múlt idő: It took me… és többes szám: ten minutes.'],
        ['I am climbing since morning.', 0, 'Since morning? That is too slow!', 'A since mellett present perfect kell: I have been climbing since morning. De a kérdésre múlt idő illik.']] },
      { say: 'Yesterday three workers left the tower. Do you know why?', hu: 'Tegnap három munkás otthagyta a tornyot. Tudod, miért?', replies: [
        ["I think they couldn't understand each other.", 1, 'Yes… every day more people speak strange languages here.'],
        ['They are leaving because tired.', 0, 'Because tired? Say it properly!', 'Múlt idő kell (They left), és a because után teljes mondat: because they were tired.'],
        ["I don't know why did they leave.", 0, 'Why did they… what?', 'Függő kérdésben nincs did és nincs fordított szórend: I don\'t know why they left.']] },
    ] },
  ],
  tworkers: [
    { title: 'Ubar és Zakir', steps: [
      { say: 'Thank goodness, someone who understands us! Where are you from?', hu: 'Hála az égnek, valaki, aki ért minket! Honnan jöttél?', replies: [
        ["I'm from Hungary. I'm learning English here in Babylon.", 1, 'Hungary! That is very far away.'],
        ['I from Hungary.', 0, 'You… from Hungary?', 'Hiányzik az ige: I am (I\'m) from Hungary.'],
        ['From where are you?', 0, 'We asked YOU!', 'Ő kérdezett téged. A válasz: I\'m from…']] },
      { say: 'Zakir says the tower must reach the sky. What do you think?', hu: 'Zakir azt mondja, a toronynak el kell érnie az eget. Te mit gondolsz?', replies: [
        ["I think it's tall enough. People should talk to each other first.", 1, 'Wise words. Maybe that is why we cannot finish it.'],
        ['I am think it is enough tall.', 0, 'Enough tall?', 'I think (nem I am think), és az enough a melléknév után jön: tall enough.'],
        ['Yes, it must to reach the sky.', 0, 'Must to?', 'A must után nincs to: it must reach the sky.']] },
    ] },
  ],
  tmerchant: [
    { title: 'A kereskedő', steps: [
      { say: 'I came here on a camel, through the desert, for forty days. Have you ever travelled that far?', hu: 'Tevén jöttem ide, a sivatagon át, negyven napig. Utaztál már ilyen messzire?', replies: [
        ["Not that far, but I'd love to. It must have been exhausting!", 1, 'It was! But the silver in my bag made the road shorter.'],
        ['No, I never travelled so far ever.', 0, 'Never… ever?', 'Have you ever…? kérdésre: No, I haven\'t, vagy Not that far. A never és az ever együtt fölösleges.'],
        ['Yes, it must be exhausted.', 0, 'Exhausted? Who?', 'Exhausted = kimerült (ember), exhausting = kimerítő (az út). Ráadásul múltról van szó: must have been.']] },
      { say: 'Business is slow this year. Everybody wants to sell, nobody wants to buy. What would you do?', hu: 'Rosszul megy az üzlet idén. Mindenki eladni akar, senki sem venni. Te mit tennél?', replies: [
        ["I'd lower my prices for a while and look for new customers.", 1, 'Clever! Maybe you should be a merchant, not a builder.'],
        ['I would to sell cheaper.', 0, 'Would to?', 'A would után nincs to: I would sell cheaper.'],
        ['If I were you, I will wait.', 0, 'You will wait, or you would wait?', 'If I were you… után would kell: If I were you, I would wait.']] },
    ] },
  ],
  tstory: [
    { title: 'A vak mesemondó', steps: [
      { say: 'Your footsteps are light. You are young, and you are not from Babylon. Am I right?', hu: 'Könnyűek a lépteid. Fiatal vagy, és nem babiloni. Igazam van?', replies: [
        ["You're right. How could you tell just from my footsteps?", 1, 'When you cannot see, you learn to listen to everything.'],
        ['You are right. How you know?', 0, 'How… I know?', 'A kérdéshez segédige kell: How do you know? vagy How could you tell?'],
        ['Yes, I am not from here since two years.', 0, 'Since two years?', 'Since csak időpont előtt áll. Itt egyszerűen: Yes, I\'m not from here.']] },
      { say: 'Tell me, which story do you like more: a story with a happy ending, or a sad one?', hu: 'Mondd csak, melyik mesét szereted jobban: amelyiknek boldog a vége, vagy a szomorút?', replies: [
        ['I prefer happy endings, but sad stories stay with me longer.', 1, 'Ah, you have the heart of a storyteller.'],
        ['I like more the happy.', 0, 'The happy… what?', 'Angolul: I like happy endings more / better, vagy I prefer happy endings.'],
        ['I prefer happy endings than sad ones.', 0, 'Than?', 'Prefer A to B: I prefer happy endings to sad ones.']] },
    ] },
  ],
  tenvoy: [
    { title: 'A király követe', steps: [
      { say: 'An interpreter must be invisible. Do you know why?', hu: 'A tolmácsnak láthatatlannak kell lennie. Tudod, miért?', replies: [
        ["Because people should hear the speaker's words, not the interpreter's opinion.", 1, 'Exactly. You pass on the message, you do not change it.'],
        ['Because he must not be seen by nobody.', 0, 'By nobody?', 'Kettős tagadás: by anybody, vagy he must be seen by nobody.'],
        ['Because it is more polite to hide.', 0, 'To hide? Under the table?', 'Nem szó szerint láthatatlan: a tolmács nem adja hozzá a saját véleményét.']] },
      { say: 'The other king said: "Your wall is impressive." Was that a compliment or a warning?', hu: 'A másik király azt mondta: „Lenyűgöző a falatok.” Bók volt ez, vagy figyelmeztetés?', replies: [
        ["It depends on his tone. I'd translate it neutrally and let our king decide.", 1, 'Spoken like a true diplomat.'],
        ['It was a compliment, I am sure about it 100 percents.', 0, 'Percents?', 'A percent nem kap többes számot: 100 percent sure. És egy tolmács ritkán ilyen biztos!'],
        ['Impressive means he is impressed by the wall, so he wants to buy it.', 0, 'Buy our wall?', 'Az impressive lenyűgözőt jelent, de semmi köze a vásárláshoz. A hangsúlyon múlik, mit akart vele mondani.']] },
    ] },
  ],
  tpriest: [
    { title: 'A főpap-csillagjós', steps: [
      { say: 'For seven hundred years my order has written down every eclipse. What do you think we were looking for?', hu: 'Rendünk hétszáz éve jegyez fel minden fogyatkozást. Szerinted mit kerestünk?', replies: [
        ["A pattern, so that you could predict the next one.", 1, 'Yes. The sky repeats itself, if you are patient enough.'],
        ['You were looking the future.', 0, 'Looking… the future?', 'Look for = keres; look at = néz. Itt: You were looking for the future, vagy for a pattern.'],
        ["I think you was afraid of them.", 0, 'You was?', 'You után were áll: you were afraid. Bár a félelem sem állt messze tőlünk.']] },
      { say: 'Now that the tower is almost finished, tell me honestly: was it worth all the work?', hu: 'Most, hogy a torony majdnem kész, mondd meg őszintén: megérte ennyi munka?', replies: [
        ["Definitely. I didn't just build a tower, I learned a new language on the way.", 1, 'Then the tower has done its job, and so have you.'],
        ['Yes, it was worth to do it.', 0, 'Worth to do?', 'A worth után -ing alak jön: it was worth doing, vagy egyszerűen it was worth it.'],
        ['I am not sure if it worths.', 0, 'Worths?', 'A worth nem ige: is it worth it? / I\'m not sure it was worth it.']] },
    ] },
  ],
};

// a még nem kész emeletek tanítói ezt mondják
export const TOWER_WAIT = {
};

// 4. emelet: kifejezések. [mondat, a kifejezés, [magyar jelentések], helyes index, magyarázat]
export const IDIOM_ITEMS = [
  ['Don\'t worry, I will look after your camel while you climb.', 'look after', ['vigyáz rá, gondoskodik róla', 'hátranéz utána', 'megkeresi'], 0, 'A look after valakire vagy valamire vigyázást jelent, nem utánanézést.'],
  ['The price of copper has gone up again.', 'gone up', ['felment a hegyre', 'megemelkedett', 'elfogyott'], 1, 'Árakról mondva a go up emelkedést jelent.'],
  ['We ran out of bitumen before noon.', 'ran out of', ['kifutott belőle', 'elfogyott', 'elszaladt érte'], 1, 'A run out of something azt jelenti: kifogy valamiből.'],
  ['I can\'t make out what the priest is saying.', 'make out', ['kivenni, megérteni', 'elkészíteni', 'kimenteni'], 0, 'A make out itt azt jelenti: kivenni, kihallani, kibetűzni.'],
  ['This tower costs an arm and a leg.', 'costs an arm and a leg', ['iszonyú drága', 'sok munkás megsérül', 'egészen olcsó'], 0, 'Szó szerint egy karba és egy lábba kerül, vagyis rettentően drága.'],
  ['Let\'s call it a day, the sun is setting.', 'call it a day', ['nevezzük el a napot', 'mára fejezzük be', 'kezdjük újra holnap'], 1, 'A call it a day jelentése: mára elég, befejezzük.'],
  ['For an old builder like me, this wall is a piece of cake.', 'a piece of cake', ['gyerekjáték, nagyon könnyű', 'egy szelet sütemény', 'nagy ünnep'], 0, 'A piece of cake: pofonegyszerű, gyerekjáték.'],
  ['I\'ll keep an eye on your goods.', 'keep an eye on', ['szemmel tartja, figyel rá', 'egy szemet tesz rá', 'elrejti'], 0, 'Keep an eye on something: szemmel tart, odafigyel rá.'],
  ['Stop beating around the bush and tell me the price!', 'beating around the bush', ['bokrot csépel', 'kerülgeti a forró kását', 'alkudozik'], 1, 'Beat around the bush: kerülgeti a forró kását, nem mondja ki a lényeget.'],
  ['The king\'s plan fell through when the workers left.', 'fell through', ['átesett a lyukon', 'meghiúsult', 'befejeződött'], 1, 'Egy terv, ha falls through, akkor meghiúsul, füstbe megy.'],
  ['I\'m feeling a bit under the weather today.', 'under the weather', ['kicsit gyengélkedik', 'eláztatta az eső', 'rossz idő van'], 0, 'Under the weather: nincs jól, gyengélkedik.'],
  ['Can you put me up for the night?', 'put me up', ['elszállásolsz éjszakára', 'felemelsz', 'feltartasz'], 0, 'Put someone up: szállást ad valakinek.'],
  ['He spilled the beans about the secret door.', 'spilled the beans', ['elárulta a titkot', 'kiöntötte a babot', 'elfelejtette'], 0, 'Spill the beans: kikotyogja, elárulja a titkot.'],
  ['We are in the same boat, my friend.', 'in the same boat', ['ugyanabban a cipőben járunk', 'egy hajón utazunk', 'egyformán gazdagok vagyunk'], 0, 'In the same boat: ugyanabban a helyzetben, ugyanabban a cipőben.'],
  ['Break a leg at the festival tonight!', 'break a leg', ['sok sikert!', 'vigyázz, el ne törd a lábad!', 'táncolj sokat!'], 0, 'A break a leg jókívánság fellépés előtt, olyan, mint a „kéz- és lábtörést”.'],
  ['It\'s raining cats and dogs, we can\'t work on the stairs.', 'raining cats and dogs', ['zuhog az eső', 'állatok esnek az égből', 'szemerkél'], 0, 'Rain cats and dogs: dézsából ömlik az eső.'],
];

// 5. emelet: hallás utáni értés. [amit Kidin mesél, kérdés magyarul, [válaszok], helyes index, magyar fordítás]
export const LISTEN_ITEMS = [
  ['Long ago, a shepherd lost three sheep in a storm. He found two of them by the river, but the third one never came back.', 'Hány bárányt talált meg a pásztor?', ['kettőt', 'hármat', 'egyet'], 0, 'Régen egy pásztor három bárányt veszített el egy viharban. Kettőt megtalált a folyónál, de a harmadik sosem jött vissza.'],
  ['The fisherman\'s daughter woke up before sunrise, because she wanted to see the boats leave the harbour.', 'Miért kelt fel korán a halász lánya?', ['hogy lássa kifutni a hajókat', 'mert halászni indult', 'mert vihar volt'], 0, 'A halász lánya napkelte előtt felébredt, mert látni akarta, ahogy a hajók kifutnak a kikötőből.'],
  ['My grandfather was a scribe. He wrote on clay with a reed, and he never made a single mistake.', 'Mivel írt Kidin nagyapja?', ['nádtollal, agyagra', 'tintával, papiruszra', 'vésővel, kőre'], 0, 'A nagyapám írnok volt. Nádtollal írt agyagra, és soha egyetlen hibát sem ejtett.'],
  ['The merchant wanted ten silver rings for the carpet, but the old woman paid only six.', 'Mennyit fizetett végül az öregasszony?', ['hat ezüstgyűrűt', 'tíz ezüstgyűrűt', 'négy ezüstgyűrűt'], 0, 'A kereskedő tíz ezüstgyűrűt kért a szőnyegért, de az öregasszony csak hatot fizetett.'],
  ['When the moon was full, the children were allowed to stay up late and listen to stories on the roof.', 'Mikor maradhattak fenn sokáig a gyerekek?', ['teliholdkor', 'újholdkor', 'az ünnepeken'], 0, 'Teliholdkor a gyerekek sokáig fennmaradhattak, és meséket hallgathattak a háztetőn.'],
  ['The lion did not attack the boy. Instead, it lay down next to him, because the boy had once pulled a thorn from its paw.', 'Miért nem támadta meg az oroszlán a fiút?', ['mert a fiú egyszer kihúzott egy tüskét a mancsából', 'mert már jóllakott', 'mert a fiú elkergette'], 0, 'Az oroszlán nem támadta meg a fiút. Ehelyett lefeküdt mellé, mert a fiú egyszer kihúzott egy tüskét a mancsából.'],
  ['The river flooded the fields in spring. The farmers were not angry, because the water brought rich black soil.', 'Miért nem haragudtak a földművesek az áradásra?', ['mert a víz termékeny fekete iszapot hozott', 'mert még nem vetettek', 'mert a király kárpótolta őket'], 0, 'Tavasszal a folyó elárasztotta a földeket. A földművesek nem haragudtak, mert a víz gazdag fekete földet hozott.'],
  ['I lost my sight when I was young, but I learned to see with my ears. Every voice has its own colour.', 'Mit mond magáról Kidin?', ['fiatalon vesztette el a látását', 'vakon született', 'öregkorára vakult meg'], 0, 'Fiatalon elvesztettem a látásomat, de megtanultam a fülemmel látni. Minden hangnak saját színe van.'],
  ['The baker\'s son burnt the bread, so he hid it under the table and told his father that a goat had eaten it.', 'Mit mondott a pékfiú az apjának?', ['hogy egy kecske megette a kenyeret', 'hogy elégett a kenyér', 'hogy eladta a kenyeret'], 0, 'A pék fia odaégette a kenyeret, ezért az asztal alá rejtette, és azt mondta az apjának, hogy egy kecske megette.'],
  ['Two brothers built a bridge together. The older one carried the stones, and the younger one, who was very clever, did the measuring.', 'Mi volt a fiatalabb testvér dolga?', ['a méricskélés', 'a kövek hordása', 'a főzés'], 0, 'Két testvér együtt épített egy hidat. Az idősebb hordta a köveket, a fiatalabb, aki nagyon okos volt, a méréseket végezte.'],
  ['If you ever get lost in the desert at night, look for the brightest star in the north. Walk towards it, and you will find the river.', 'Mit kell tenni, ha éjjel eltévedsz a sivatagban?', ['az északi fényes csillag felé menni', 'megvárni a reggelt', 'a szél irányát követni'], 0, 'Ha valaha eltévedsz éjjel a sivatagban, keresd meg északon a legfényesebb csillagot. Menj felé, és megtalálod a folyót.'],
  ['The queen had a garden on the roof of the palace, because she missed the green mountains of her homeland.', 'Miért volt kert a palota tetején?', ['mert a királyné vágyott szülőföldje zöld hegyei után', 'mert a király megparancsolta', 'mert ott több nap érte a virágokat'], 0, 'A királynénak kertje volt a palota tetején, mert hiányoztak neki szülőföldje zöld hegyei.'],
];

// 6. emelet: tolmácsolás. [amit a követ magyarul mond, [angol változatok], helyes index, magyarázat]
export const INTERP_ITEMS = [
  ['Kölcsön tudnád adni a pecsétedet?', ['Could you lend me your seal?', 'Could you borrow me your seal?', 'Could you rent me your seal?'], 0, 'Lend = kölcsönad, borrow = kölcsönkér, rent = bérel.'],
  ['A király valójában nagyon fáradt.', ['The king is actually very tired.', 'The king is currently very tired.', 'The king is actually very tiring.'], 0, 'Actually = valójában (nem „aktuálisan”); currently = jelenleg; tiring = fárasztó.'],
  ['Egy hete várunk a válaszra.', ['We have been waiting for an answer for a week.', 'We are waiting for an answer since a week.', 'We wait the answer from one week.'], 0, 'Ami a múltban kezdődött és még tart: present perfect continuous, az időtartam elé for kell.'],
  ['Ha a király beleegyezik, holnap indulunk.', ['If the king agrees, we will leave tomorrow.', 'If the king will agree, we leave tomorrow.', 'If the king would agree, we will leave tomorrow.'], 0, 'Az if-es mellékmondatban jelen idő kell, a főmondatban will.'],
  ['Kényes kérdés, válogasd meg a szavaidat.', ['It is a sensitive question, so choose your words carefully.', 'It is a sensible question, so choose your words carefully.', 'It is a sensitive question, so select your vocabulary.'], 0, 'Sensitive = érzékeny, kényes; sensible = józan, ésszerű. A „choose your words carefully” a bevett fordulat.'],
  ['A követ szerint a határról még nem döntöttek.', ['According to the envoy, the border has not been decided yet.', 'According the envoy, the border is not decided still.', 'By the envoy, the border did not decide yet.'], 0, 'According to (a to nem maradhat el), és a yet a tagadó mondat végére kerül.'],
  ['Felség, engedje meg, hogy bemutassam a követet.', ['Your Majesty, allow me to introduce the envoy.', 'Your Majesty, let me to introduce the envoy.', 'Your Majesty, allow me to introduce you with the envoy.'], 0, 'Allow me to + ige, de let me után nincs to. Introduce someone to someone, nem with.'],
  ['Megbeszéltük a feltételeket.', ['We discussed the terms.', 'We discussed about the terms.', 'We talked the terms.'], 0, 'A discuss után közvetlenül jön a tárgy, about nélkül.'],
  ['Nem engedhetünk meg magunknak egy háborút.', ['We cannot afford a war.', 'We cannot allow ourselves a war.', 'We cannot let us a war.'], 0, 'A „megengedhetjük magunknak” angolul afford. A szó szerinti fordítás nem angolos.'],
  ['Kérlek, emlékeztesd a királyt a találkozóra.', ['Please remind the king of the meeting.', 'Please remember the king the meeting.', 'Please remind the king the meeting.'], 0, 'Remind someone of/about something = emlékeztet; remember = emlékszik.'],
  ['Már alig várom, hogy hazaérjek.', ['I can\'t wait to get home.', 'I can hardly wait for getting home.', 'I barely wait to arrive home.'], 0, 'Az „alig várom” angolul I can\'t wait to… Szó szerint fordítva furcsa vagy mást jelent.'],
  ['Udvariatlanság lenne visszautasítani az ajándékot.', ['It would be rude to refuse the gift.', 'It would be rude to deny the gift.', 'It would be rough to refuse the gift.'], 0, 'Refuse = visszautasít; deny = tagad; rough = durva, érdes.'],
  ['Végül is megérte.', ['It was worth it in the end.', 'At the end it was worth.', 'Finally it earned it.'], 0, 'In the end = végül is; worth után kell az it: worth it.'],
  ['Szívesen segítünk, ha szükségetek van ránk.', ['We are happy to help if you need us.', 'We help gladly if you are needing us.', 'We are pleasant to help if you need us.'], 0, 'Be happy to + ige = szívesen; a need állapotige, nem áll -ing alakban; pleasant = kellemes.'],
];

// 7. emelet: a főpap nyelvtana (C1). Ugyanaz a formátum, mint a GAP_ITEMS.
export const SKY_GAP = [
  ['Never before ___ such a bright comet.', ['had we seen', 'we had seen', 'we saw'], 0, 'Soha még nem láttunk ilyen fényes üstököst.', 'A mondat eleji never before után fordított szórend jön: had we seen.'],
  ['If the priests had watched the sky, they ___ the eclipse.', ['would have predicted', 'would predict', 'will have predicted'], 0, 'Ha a papok figyelték volna az eget, megjósolták volna a fogyatkozást.', 'Múltbeli feltétel (harmadik típus): if + had + V3, would have + V3.'],
  ['Hardly had the sun set ___ the first stars appeared.', ['when', 'than', 'then'], 0, 'Alig nyugodott le a nap, máris feltűntek az első csillagok.', 'Hardly… when, és a hardly után fordított szórend. (No sooner… than.)'],
  ['The planets are believed ___ the fate of kings.', ['to influence', 'influencing', 'that they influence'], 0, 'Úgy tartják, hogy a bolygók befolyásolják a királyok sorsát.', 'Be believed / be said / be thought + to + ige.'],
  ['I wish I ___ the language of the stars.', ['understood', 'understand', 'would understanding'], 0, 'Bárcsak érteném a csillagok nyelvét.', 'Jelenbeli óhaj: I wish + múlt idő.'],
  ['Not only ___ the stars, but he also measured their paths.', ['did he name', 'he named', 'named he'], 0, 'Nemcsak elnevezte a csillagokat, hanem a pályájukat is megmérte.', 'A mondat eleji not only után kérdő szórend: did he name.'],
  ['By the time the comet returns, the tower ___ for centuries.', ['will have stood', 'will stand', 'stands'], 0, 'Mire az üstökös visszatér, a torony már évszázadok óta állni fog.', 'Mire valami bekövetkezik, addigra: future perfect (will have + V3).'],
  ['It is high time we ___ the tower.', ['finished', 'finish', 'will finish'], 0, 'Ideje volna befejeznünk a tornyot.', 'Az it\'s (high) time után múlt idő áll, bár jelenről szól.'],
];
// a csúcs csillagszavai
export const STAR_POOL = ['constellation', 'planet', 'eclipse', 'comet', 'horizon', 'astronomer', 'omen', 'zodiac', 'fate', 'shrine', 'priest', 'ziggurat'];
// éjjel a csúcsról látszó csillagképek: [angol név, magyar, irány (fok), magasság (fok), csillagok [x, y] egységekben, vonalak]
export const CONSTELLATIONS = [
  ['the Lion', 'Oroszlán', 120, 19, [[0, 0], [1, .6], [2.2, .9], [3, .4], [3.6, 1.2], [3.2, 2], [2.4, 2.2], [4.6, .2], [5.6, .6]], [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 2], [3, 7], [7, 8]]],
  ['the Bull', 'Bika', 205, 17, [[0, 0], [1, .5], [1.8, .3], [2.1, 1], [1.4, 1.4], [3.4, -.4], [3.2, 2]], [[0, 1], [1, 2], [2, 3], [3, 4], [4, 1], [2, 5], [3, 6]]],
  ['the Scorpion', 'Skorpió', 300, 14, [[0, 2.4], [.5, 1.9], [1, 1.5], [1.5, .9], [2.2, .5], [3, .2], [3.6, .5], [3.9, 1.1], [3.5, 1.5], [-.4, 2.9], [.3, 2.9]], [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [0, 9], [0, 10]]],
  ['the Twins', 'Ikrek', 30, 21, [[0, 0], [.2, 1], [.4, 2], [.5, 3], [1.4, 0], [1.6, 1], [1.8, 2], [1.7, 3], [.5, 3.6], [1.9, 3.6]], [[0, 1], [1, 2], [2, 3], [3, 8], [4, 5], [5, 6], [6, 7], [7, 9], [2, 6]]],
];
