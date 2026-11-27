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
  bouquet: ['bouquet', 'virágcsokor', 'He bought a bouquet of roses for his mother.', 'Egy csokor rózsát vett az anyjának.', 'b1'],
  petal: ['petal', 'szirom', 'The petals of the lily are white and soft.', 'A liliom szirmai fehérek és puhák.', 'b1'],
  ring: ['ring', 'gyűrű', 'She wears a silver ring on her left hand.', 'Ezüstgyűrűt hord a bal kezén.', 'a2'],
  necklace: ['necklace', 'nyaklánc', 'The necklace was made of gold and blue stones.', 'A nyaklánc aranyból és kék kövekből készült.', 'b1'],
  bracelet: ['bracelet', 'karkötő', 'Her bracelet jingled when she moved.', 'A karkötője csilingelt, amikor mozgott.', 'b1'],
  bargain: ['bargain', 'jó vétel, alku', 'Three loaves for one coin? That is a real bargain!', 'Három cipó egy érméért? Ez aztán a jó vétel!', 'b1'],
  ripe: ['ripe', 'érett', 'These figs are ripe, eat them today.', 'Ezek a fügék érettek, edd meg őket ma.', 'b1'],
  bunch: ['bunch', 'csokor, köteg, fürt', 'I bought a bunch of carrots and a bunch of grapes.', 'Vettem egy köteg répát és egy fürt szőlőt.', 'b1'],
  rug: ['rug', 'szőnyeg (kisebb)', 'The cat sleeps on the rug by the door.', 'A macska az ajtó melletti szőnyegen alszik.', 'a2'],
  pattern: ['pattern', 'minta', 'I love the blue pattern on this rug.', 'Imádom a kék mintát ezen a szőnyegen.', 'b1'],
  wool: ['wool', 'gyapjú', 'This rug is made of sheep wool.', 'Ez a szőnyeg birkagyapjúból készült.', 'a2'],
  lantern: ['lantern', 'lámpás', 'He carried a lantern through the dark street.', 'Egy lámpást vitt a sötét utcán.', 'b1'],
  anvil: ['anvil', 'üllő', 'The smith hammered the hot copper on the anvil.', 'A kovács az üllőn kalapálta a forró rezet.', 'b2'],
  hammer: ['hammer', 'kalapács', 'Can you pass me the hammer, please?', 'Ideadnád a kalapácsot, kérlek?', 'a2'],
  copper: ['copper', 'réz', 'These pots are made of copper.', 'Ezek az edények rézből készültek.', 'b1'],
  oven: ['oven', 'kemence, sütő', 'The baker lit the oven before sunrise.', 'A pék napkelte előtt begyújtotta a kemencét.', 'a2'],
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
  flowers: [
    { title: 'Csokor valakinek', steps: [
      { say: 'Good morning! Are you looking for flowers for someone special?', hu: 'Jó reggelt! Valakinek, aki különleges, keresel virágot?', replies: [
        ["Yes, I\'d like a bouquet for my mother, please.", 1, 'How lovely! Mothers always deserve flowers.'],
        ['Yes, I would like flowers to my mother.', 0, 'For your mother, you mean? Flowers FOR someone.', 'Valakinek: for (nem to). Flowers for my mother.'],
        ['Yes, I am looking flowers.', 0, 'Looking FOR flowers, my dear.', 'A look után for kell: look for = keres.']] },
      { say: 'Roses or lilies? The roses smell sweeter, but the lilies last longer.', hu: 'Rózsát vagy liliomot? A rózsa édesebb illatú, de a liliom tovább bírja.', replies: [
        ['Which ones will last longer in a vase?', 1, 'The lilies. Change the water every day and they will last a week.'],
        ['Which ones are more long?', 0, 'Longer, not more long. And for flowers we say they LAST longer.', 'Rövid melléknév: -er (longer). Az eltarthatóság: last longer.'],
        ['The lilies are more sweet than roses?', 0, 'Sweeter! And no, the roses are sweeter.', 'Egy szótagú melléknév: sweeter, nem more sweet.']] },
    ] },
    { title: 'Bocsánatkérő virág', steps: [
      { say: 'You look worried. Did something happen?', hu: 'Gondterheltnek tűnsz. Történt valami?', replies: [
        ['I forgot my friend\'s birthday. I want to say sorry.', 1, 'Oh dear. A small bouquet with a kind note will help.'],
        ['I have forgot my friend birthday.', 0, 'You forgot your friend\'s birthday? That happens!', 'Múlt idő: I forgot. Birtokos: friend\'s birthday.'],
        ['My friend is birthday, I am sorry him.', 0, 'I am not sure I understand. Is it your friend\'s birthday?', 'Helyesen: It is my friend\'s birthday. I want to apologise to him.']] },
      { say: 'Shall I write something on the card for you?', hu: 'Írjak valamit a kártyára helyetted?', replies: [
        ['Yes, please. Could you write "Sorry I forgot"?', 1, 'Of course. Short and honest is the best.'],
        ['Yes, write please me.', 0, 'Write it for you? Say: Could you write it for me?', 'Udvarias kérés: Could you write ... for me?'],
        ['No, thanks, I write myself.', 0, 'You will write it yourself? Fine, here is the pen.', 'Jövő/szándék: I\'ll write it myself.']] },
    ] },
  ],
  jewel: [
    { title: 'Valódi arany?', steps: [
      { say: 'Welcome! Everything here is made by my own hands.', hu: 'Üdvözöllek! Itt mindent a saját kezemmel készítettem.', replies: [
        ['It is beautiful. Is this ring made of real gold?', 1, 'Real gold, from the mountains in the east. Feel how heavy it is.'],
        ['Is this ring made from real gold?', 0, 'Made OF gold. We say made of when you can still see the material.', 'Anyag, ami látszik: made of gold. A made from átalakított anyagnál kell.'],
        ['This ring is real golden?', 0, 'Is it real gold, you mean? Yes, it is.', 'Kérdés: Is it real gold? (golden inkább színre mondjuk)']] },
      { say: 'This necklace is the most expensive piece in my shop.', hu: 'Ez a nyaklánc a legdrágább darab a boltomban.', replies: [
        ['Do you have anything cheaper? Maybe a bracelet?', 1, 'Of course. This silver bracelet is much cheaper, but just as pretty.'],
        ['Do you have something more cheap?', 0, 'Cheaper! Cheap is a short word, so we add -er.', 'Rövid melléknév: cheaper, nem more cheap.'],
        ['It is the expensivest?', 0, 'The MOST expensive. Long words take most.', 'Hosszú melléknév: the most expensive.']] },
    ] },
    { title: 'Alkudozás', steps: [
      { say: 'For you, this bracelet is only five silver coins.', hu: 'Neked ez a karkötő csak öt ezüstérme.', replies: [
        ['That is a bit too much for me. Would you take three?', 1, 'Three? You want to ruin me! Four, and it is a bargain.'],
        ['It is too much expensive.', 0, 'Too expensive, or much too expensive. Not too much expensive.', 'Túl drága: too expensive (erősítve: much too expensive).'],
        ['I give you three coin.', 0, 'Three coinS. And it sounds like an order, not an offer!', 'Többes szám: three coins. Ajánlat: Would you take three?']] },
      { say: 'Four coins, and I wrap it in a silk cloth for you.', hu: 'Négy érme, és becsomagolom neked egy selyemkendőbe.', replies: [
        ['Deal! Thank you, it is a lovely gift.', 1, 'A pleasure doing business with you. Come again!'],
        ['Okay, I am agree.', 0, 'You agree, not you are agree. But yes, deal!', 'Az agree ige: I agree (am nélkül).'],
        ['Yes, I wrap it myself.', 0, 'No need, I will wrap it. You just pay!', 'Ő csomagolja be, te csak fogadd el: Deal! / Thank you.']] },
    ] },
  ],
  veg: [
    { title: 'Mennyit kérsz?', steps: [
      { say: 'Fresh from the fields this morning! What would you like?', hu: 'Ma reggel szedtem a földekről! Mit kérsz?', replies: [
        ['Half a kilo of onions and a bunch of carrots, please.', 1, 'Here you are. The carrots are very sweet this week.'],
        ['I want some onion and one carrots.', 0, 'Some onionS, and a bunch of carrots, perhaps?', 'Megszámolható többes: some onions. Répából: a bunch of carrots.'],
        ['Give half kilo onions.', 0, 'Half A kilo OF onions, please! Say please at the market.', 'Mennyiség: half a kilo of onions, please.']] },
      { say: 'Anything else? I also have cabbages and pumpkins.', hu: 'Még valamit? Van káposztám és tököm is.', replies: [
        ['How much is a cabbage? And how many pumpkins do you have?', 1, 'One coin for a cabbage. I have only three pumpkins left.'],
        ['How many is a cabbage?', 0, 'How MUCH is it. We ask how much about price.', 'Ár: How much is it? Darabszám: How many?'],
        ['How much pumpkins you have?', 0, 'How MANY pumpkins DO you have? Pumpkins can be counted.', 'Megszámolható: how many. Kérdésben: do you have.']] },
    ] },
    { title: 'Friss-e?', steps: [
      { say: 'These figs are the best in Babylon. Try one!', hu: 'Ezek a legjobb fügék Babilonban. Kóstolj meg egyet!', replies: [
        ['Mmm, they are very sweet. Are they ripe?', 1, 'Perfectly ripe. Eat them today or tomorrow.'],
        ['They are very sweets.', 0, 'Sweet, not sweets. Sweets are candies!', 'Melléknév nem kap -s-t: they are sweet.'],
        ['Are they mature?', 0, 'Ha! Fruit is not mature, it is RIPE. People are mature.', 'Gyümölcsre: ripe. A mature embereknél, borra stb. jó.']] },
      { say: 'Do you need a bag, or do you have your own basket?', hu: 'Kell zacskó, vagy van saját kosarad?', replies: [
        ["I have my own basket, thanks.", 1, 'Good! Put the figs on top so they don\'t get crushed.'],
        ['I have an own basket.', 0, 'My OWN basket. Own always comes after my, your, his...', 'Saját: my own basket (nem an own).'],
        ['No, I don\'t need any bag.', 0, 'Close! But you have a basket, right? Say: I don\'t need a bag.', 'Egyetlen dologra: I don\'t need a bag. (any inkább többesnél)']] },
    ] },
  ],
  carpet: [
    { title: 'Szőnyeg a szobába', steps: [
      { say: 'Welcome, friend! Every rug here is handmade from sheep wool.', hu: 'Üdv, barátom! Itt minden szőnyeg kézzel készült birkagyapjúból.', replies: [
        ['I love this red one. How long did it take to make?', 1, 'Almost three months. My wife and her sister work on each one.'],
        ['How long it took to make?', 0, 'How long DID it take? Questions need did in the past.', 'Múlt idejű kérdés: How long did it take?'],
        ['I love this red. How many time it took?', 0, 'This red ONE. And how long did it take? Time is not counted.', 'Egy dologra: this red one. Idő: how long (nem how many time).']] },
      { say: 'This one is three metres long. Is it the right size for your room?', hu: 'Ez három méter hosszú. Jó méret a szobádba?', replies: [
        ["I\'m afraid it\'s too big. Do you have a smaller one?", 1, 'Of course. This blue one is smaller, and the pattern is the same.'],
        ['It is too much big for my room.', 0, 'Too big, not too much big.', 'Túl nagy: too big.'],
        ['It is not enough small.', 0, 'Small enough! Enough comes after the adjective.', 'Elég kicsi: small enough (az enough a melléknév után).']] },
    ] },
    { title: 'Kiszállítás', steps: [
      { say: 'It is heavy. Shall I send my son to carry it to your house?', hu: 'Nehéz. Elküldjem a fiamat, hogy elvigye a házadhoz?', replies: [
        ['Yes, please. Could you deliver it tomorrow morning?', 1, 'Tomorrow morning, before the sun gets hot. Where do you live?'],
        ['Yes, you can deliver it tomorrow morning?', 0, 'It sounds better as a polite question: Could you deliver it...?', 'Udvarias kérés: Could you deliver it tomorrow morning?'],
        ['Yes, please bring it on tomorrow.', 0, 'Just tomorrow, no on. We say on Monday, but just tomorrow.', 'Tomorrow előtt nincs elöljáró: bring it tomorrow.']] },
      { say: 'Where is your house?', hu: 'Hol van a házad?', replies: [
        ['Near the Ishtar Gate, next to the big fountain.', 1, 'I know it well. My son will be there before breakfast.'],
        ['It is near to Ishtar Gate, next the fountain.', 0, 'Near the Ishtar Gate, next TO the fountain.', 'Near után nem kell to, next után igen: next to.'],
        ['My house is in the Ishtar Gate.', 0, 'IN the gate? You live inside the gate? Near it, I think!', 'Helyhatározó: near the gate (a közelében).']] },
    ] },
  ],
  tea: [
    { title: 'Egy csésze tea', steps: [
      { say: 'Good evening! Would you like a cup of hot mint tea?', hu: 'Jó estét! Kérsz egy csésze forró mentateát?', replies: [
        ['Yes, please. With a little honey, if you have some.', 1, 'Of course. Honey from the kitchen garden, very fresh.'],
        ['Yes, I like.', 0, 'You would like ONE, I think. Yes, please!', 'Kínálásra: Yes, please. (I like = szeretem általában)'],
        ['Yes, with honey and without sugar and with.', 0, 'With honey, without sugar? Let us keep it simple!', 'With honey = mézzel, without sugar = cukor nélkül.']] },
      { say: 'Careful, the kettle is very hot. Do you want it with or without mint leaves?', hu: 'Vigyázz, a teáskanna nagyon forró. Mentalevéllel vagy anélkül kéred?', replies: [
        ['With mint leaves, please. It smells wonderful.', 1, 'It does. My grandmother grew this mint.'],
        ['With mint leafs, please.', 0, 'Leaves! One leaf, two leaves.', 'Rendhagyó többes szám: leaf, leaves.'],
        ['Without of mint.', 0, 'Just without mint. No of after without.', 'Without után nincs of: without mint.']] },
    ] },
    { title: 'Esti beszélgetés', steps: [
      { say: 'The market is quiet now. Have you been in Babylon long?', hu: 'Most csendes a piac. Régóta vagy Babilonban?', replies: [
        ["Not very long. I arrived a few weeks ago.", 1, 'Welcome, then! You will love the night market.'],
        ['I am in Babylon since few weeks.', 0, 'I HAVE BEEN here FOR a few weeks. Or: I arrived a few weeks ago.', 'Időtartam: have been ... for a few weeks.'],
        ['I arrived before few weeks.', 0, 'A few weeks AGO. Ago comes after the time.', 'Ezelőtt: a few weeks ago (nem before).']] },
      { say: 'What do you like most about the city?', hu: 'Mit szeretsz a legjobban a városban?', replies: [
        ['The lanterns at night. The streets look magical.', 1, 'Yes! When the lanterns are lit, Babylon looks like the sky.'],
        ['I like the most the lanterns.', 0, 'I like the lanterns most. Most goes at the end.', 'Szórend: I like the lanterns most / the most.'],
        ['The lanterns at the night.', 0, 'At night, without the. Very nice choice though!', 'Éjjel: at night (névelő nélkül).']] },
    ] },
  ],
  story: [
    { title: 'Az özönvíz meséje', steps: [
      { say: 'Long ago, the gods sent a great flood. One wise man built a huge boat and saved the animals. Do you know his name?', hu: 'Régen az istenek nagy özönvizet küldtek. Egy bölcs ember hatalmas hajót épített, és megmentette az állatokat. Tudod a nevét?', replies: [
        ['No, I don\'t. What was his name?', 1, 'His name was Utnapishtim. The gods gave him eternal life.'],
        ['No, what is was his name?', 0, 'What WAS his name. Just one verb!', 'Múlt idejű kérdés: What was his name?'],
        ['No, I don\'t know he.', 0, 'You don\'t know HIM. After a verb: him, her, them.', 'Tárgyeset: know him.']] },
      { say: 'When the rain stopped, he sent out a bird to find land. What do you think happened?', hu: 'Amikor elállt az eső, kiküldött egy madarat, hogy szárazföldet keressen. Szerinted mi történt?', replies: [
        ['Maybe the bird found land and didn\'t come back.', 1, 'Clever! The raven found land and never returned. So they knew the water was going down.'],
        ['Maybe the bird finded land.', 0, 'FOUND. Find, found, found.', 'Rendhagyó ige: find, found, found.'],
        ['Maybe the bird didn\'t came back.', 0, 'Didn\'t COME back. After did, the verb stays simple.', 'Did/didn\'t után alapalak: didn\'t come.']] },
    ] },
    { title: 'Gilgames és Enkidu', steps: [
      { say: 'King Gilgamesh was strong but proud. Then he met Enkidu, a wild man from the forest. They fought, and then...?', hu: 'Gilgames király erős volt, de büszke. Aztán találkozott Enkiduval, egy erdei vademberrel. Megküzdöttek, és aztán...?', replies: [
        ['And then they became best friends?', 1, 'Exactly! The fight made them brothers. They went on many adventures together.'],
        ['And then they becomed friends?', 0, 'BECAME. Become, became, become.', 'Rendhagyó ige: become, became, become.'],
        ['And then they were friendship.', 0, 'They BECAME FRIENDS. Friendship is the thing, friends are the people.', 'Barátok lettek: became friends.']] },
      { say: 'Later Enkidu died, and Gilgamesh was very sad. He wanted to live forever. Do you think he found the secret?', hu: 'Később Enkidu meghalt, és Gilgames nagyon szomorú volt. Örökké akart élni. Szerinted megtalálta a titkot?', replies: [
        ['I don\'t think so. Nobody can live forever.', 1, 'Wise words. He learned that a good life is better than a long one.'],
        ['I think not he found it.', 0, 'I DON\'T THINK he found it. In English we put the not on think.', 'Tagadásnál: I don\'t think he found it.'],
        ['Nobody can\'t live forever.', 0, 'Nobody CAN live forever. Nobody is already negative!', 'A nobody már tagad, nem kell mellé can\'t.']] },
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
