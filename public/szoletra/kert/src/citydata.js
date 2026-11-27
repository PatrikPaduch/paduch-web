// Babilon utcái: városi szavak, beszélgetések (Nabu és az árusok), a könyvtár agyagtáblái.

// [angol, magyar, példamondat, fordítás, szint] – mint a kertszavak; felfedezve +5 pont, és bekerül a Szólétrába
export const CITY_WORDS = {
  merchant: ['merchant', 'kereskedő', 'The merchant sold silk from distant lands.', 'A kereskedő távoli földekről származó selymet árult.', 'b1'],
  stall: ['stall', 'árusstand, bódé', 'Her stall is full of fresh fruit every morning.', 'A standja minden reggel tele van friss gyümölccsel.', 'b1'],
  scale: ['scale', 'mérleg', 'He put the dates on the scale.', 'Feltette a datolyát a mérlegre.', 'b1'],
  basket: ['basket', 'kosár', 'She carried a basket of figs on her head.', 'Egy kosár fügét vitt a fején.', 'a2'],
  spice: ['spice', 'fűszer', 'The air smelled of cinnamon and other spices.', 'A levegő fahéj- és más fűszerillatú volt.', 'b1'],
  pottery: ['pottery', 'kerámia, cserépedény', 'The pottery in this shop is made by hand.', 'Ebben a boltban kézzel készítik a kerámiát.', 'b1'],
  jar: ['jar', 'korsó, befőttesüveg', 'Oil was stored in big clay jars.', 'Az olajat nagy agyagkorsókban tárolták.', 'b1'],
  fabric: ['fabric', 'szövet, kelme', 'This fabric is soft and very light.', 'Ez a szövet puha és nagyon könnyű.', 'b1'],
  jewellery: ['jewellery', 'ékszer', 'She wore gold jewellery to the festival.', 'Arany ékszert viselt az ünnepen.', 'b1'],
  loaf: ['loaf', 'cipó, vekni', 'I bought a fresh loaf of bread.', 'Vettem egy friss cipót.', 'b1'],
  baker: ['baker', 'pék', 'The baker gets up at four every morning.', 'A pék minden reggel négykor kel.', 'a2'],
  fishmonger: ['fishmonger', 'halárus', 'The fishmonger cleaned the fish for us.', 'A halárus megtisztította nekünk a halat.', 'b2'],
  coin: ['coin', 'érme', 'He paid with three silver coins.', 'Három ezüstérmével fizetett.', 'a2'],
  purse: ['purse', 'pénztárca (női), erszény', 'Keep your purse safe in the crowd.', 'A tömegben vigyázz a pénztárcádra.', 'b1'],
  awning: ['awning', 'napellenző', 'We waited under the awning until the rain stopped.', 'A napellenző alatt vártunk, amíg elállt az eső.', 'b2'],
  haggle: ['haggle', 'alkudozni', 'In the old market, people haggle over every price.', 'A régi piacon mindenen alkudoznak.', 'b2'],
  library: ['library', 'könyvtár', 'I borrowed three books from the library.', 'Három könyvet kölcsönöztem a könyvtárból.', 'a2'],
  scroll: ['scroll', 'tekercs', 'The old scroll was too fragile to open.', 'A régi tekercs túl törékeny volt ahhoz, hogy kinyissák.', 'b2'],
  scribe: ['scribe', 'írnok', 'A scribe wrote down every word the king said.', 'Egy írnok minden szót leírt, amit a király mondott.', 'b2'],
  ink: ['ink', 'tinta', 'My pen has run out of ink.', 'Kifogyott a tinta a tollamból.', 'b1'],
  bookshelf: ['bookshelf', 'könyvespolc', 'The bookshelf is full of old maps.', 'A könyvespolc tele van régi térképekkel.', 'a2'],
  librarian: ['librarian', 'könyvtáros', 'The librarian helped me find the right book.', 'A könyvtáros segített megtalálni a megfelelő könyvet.', 'b1'],
  'clay tablet': ['clay tablet', 'agyagtábla', 'The Babylonians wrote on clay tablets.', 'A babiloniak agyagtáblákra írtak.', 'b1'],
  'vegetable patch': ['vegetable patch', 'zöldségágyás', 'We grow carrots in our vegetable patch.', 'A zöldségágyásunkban sárgarépát termesztünk.', 'b1'],
  scarecrow: ['scarecrow', 'madárijesztő', 'The scarecrow keeps the birds away from the seeds.', 'A madárijesztő távol tartja a madarakat a magoktól.', 'b2'],
  beehive: ['beehive', 'méhkas, kaptár', 'There are three beehives at the end of the garden.', 'A kert végében három méhkas van.', 'b2'],
  honey: ['honey', 'méz', 'I put a spoonful of honey in my tea.', 'Egy kanál mézet tettem a teámba.', 'a2'],
  cabbage: ['cabbage', 'káposzta', 'Cabbage soup is cheap and warming.', 'A káposztaleves olcsó és melengető.', 'a2'],
  onion: ['onion', 'hagyma', 'Chopping onions always makes me cry.', 'A hagymavágástól mindig sírok.', 'a2'],
  carrot: ['carrot', 'sárgarépa', 'Rabbits love carrots.', 'A nyulak imádják a sárgarépát.', 'a2'],
  pumpkin: ['pumpkin', 'tök', 'We made soup from a big orange pumpkin.', 'Egy nagy narancssárga tökből levest főztünk.', 'a2'],
  'watering can': ['watering can', 'locsolókanna', 'Fill the watering can at the well.', 'Töltsd meg a locsolókannát a kútnál.', 'b1'],
  spade: ['spade', 'ásó', 'He dug a hole with a spade.', 'Ásóval lyukat ásott.', 'b2'],
  wheelbarrow: ['wheelbarrow', 'talicska', 'We moved the soil in a wheelbarrow.', 'Talicskával hordtuk a földet.', 'b2'],
  harvest: ['harvest', 'betakarítás, termés', 'The harvest was good this year.', 'Idén jó volt a termés.', 'b1'],
  fence: ['fence', 'kerítés', 'A low fence goes around the garden.', 'Alacsony kerítés veszi körül a kertet.', 'a2'],
  boat: ['boat', 'csónak, hajó', 'They crossed the river in a small boat.', 'Egy kis csónakkal keltek át a folyón.', 'a2'],
  sail: ['sail', 'vitorla; hajózni', 'The wind filled the white sail.', 'A szél felfújta a fehér vitorlát.', 'b1'],
  harbour: ['harbour', 'kikötő', 'The ships stayed in the harbour during the storm.', 'A hajók a vihar alatt a kikötőben maradtak.', 'b1'],
  fisherman: ['fisherman', 'halász', 'The fisherman goes out before sunrise.', 'A halász napkelte előtt indul.', 'b1'],
  rope: ['rope', 'kötél', 'Tie the boat with a strong rope.', 'Kösd ki a csónakot egy erős kötéllel.', 'b1'],
  donkey: ['donkey', 'szamár', 'The donkey pulled the cart to the market.', 'A szamár húzta a kocsit a piacra.', 'a2'],
  cart: ['cart', 'kocsi, szekér', 'The cart was full of sacks of grain.', 'A szekér tele volt gabonászsákokkal.', 'b1'],
  sack: ['sack', 'zsák', 'He carried a heavy sack of flour on his back.', 'Egy nehéz liszteszsákot vitt a hátán.', 'b1'],
  crate: ['crate', 'láda, rekesz', 'They packed the jars in a wooden crate.', 'A korsókat egy faládába csomagolták.', 'b2'],
  pigeon: ['pigeon', 'galamb', 'The pigeons flew up when the children ran past.', 'A galambok felröppentek, amikor a gyerekek elszaladtak mellettük.', 'a2'],
  hen: ['hen', 'tyúk', 'The hen laid an egg this morning.', 'A tyúk ma reggel tojt egy tojást.', 'a2'],
  'fishing net': ['fishing net', 'halászháló', 'The fisherman mended his fishing net on the quay.', 'A halász a rakparton foltozta a halászhálóját.', 'b1'],
  alley: ['alley', 'sikátor', 'A narrow alley leads to the market.', 'Egy keskeny sikátor vezet a piacra.', 'b2'],
  rooftop: ['rooftop', 'háztető (lapos)', 'In summer people slept on the rooftops.', 'Nyáron az emberek a háztetőkön aludtak.', 'b2'],
  ladder: ['ladder', 'létra', 'He climbed the ladder to the roof.', 'Felmászott a létrán a tetőre.', 'b1'],
};

// Beszélgetések: az NPC angolul mond valamit, te választasz a 3 angol válasz közül.
// válasz: [angol, jó-e (1/0), az NPC reakciója angolul, magyar magyarázat rossz válasznál]
export const CONVOS = {
  nabu: [
    { title: 'A reggeli időjárás', steps: [
      { say: "Good morning! Lovely weather today, isn't it?", hu: 'Jó reggelt! Kellemes idő van ma, nem igaz?', replies: [
        ["Yes, it's beautiful. Not too hot.", 1, 'Exactly. Perfect weather for the roses.'],
        ["I'm fine, thank you.", 0, "Hmm? I asked about the weather, my friend.", 'Az időjárásról kérdezett, nem arról, hogy vagy.'],
        ['Yes, I have a morning.', 0, 'Ha! I meant the weather.', 'A "have a morning" értelmetlen; egyetértést vár az idővel kapcsolatban.']] },
      { say: 'Do you think it will rain later?', hu: 'Szerinted esni fog később?', replies: [
        ["I don't think so. There aren't any clouds.", 1, "Good. Then I'll water the plants myself."],
        ['Yes, I rained yesterday.', 0, "You rained? Ha ha. You mean it rained.", 'Az eső alanya az "it": it rained, nem I rained.'],
        ['It is raining tomorrow.', 0, "Tomorrow? I asked about later today.", 'A mai délutánról kérdezett, és a jövőre "will" vagy "going to" kell.']] },
    ] },
    { title: 'Tanács a kertben', steps: [
      { say: 'My lemon tree looks a bit sad. What would you do?', hu: 'A citromfám kicsit szomorúan néz ki. Te mit tennél?', replies: [
        ['Maybe it needs more sun and less water.', 1, 'Hmm, you might be right. I water it too much.'],
        ['I would be a lemon.', 0, 'A lemon? Ha! I asked what you would do.', '"Mit tennél?" kérdésre tanácsot vár: "I would..." + ige.'],
        ['It is sad because it is Monday.', 0, 'Trees don\'t know about Mondays, my friend!', 'Tréfás, de nem tanács; a fa gondozásáról kérdezett.']] },
      { say: 'Should I move it closer to the wall?', hu: 'Tegyem közelebb a falhoz?', replies: [
        ['Yes, the wall keeps it warm at night.', 1, "Clever. I'll do it this afternoon."],
        ['Yes, I should.', 0, 'You should? It is my tree!', 'Ő kérdezte, hogy ő tegye-e: "Yes, you should" lenne a helyes.'],
        ['The wall is very old.', 0, 'Old, yes. But is it a good idea?', 'Igen/nem választ és indoklást vár.']] },
    ] },
    { title: 'Nabu élete', steps: [
      { say: 'Did you know I have worked in this garden for forty years?', hu: 'Tudtad, hogy negyven éve dolgozom ebben a kertben?', replies: [
        ["Forty years? That's amazing! You must know every plant.", 1, 'Every plant, every stone, and every bird.'],
        ['I work in this garden for forty years.', 0, 'You? You are much too young!', 'Ő dolgozik itt régóta, nem te; és a jelen befejezett kellene (have worked).'],
        ['Yes, I knew it tomorrow.', 0, 'Tomorrow? You make me laugh.', 'A "knew it tomorrow" ellentmondás: a múlt idő és a holnap nem fér össze.']] },
      { say: "What do you like most about the garden?", hu: 'Mit szeretsz a legjobban a kertben?', replies: [
        ['I love the waterfall and the view from the top.', 1, 'Ah, the view from the temple. The queen loved it too.'],
        ['I like it most.', 0, 'Yes, but what exactly?', 'Konkrétumot kérdezett: mit szeretsz benne.'],
        ['The garden is liking me.', 0, 'The garden likes everybody!', 'A "like" állapotige, nem áll folyamatos alakban: likes, nem is liking.']] },
    ] },
  ],
  baker: [
    { title: 'Kenyérvásárlás', steps: [
      { say: 'Fresh bread! What can I get you?', hu: 'Friss kenyér! Mit adhatok?', replies: [
        ["Could I have two loaves of bread, please?", 1, 'Of course. They came out of the oven ten minutes ago.'],
        ['I can have two breads.', 0, 'You can? Then take them!', 'Udvarias kérés: "Could I have...?"; a bread megszámlálhatatlan: two loaves.'],
        ['Give bread.', 0, 'Hmm, a little more politely, please!', 'Túl nyers; a "please" és a "Could I have" az udvarias forma.']] },
      { say: "That's three coins. Anything else?", hu: 'Az három érme. Még valamit?', replies: [
        ["No, that's all, thanks. Here you are.", 1, 'Thank you! Have a nice day.'],
        ['No, it is everything of me.', 0, "Everything of you? I don't understand.", 'Természetes válasz: "That\'s all, thanks."'],
        ['Yes, I am three coins.', 0, 'Ha! You are a person, not money.', 'Rosszul értetted: az ár volt három érme.']] },
    ] },
  ],
  fruit: [
    { title: 'Gyümölcs a piacon', steps: [
      { say: 'The figs are very sweet today. Would you like to try one?', hu: 'Ma nagyon édes a füge. Megkóstolsz egyet?', replies: [
        ["Yes, please. Mmm, it's delicious!", 1, "I told you! They're from my brother's farm."],
        ['No, I would like.', 0, 'No or yes? Make up your mind!', 'Ellentmondás: a "No" után nem jöhet "I would like".'],
        ["I'm trying the figs yesterday.", 0, 'Yesterday? These are today\'s figs!', 'Múltbeli eseményhez múlt idő kell, és a kínálás most történik.']] },
      { say: 'How many would you like?', hu: 'Mennyit kérsz?', replies: [
        ['Half a kilo, please. How much is that?', 1, 'Half a kilo is two coins.'],
        ['How much would you like?', 0, "No, no, I'm asking you!", 'Visszakérdeztél ahelyett, hogy mennyiséget mondtál volna.'],
        ['Many like.', 0, 'Many? Tell me a number, please.', 'Konkrét mennyiség kell: "Half a kilo, please."']] },
      { say: 'Two coins, but for you, one and a half.', hu: 'Két érme, de neked másfél.', replies: [
        ["That's very kind of you. Thank you!", 1, 'You are welcome. Come back tomorrow!'],
        ["That's very kind for me.", 0, 'Kind for you? Ha, you mean "of me".', 'Kifejezés: "That\'s kind of you."'],
        ['No, I want to pay two hundred.', 0, 'Two hundred? Now that\'s a bad bargain!', 'Félreértés: nem kell többet fizetni, megköszönni illik.']] },
    ] },
  ],
  spice: [
    { title: 'A fűszerárusnál', steps: [
      { say: 'Smell this. Cinnamon from the east. Very rare!', hu: 'Szagold meg. Fahéj keletről. Nagyon ritka!', replies: [
        ["It smells wonderful. Is it expensive?", 1, 'For good things, you pay a little more.'],
        ['It smells wonderfully.', 0, 'Wonderfully? You mean wonderful!', 'A smell után melléknév áll: it smells wonderful.'],
        ['I am smelling.', 0, 'Yes... and? Do you like it?', 'Véleményt vár, nem azt, hogy éppen szagolsz.']] },
      { say: 'Five coins for a small bag.', hu: 'Öt érme egy kis zacskó.', replies: [
        ["That's a bit too much. Would you take four?", 1, 'Hmm... Four, because you have a kind face.'],
        ['That is too many coins.', 0, 'Too many? Well, it is the price.', 'Alkunál a "That\'s a bit too much" a természetes; és ajánlj árat.'],
        ['Five coins is cheap, I give you ten.', 0, 'Ten? I will not say no!', 'Alkudozni akartál, nem többet fizetni.']] },
    ] },
  ],
  potter: [
    { title: 'A fazekasnál', steps: [
      { say: 'Be careful, that jar is still drying.', hu: 'Vigyázz, az a korsó még szárad.', replies: [
        ["Oh, sorry! I didn't know. It's beautiful.", 1, 'Thank you. It will be ready tomorrow.'],
        ['I am careful yesterday.', 0, 'Yesterday? Be careful now!', 'Most kell vigyázni; és a múltra "was careful" lenne.'],
        ['The jar is drinking.', 0, 'Drinking? No, drying!', 'Drying (szárad) és drinking (iszik) összekeverve.']] },
      { say: 'Would you like me to make one for you?', hu: 'Szeretnéd, hogy csináljak egyet neked?', replies: [
        ['Yes, please. Could you make a small one for honey?', 1, 'A honey jar! Come back on Friday.'],
        ['Yes, I would like me to make one.', 0, 'You will make it? Then you are the potter!', 'Visszamondtad a kérdést rossz alannyal: "I would like you to make one."'],
        ['No, I make many jars.', 0, 'You make jars too? Show me!', 'Elutasítottad, és állítottad, hogy te is fazekas vagy.']] },
    ] },
  ],
  weaver: [
    { title: 'A kelmeárusnál', steps: [
      { say: 'This blue fabric is the finest in Babylon.', hu: 'Ez a kék kelme a legfinomabb egész Babilonban.', replies: [
        ['It is really soft. Do you have it in green too?', 1, 'In green, red and gold. Look here.'],
        ['It is the most soft.', 0, 'Most soft? We say "the softest"!', 'Rövid melléknév: softest, nem most soft.'],
        ['I am the finest.', 0, 'Ha! Maybe. But I was talking about the fabric.', 'A kelméről beszélt, nem rólad.']] },
      { say: 'How much do you need?', hu: 'Mennyi kell?', replies: [
        ['Enough for a shirt, please.', 1, 'Two metres will be enough.'],
        ['I need very.', 0, 'Very... what? Very much? Very little?', 'A "very" önmagában nem áll meg; mennyiséget mondj.'],
        ['How much do you need?', 0, "I'm the seller, my friend!", 'Visszakérdeztél ahelyett, hogy válaszoltál volna.']] },
    ] },
  ],
  fish: [
    { title: 'A halárusnál', steps: [
      { say: 'Caught this morning in the Euphrates!', hu: 'Ma reggel fogtuk az Eufráteszben!', replies: [
        ['It looks very fresh. Can you clean it for me?', 1, 'Of course. Give me two minutes.'],
        ['It looks very freshly.', 0, 'Freshly? You mean fresh.', 'A look után melléknév áll: it looks fresh.'],
        ['I caught it this morning.', 0, 'You? I caught it!', 'Ő fogta a halat, nem te.']] },
    ] },
  ],
  librarian: [
    { title: 'A könyvtárban', steps: [
      { say: 'Welcome to the House of Tablets. Can I help you?', hu: 'Üdvözöllek a Táblaházban. Segíthetek?', replies: [
        ["Yes, please. I'm looking for something about the stars.", 1, 'Astronomy! Our scribes wrote a lot about it. The tablets are on the left.'],
        ['Yes, you can help you.', 0, 'I can help... me? I think you mean "you can help me".', 'A tárgy: me (engem), nem you.'],
        ['No, I am a tablet.', 0, 'A tablet? You look like a person to me.', 'Értelmetlen válasz; egyszerűen mondd, mit keresel.']] },
      { say: 'Please be quiet, people are reading.', hu: 'Kérlek, maradj csendben, olvasnak.', replies: [
        ["Of course, sorry. I'll whisper.", 1, 'Thank you.'],
        ['I am reading quiet.', 0, 'Quietly. And yes, please.', 'Határozószó kell: quietly.'],
        ['Why are they reading?', 0, 'Because it is a library!', 'A kérés csendre szólt, nem magyarázatot vár.']] },
    ] },
  ],
  farmer: [
    { title: 'A konyhakertben', steps: [
      { say: "Watch your step, I've just planted the onions.", hu: 'Vigyázz, hova lépsz, most ültettem el a hagymát.', replies: [
        ["Sorry! I'll walk on the path.", 1, 'Thank you. The path is there for a reason.'],
        ['I am planting the onions.', 0, 'No, I planted them!', 'Ő ültette a hagymát; te csak vigyázz.'],
        ['Watch my step.', 0, 'Your step, yes, that is what I said!', 'Elég bocsánatot kérni és arrébb lépni.']] },
      { say: 'Would you like to help me with the harvest next week?', hu: 'Segítenél nekem a betakarításban jövő héten?', replies: [
        ["I'd love to! What time should I come?", 1, 'Early, before it gets hot. Around six.'],
        ['I would love to helping.', 0, 'To help, my friend, to help!', '"Would love to" után alapalak: to help.'],
        ['Next week was good.', 0, 'Was? Next week is in the future!', 'A jövőre nem használunk múlt időt.']] },
    ] },
  ],
  boatman: [
    { title: 'A rakparton', steps: [
      { say: 'Do you want to cross the river? One coin.', hu: 'Át akarsz kelni a folyón? Egy érme.', replies: [
        ["Not today, thanks. Maybe tomorrow.", 1, 'As you like. I am here every day.'],
        ['I want to cross the coin.', 0, 'Cross the coin? Cross the river!', 'A folyón kelsz át, az érme az ár.'],
        ['Yes, I am a river.', 0, 'A river? You must be tired!', 'Értelmetlen; igen vagy nem, és ha kell, mikor.']] },
      { say: 'The wind is strong today. Good for sailing.', hu: 'Erős ma a szél. Jó vitorlázni.', replies: [
        ['Is it dangerous when the wind is so strong?', 1, 'Only if you are not careful. I have sailed for thirty years.'],
        ['The wind is strongly.', 0, 'Strong. The wind is strong.', 'A "be" után melléknév: strong.'],
        ['Yes, I am sailing the wind.', 0, 'You sail a boat, not the wind!', 'Hajóval vitorlázol, a szél hajt.']] },
    ] },
  ],
};

// A könyvtár agyagtáblái (a TABLETS formátumában): [cím, x, z, y, angol, magyar, kérdés, válaszok, helyes]
export const CITY_TABLETS = [
  ['Writing in Clay', -60, 163.5, 0,
    'The Babylonians wrote by pressing a cut reed into wet clay. The marks look like small wedges, so we call this writing cuneiform. When the clay dried, the text could last for thousands of years.',
    'A babiloniak úgy írtak, hogy egy levágott nádszálat nyomtak a nedves agyagba. A jelek kis ékekre hasonlítanak, ezért ezt az írást ékírásnak nevezzük. Amikor az agyag megszáradt, a szöveg évezredekig megmaradhatott.',
    'Why could the texts last for so long?', ['Because they were written in gold', 'Because the clay dried and became hard', 'Because they were kept underwater'], 1],
  ['The Laws of Hammurabi', -52, 163.5, 0,
    'King Hammurabi wrote down almost three hundred laws on a tall stone. Everyone could read the same rules, so judges could not simply invent punishments. It is one of the oldest written legal codes in the world.',
    'Hammurapi király csaknem háromszáz törvényt íratott fel egy magas kőoszlopra. Mindenki ugyanazokat a szabályokat olvashatta, így a bírák nem találhattak ki egyszerűen büntetéseket. Ez a világ egyik legrégebbi írott törvénykönyve.',
    'Why was it important that the laws were written down?', ['So that everyone knew the same rules', 'So that the king could change them every day', 'So that only judges could read them'], 0],
  ['Counting in Sixties', -60, 178.5, 0,
    'Babylonian mathematicians counted in groups of sixty, not ten. That is why an hour has sixty minutes and a minute has sixty seconds. Every time you look at a clock, you use an idea from Babylon.',
    'A babiloni matematikusok hatvanasával számoltak, nem tízesével. Ezért van egy órában hatvan perc, egy percben pedig hatvan másodperc. Valahányszor órára nézel, egy babiloni ötletet használsz.',
    'What do we still use from the Babylonian number system?', ['Our money', 'Minutes and seconds', 'The alphabet'], 1],
  ['Watching the Stars', -52, 178.5, 0,
    'Priests watched the sky every night from the top of the temples. They wrote down the movements of the moon and the planets for hundreds of years. With these notes, they could predict eclipses.',
    'A papok minden éjjel a templomok tetejéről figyelték az eget. Évszázadokon át feljegyezték a Hold és a bolygók mozgását. Ezekkel a feljegyzésekkel előre meg tudták jósolni a fogyatkozásokat.',
    'What could the priests predict?', ['The weather', 'Eclipses', 'Earthquakes'], 1],
  ['The River of Trade', -64, 171, 0,
    'Boats on the Euphrates carried grain, wood, stone and cloth. Merchants travelled far to the north and south to buy what Babylon did not have. The river was the main road of the city.',
    'Az Eufrátesz hajói gabonát, fát, követ és szövetet szállítottak. A kereskedők messze északra és délre utaztak, hogy megvegyék, ami Babilonból hiányzott. A folyó volt a város fő útja.',
    'Why did merchants travel far away?', ['To visit their families', 'To buy what Babylon did not have', 'To escape the king'], 1],
  ['The Tower of Babel', -56, 182.6, 0,
    'In the centre of the city stood a huge temple tower called Etemenanki. It had seven levels and was almost ninety metres high. Many historians think it inspired the story of the Tower of Babel.',
    'A város közepén egy hatalmas templomtorony állt, Etemenanki. Hét szintje volt, és csaknem kilencven méter magas volt. Sok történész szerint ez ihlette a bábeli torony történetét.',
    'What do many historians think about Etemenanki?', ['It was built in one year', 'It inspired the story of the Tower of Babel', 'It stood outside the city'], 1],
];
