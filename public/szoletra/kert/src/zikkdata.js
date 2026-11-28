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
};

// a még nem kész emeletek tanítói ezt mondják
export const TOWER_WAIT = {
  tmerchant: ['Ah, a visitor! My idioms are still packed in my bags. Come back soon, my friend.', 'Á, egy látogató! Az idiómáim még a csomagjaimban vannak. Gyere vissza hamarosan, barátom.'],
};
