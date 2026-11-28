// Változatos napok Babilonban: minden nap más történik a városban. A nap fajtája a dátumból jön (nyolcnapos
// körökben, keverve), így két gépen is ugyanaz. Minden napnak 4 saját szava, egy tanítója 2 beszélgetéssel,
// és egy napi feladata (a 4 szó + egy beszélgetés = +20 pont).

// [angol, magyar, példamondat, fordítás, szint]
export const DAY_WORDS = {
  umbrella: ['umbrella', 'esernyő', 'Take an umbrella, it is going to rain.', 'Vigyél esernyőt, esni fog.', 'a2'],
  puddle: ['puddle', 'tócsa, pocsolya', 'The children jumped into every puddle.', 'A gyerekek minden pocsolyába beleugrottak.', 'b1'],
  thunder: ['thunder', 'mennydörgés', 'We heard thunder in the distance.', 'Távoli mennydörgést hallottunk.', 'b1'],
  soaked: ['soaked', 'bőrig ázott', 'I forgot my umbrella and got soaked.', 'Otthon felejtettem az esernyőmet, és bőrig áztam.', 'b2'],
  camel: ['camel', 'teve', 'A camel can walk for days without water.', 'A teve napokig bírja víz nélkül.', 'a2'],
  caravan: ['caravan', 'karaván', 'The caravan crossed the desert in forty days.', 'A karaván negyven nap alatt kelt át a sivatagon.', 'b1'],
  saddle: ['saddle', 'nyereg', 'He tied the bags to the saddle.', 'A nyereghez kötötte a zsákokat.', 'b1'],
  traveller: ['traveller', 'utazó, vándor', 'The tired traveller asked for some water.', 'A fáradt vándor egy kis vizet kért.', 'b1'],
  wedding: ['wedding', 'esküvő', 'The whole street was invited to the wedding.', 'Az egész utcát meghívták az esküvőre.', 'a2'],
  bride: ['bride', 'menyasszony', 'The bride wore a veil of gold thread.', 'A menyasszony aranyszálas fátylat viselt.', 'b1'],
  groom: ['groom', 'vőlegény', 'The groom was so nervous that he forgot his speech.', 'A vőlegény annyira izgult, hogy elfelejtette a beszédét.', 'b1'],
  guest: ['guest', 'vendég', 'More than a hundred guests came to the feast.', 'Több mint száz vendég jött el a lakomára.', 'a2'],
  sandstorm: ['sandstorm', 'homokvihar', 'The sandstorm hid the sun for a whole day.', 'A homokvihar egy egész napra eltakarta a napot.', 'b2'],
  dust: ['dust', 'por', 'There was dust on every table in the market.', 'A piacon minden asztalt por lepett be.', 'a2'],
  scarf: ['scarf', 'sál, kendő', 'Cover your mouth and nose with a scarf.', 'Takard el kendővel a szádat és az orrodat.', 'a2'],
  shutter: ['shutter', 'ablaktábla, spaletta', 'Close the shutters before the wind gets stronger.', 'Csukd be az ablaktáblákat, mielőtt erősebb lesz a szél.', 'b2'],
  porter: ['porter', 'hordár', 'The porters carried the sacks down from the ship.', 'A hordárok lehordták a zsákokat a hajóról.', 'b2'],
  gangplank: ['gangplank', 'palló (a hajóhoz)', 'Walk slowly on the gangplank, it is narrow.', 'Lassan menj a pallón, keskeny.', 'c1'],
  pearl: ['pearl', 'gyöngy', 'Divers bring pearls up from the bottom of the sea.', 'A búvárok a tenger fenekéről hozzák fel a gyöngyöt.', 'b1'],
  ivory: ['ivory', 'elefántcsont', 'The little box was decorated with ivory.', 'A kis dobozt elefántcsont díszítette.', 'b2'],
  crier: ['town crier', 'kikiáltó', 'The town crier read the news in the square.', 'A kikiáltó a téren olvasta fel a híreket.', 'c1'],
  decree: ['decree', 'rendelet', 'The king signed a new decree about taxes.', 'A király új rendeletet írt alá az adókról.', 'c1'],
  crowd: ['crowd', 'tömeg', 'A large crowd gathered in the square.', 'Nagy tömeg gyűlt össze a téren.', 'b1'],
  trumpet: ['trumpet', 'kürt, trombita', 'A trumpet sounded, and everybody went quiet.', 'Megszólalt a kürt, és mindenki elcsendesedett.', 'b1'],
  juggler: ['juggler', 'zsonglőr', 'The juggler kept five balls in the air.', 'A zsonglőr öt labdát tartott a levegőben.', 'b2'],
  acrobat: ['acrobat', 'akrobata', 'The acrobat turned cartwheels across the square.', 'Az akrobata cigánykerekeket hányt a téren át.', 'b1'],
  bunting: ['bunting', 'zászlófüzér', 'Colourful bunting hung across the street.', 'Színes zászlófüzér lógott az utca fölött.', 'c1'],
  applause: ['applause', 'taps', 'The show ended with loud applause.', 'Az előadás hangos tapssal ért véget.', 'b2'],
  wheat: ['wheat', 'búza', 'Bread is made from wheat.', 'A kenyér búzából készül.', 'a2'],
  sickle: ['sickle', 'sarló', 'She cut the wheat with a sickle.', 'Sarlóval vágta le a búzát.', 'b2'],
  sheaf: ['sheaf', 'kéve', 'They tied the wheat into sheaves.', 'Kévékbe kötötték a búzát.', 'c1'],
  grain: ['grain', 'gabona, gabonaszem', 'The grain is stored in large clay jars.', 'A gabonát nagy agyagkorsókban tárolják.', 'b1'],
};

// a napok: go = [x, z, nézési irány] a gyors utazáshoz (a tanító elé), hours = mikor zajlik az esemény
export const DAYS = [
  { id: 'rain', icon: '🌧', name: 'Esős nap', sub: 'zivatar Babilon fölött', npc: 'drain', who: 'Nidintu, az ernyőárus', where: 'a piac északi bejáratánál',
    desc: 'Ritka nagy eső: tócsák a piacon, villámlás, és az ernyőárusnak ma van a nagy napja.', go: [-19, 150.6, 0], words: ['umbrella', 'puddle', 'thunder', 'soaked'], weather: 'rain' },
  { id: 'caravan', icon: '🐫', name: 'Karaván érkezik', sub: 'tevék Elám földjéről', npc: 'dcaravan', who: 'Hanunu, a karavánvezető', where: 'a piac nyugati oldalán, a Táblaház fala mellett',
    desc: 'Harminckét napig tartó út után megérkezett egy karaván Elámból: tevék, bálák, fűszer és sok mesélnivaló.', go: [-30.9, 178.5, -Math.PI / 2], words: ['camel', 'caravan', 'saddle', 'traveller'] },
  { id: 'wedding', icon: '💐', name: 'Esküvő', sub: 'lakodalmas menet a piacon', npc: 'dwedding', who: 'Iddin-Marduk, a menyasszony apja', where: 'a piac közepén, a kút körül',
    desc: 'Férjhez megy az ezüstműves lánya: zenészek, vendégek és virágszirmok kerülik meg a kutat.', go: [-4, 158.6, 0], words: ['wedding', 'bride', 'groom', 'guest'] },
  { id: 'dust', icon: '🌪', name: 'Homokvihar', sub: 'a sivatag beér a városba', npc: 'ddust', who: 'Kudur, az őr', where: 'a piac északi bejáratánál',
    desc: 'Délről homokvihar fúj: narancsszínű ég, csukott ablaktáblák, az őrök kendővel járnak.', go: [16, 150.2, 0], words: ['sandstorm', 'dust', 'scarf', 'shutter'], weather: 'dust' },
  { id: 'ship', icon: '⛵', name: 'Hajó Dilmunból', sub: 'gyöngy és elefántcsont a rakparton', npc: 'dship', who: 'Lu-Enlil, a dilmuni kapitány', where: 'a rakparton, a stégtől nyugatra',
    desc: 'Nagy tengeri hajó kötött ki: a hordárok egész nap pakolnak, a kapitány gyöngyöt mutogat.', go: [-6.6, 224.2, 0], words: ['porter', 'gangplank', 'pearl', 'ivory'] },
  { id: 'herald', icon: '📜', name: 'A kikiáltó napja', sub: 'királyi rendelet a piacon', npc: 'dherald', who: 'Ubar, a város kikiáltója', where: 'a Táblaház fala mellett, az emelvénynél',
    desc: 'Kürtszó, tömeg és egy emelvény: ma hirdetik ki a király új rendeletét.', go: [-37.4, 186, -Math.PI / 2], words: ['crier', 'decree', 'crowd', 'trumpet'], hours: [7, 20.5] },
  { id: 'fair', icon: '🤹', name: 'Vásárnap', sub: 'mutatványosok a piacon', npc: 'dfair', who: 'Pirig, a zsonglőr', where: 'a piac keleti oldalán, a konyhakert előtt',
    desc: 'Zászlófüzérek a piac fölött, zsonglőr és akrobata a konyhakert előtt, taps és nevetés.', go: [33.4, 183.5, Math.PI / 2], words: ['juggler', 'acrobat', 'bunting', 'applause'] },
  { id: 'harvest', icon: '🌾', name: 'Aratónap', sub: 'búzaaratás a konyhakert előtt', npc: 'dharvest', who: 'Bau-asha, a földműves asszony', where: 'a piac keleti oldalán, a konyhakert előtt',
    desc: 'Learatják a kis búzamezőt: sarlók, kévék és a szérűn szálló pelyva.', go: [30.6, 183, Math.PI / 2], words: ['wheat', 'sickle', 'sheaf', 'grain'] },
];
export const DAY_BY = Object.fromEntries(DAYS.map(d => [d.id, d]));

/* ---------- melyik nap mi: nyolcnapos körök, körönként más sorrendben, két egyforma nap sosem jön egymás után ---------- */
const EPOCH = Date.UTC(2026, 0, 1);
export const dayNum = (d = new Date()) => Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - EPOCH) / 864e5);
function perm(b) {
  let s = ((b * 7919 + 104729) % 2147483647 + 2147483647) % 2147483647 || 1; const r = () => (s = s * 16807 % 2147483647) / 2147483647;
  const a = DAYS.map((_, i) => i); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export function dayTypeOf(n) {
  const L = DAYS.length, b = Math.floor(n / L), i = n - b * L, a = perm(b), prev = perm(b - 1);
  if (a[0] === prev[L - 1]) [a[0], a[1]] = [a[1], a[0]];
  return DAYS[a[i]].id;
}

// Beszélgetések (mint a városban): [angol válasz, jó-e, az NPC reakciója, magyar magyarázat rossz válasznál, (nyers/kor)]
export const DAY_CONVOS = {
  drain: [
    { title: 'Bőrig ázva', steps: [
      { say: 'Oh dear, you are soaked! Where is your umbrella?', hu: 'Jaj, bőrig áztál! Hol az esernyőd?', replies: [
        ["I left it at home. I didn't think it would rain.", 1, 'Nobody did! It has not rained like this for years.'],
        ["I don't think it will rain.", 0, 'Look up, my friend! It is already raining.', 'Már esik: arról beszélj múlt időben, amit reggel gondoltál (I didn\'t think it would rain).'],
        ['My umbrella is wet in the rain.', 0, 'Then where is it? I cannot see it!', 'Azt kérdezte, hol van az esernyőd. A válaszod nem mond helyet.']] },
      { say: 'Would you like to buy one? This one is made of palm leaves.', hu: 'Vennél egyet? Ez pálmalevélből készült.', replies: [
        ['Yes, please. How much is it?', 1, 'Only two coins. And you will stay dry all day.'],
        ['Yes, I would like to buying it.', 0, 'Buying? You mean: I would like to buy it.', 'A would like után to + az ige alapalakja áll: would like to buy.'],
        ['No. I like being wet.', 0, 'Ha! Then you are in the right city today.', 'Furcsa és kicsit nyers. Ha nem kell, mondd udvariasan: No, thank you.', 'nyers']] },
    ] },
    { title: 'Mikor áll el?', steps: [
      { say: 'Do you think the rain will stop soon?', hu: 'Szerinted hamarosan eláll az eső?', replies: [
        ['I hope so. The sky looks lighter in the west.', 1, 'You have good eyes. Maybe by noon, then.'],
        ['It stopped yesterday.', 0, 'Yesterday? It has not stopped since this morning!', 'A jövőről kérdezett (will stop), nem a múltról.'],
        ['Yes, it will rains.', 0, 'It will rains? You mean it will rain, or it will stop?', 'A will után az ige alapalakja áll: will rain. A kérdés ráadásul az elállásról szólt.']] },
      { say: 'In Babylon it almost never rains. What is the weather like in your country?', hu: 'Babilonban szinte sosem esik. Milyen az idő a te hazádban?', replies: [
        ['It rains quite often, especially in autumn.', 1, 'Often? Then I should sell my umbrellas there!'],
        ['I like the weather in my country.', 0, 'Good, but what is it like?', 'A „What is it like?” leírást kér, nem azt, hogy szereted-e.'],
        ['It is raining often in autumn.', 0, 'Hmm, we say: it often rains.', 'Ismétlődő dologra egyszerű jelen kell: it often rains.']] },
    ] },
  ],
  dcaravan: [
    { title: 'Messziről jöttünk', steps: [
      { say: 'Peace be with you! We have just arrived from the land of Elam.', hu: 'Béke veled! Épp most érkeztünk Elám földjéről.', replies: [
        ['Welcome to Babylon! How long have you been travelling?', 1, 'For thirty-two days. My camels are as tired as I am.'],
        ['Welcome! When have you arrived?', 0, 'Just now, as I said. But we say: when did you arrive?', 'A when mellé egyszerű múlt kell: When did you arrive?'],
        ['How long are you travelling?', 0, 'Are? We have finished travelling, my friend!', 'A mostanáig tartó időtartamra present perfect kell: How long have you been travelling?']] },
      { say: 'Have you ever travelled with a caravan?', hu: 'Utaztál már valaha karavánnal?', replies: [
        ['No, never. But I would love to try it one day.', 1, 'Then come with us next spring. The desert at night is beautiful.'],
        ['Yes, I have travelled with a caravan last year.', 0, 'Last year? Then: I travelled with a caravan last year.', 'Ha megmondod, mikor (last year), egyszerű múlt kell, nem present perfect.'],
        ['No, I never travel.', 0, 'Never? But you are here, far from home!', 'A „Have you ever...?” kérdésre a természetes válasz: No, never vagy No, I haven\'t.']] },
    ] },
    { title: 'Merre van a fűszerárus?', steps: [
      { say: 'I must sell my spices. Can you tell me the way to the spice merchant?', hu: 'El kell adnom a fűszereimet. Meg tudod mondani, merre van a fűszerárus?', replies: [
        ['Sure. Walk towards the fountain, and his stall is next to the baker\'s.', 1, 'Next to the baker. Thank you, my friend!'],
        ['Sure. You are going straight and then you are turning left.', 0, 'Am turning? Now I am confused.', 'Útbaigazításnál felszólító mód kell: Go straight, then turn left.'],
        ['Yes, I can.', 0, 'Then please do!', 'Ez udvarias kérés volt, nem a képességedre kérdezett rá: mondd meg az utat.']] },
      { say: 'How much do you think I can ask for a sack of cinnamon?', hu: 'Szerinted mennyit kérhetek egy zsák fahéjért?', replies: [
        ['I am not sure, but cinnamon is expensive here. Ask the spice merchant.', 1, 'A wise answer. I will ask him first.'],
        ['I think you can ask much money.', 0, 'Much money? We usually say: a lot of money.', 'Állító mondatban a much helyett a lot of a természetes: a lot of money.'],
        ['It costs ten coins yesterday.', 0, 'Yesterday? And today?', 'Múlt idejű időhatározóval múlt idő kell, és a mai árról kérdezett.']] },
    ] },
  ],
  dwedding: [
    { title: 'Esküvő van!', steps: [
      { say: 'Today my daughter is getting married! Will you join us for the feast?', hu: 'Ma megy férjhez a lányom! Velünk tartasz a lakomán?', replies: [
        ['Congratulations! I would be delighted to come.', 1, 'Wonderful! There will be music, dates and honey cakes.'],
        ['Good luck! I come with pleasure.', 0, 'Good luck? It is a wedding, not an exam!', 'Esküvőn gratulálunk (Congratulations), nem szerencsét kívánunk. A jövőbeli szándékra would vagy will kell.'],
        ['Yes, I am getting married today too.', 0, 'You too? Then who is the lucky one?', 'Félreértetted: az ő lánya megy férjhez, nem te.']] },
      { say: 'Look, here they come! What do you think of the bride\'s dress?', hu: 'Nézd, jönnek! Mit szólsz a menyasszony ruhájához?', replies: [
        ['It is beautiful. The gold thread shines in the sun.', 1, 'Her mother sewed it herself. It took her a whole year.'],
        ['She is wearing it beautiful.', 0, 'Hmm. We say: she looks beautiful in it.', 'A wear mellé nem tehetsz melléknevet. Mondd így: It is beautiful vagy She looks beautiful.'],
        ['I think of the dress.', 0, 'Yes... and what do you think?', 'A „What do you think of...?” véleményt kér: It is beautiful.']] },
    ] },
    { title: 'A vőlegény', steps: [
      { say: 'Do you know the groom? He is a scribe at the Tablet House.', hu: 'Ismered a vőlegényt? Írnok a Táblaházban.', replies: [
        ['No, I don\'t think I have met him yet.', 1, 'Then come, I will introduce you after the feast.'],
        ['No, I don\'t know who is he.', 0, 'Who he is, my friend. Who he is!', 'Függő kérdésben egyenes a szórend: I don\'t know who he is.'],
        ['Yes, I know him since a long time.', 0, 'Since a long time? For a long time!', 'Időtartamra for kell, és present perfect: I have known him for a long time.']] },
      { say: 'How do people celebrate weddings in your country?', hu: 'Hogyan ünneplik az esküvőt a te hazádban?', replies: [
        ['People usually dance all night and eat a lot of cake.', 1, 'All night? Ha! Just like here.'],
        ['People are usually dancing all night.', 0, 'Are dancing? We say: people usually dance.', 'Szokásra egyszerű jelen kell: people usually dance.'],
        ['I celebrated my birthday last week.', 0, 'Happy birthday! But I asked about weddings.', 'Nem a kérdésre feleltél: az esküvői szokásokról kérdezett.']] },
    ] },
  ],
  ddust: [
    { title: 'Kendő nélkül?', steps: [
      { say: 'Stop! You shouldn\'t walk around in this sandstorm without a scarf.', hu: 'Állj! Nem kellene kendő nélkül járkálnod ebben a homokviharban.', replies: [
        ['You\'re right. Where can I get one?', 1, 'The weaver has scarves. Cover your mouth and nose.'],
        ['I don\'t should have a scarf.', 0, 'Don\'t should? There is no such thing!', 'A should tagadása shouldn\'t, nincs mellette do. Itt egyszerűbb: I don\'t have a scarf.'],
        ['Yes, I walk without a scarf.', 0, 'I can see that! That is the problem.', 'Csak megismételted, amit látott. Fogadd el a tanácsot, vagy kérdezz.']] },
      { say: 'The wind usually stops in the evening. Until then, keep the shutters closed. Do you understand what you must do?', hu: 'A szél általában estére eláll. Addig tartsd csukva az ablaktáblákat. Érted, mit kell tenned?', replies: [
        ['Yes. I must keep the shutters closed until the evening.', 1, 'Good. And stay away from the open fields.'],
        ['Yes. I must open the shutters in the evening.', 0, 'That is not what I said! Listen again.', 'Azt mondta, estig maradjanak csukva (keep them closed until the evening), nem azt, hogy este nyisd ki.'],
        ['Yes. The wind keeps closed.', 0, 'The wind? No, the shutters!', 'Az ablaktáblák (shutters) maradnak csukva, nem a szél.']] },
    ] },
    { title: 'Rosszabb, mint tavaly', steps: [
      { say: 'This storm is worse than the one last year. Have you ever seen a sandstorm before?', hu: 'Ez a vihar rosszabb, mint a tavalyi. Láttál már homokvihart?', replies: [
        ['No, this is the first time. It\'s much worse than I expected.', 1, 'Everybody says that the first time.'],
        ['No, this is the worst than I expected.', 0, 'The worst than? Worse than, my friend.', 'Összehasonlításnál worse than kell. A the worst felsőfok, mellé nem jön than.'],
        ['Yes, I see a sandstorm now.', 0, 'Ha! Yes, you do. But before today?', 'A before arra kérdez, láttál-e már korábban: No, this is the first time.']] },
      { say: 'Where are you staying tonight? The streets will be dangerous.', hu: 'Hol szállsz meg ma éjjel? Veszélyesek lesznek az utcák.', replies: [
        ['At an inn near the Ishtar Gate. It isn\'t far.', 1, 'Good. Go straight there and close the door behind you.'],
        ['I stayed at an inn yesterday.', 0, 'Yesterday? I asked about tonight.', 'A ma éjszakáról kérdezett. Tervre: I am staying at an inn.'],
        ['The streets are staying dangerous.', 0, 'Yes, but where are YOU staying?', 'Azt kérdezte, hol szállsz meg. A válaszod nem erről szól.']] },
    ] },
  ],
  dship: [
    { title: 'Mit hoztatok?', steps: [
      { say: 'Careful, the porters are busy! We have just come from Dilmun.', hu: 'Vigyázz, a hordárok dolgoznak! Most jöttünk Dilmunból.', replies: [
        ['Welcome! What have you brought to Babylon?', 1, 'Pearls, copper and ivory. The best cargo of the year.'],
        ['Welcome! What did you bring tomorrow?', 0, 'Tomorrow? We are here today!', 'A tomorrow és a múlt idő nem fér össze. Most érkezett rakományról: What have you brought?'],
        ['Be careful yourself!', 0, 'Ha! I am always careful. Are you?', 'Ez nyers visszavágás. Köszönj, és kérdezz a rakományról.', 'nyers']] },
      { say: 'How many jars of oil do you think there are on the deck? Guess!', hu: 'Szerinted hány korsó olaj van a fedélzeten? Találd ki!', replies: [
        ['I\'d say about forty. Am I close?', 1, 'Forty-two! You have a good eye.'],
        ['I think there is much jars.', 0, 'Much jars? There ARE MANY jars.', 'Megszámlálható főnévvel many kell, és többes számú ige: there are many jars.'],
        ['How much oil is it?', 0, 'I asked you, my friend!', 'Ő kérdezett. Tippelj egy számot: about forty.']] },
    ] },
    { title: 'Gyöngyvásár', steps: [
      { say: 'Would you like to see a pearl from the sea of Dilmun?', hu: 'Szeretnél látni egy gyöngyöt Dilmun tengeréből?', replies: [
        ['Oh yes! I have never seen a real pearl.', 1, 'Here. A diver brought it up from the bottom of the sea.'],
        ['Yes, I like seeing it.', 0, 'You like? You mean you would like to see it.', 'Ajánlatra would like-kal felelünk: Yes, I would like to see it.'],
        ['No, I have already saw a pearl.', 0, 'Already saw? Already SEEN!', 'Present perfectben a 3. alak kell: I have already seen one.']] },
      { say: 'How much do you think a pearl like this costs in Babylon?', hu: 'Szerinted mennyibe kerül egy ilyen gyöngy Babilonban?', replies: [
        ['Probably more than a whole camel!', 1, 'Ha! Two camels, in fact.'],
        ['It costs more expensive.', 0, 'More expensive than what?', 'A cost után nem áll melléknév. Mondd: It costs more than... vagy It is more expensive than...'],
        ['It is costing a camel.', 0, 'Is costing? We say: it costs.', 'A cost állapotige, nem áll folyamatos alakban: it costs.']] },
    ] },
  ],
  dherald: [
    { title: 'Halljátok!', steps: [
      { say: 'Hear me, people of Babylon! By order of the king, the city gates will be closed at sunset. Did you hear me? When will the gates be closed?', hu: 'Halljátok, babiloniak! A király parancsára a város kapuit naplementekor bezárják. Hallottad? Mikor zárják be a kapukat?', replies: [
        ['At sunset, by order of the king.', 1, 'Exactly. Tell your neighbours!'],
        ['At sunrise, tomorrow morning.', 0, 'No, no! At SUNSET. Listen carefully.', 'Naplementekor (at sunset) zárják be őket, nem napkeltekor (sunrise).'],
        ['The king will close at sunset.', 0, 'The king himself? No, the GATES will be closed.', 'Szenvedő szerkezet: a kapukat zárják be (the gates will be closed), nem a király zár be.']] },
      { say: 'And remember: fires are not allowed in the streets after dark. What is not allowed?', hu: 'És ne feledd: sötétedés után tilos tüzet rakni az utcákon. Mi nem megengedett?', replies: [
        ['Making fires in the streets after dark.', 1, 'Correct. The king\'s guards will check.'],
        ['Walking in the streets after dark.', 0, 'Walking is fine. FIRES are not allowed.', 'A tűzrakás tilos (fires are not allowed), a séta nem.'],
        ['The dark is not allowed.', 0, 'Ha! Not even the king can forbid the dark.', 'A sötétedés csak időpont (after dark). A tilalom a tűzre vonatkozik.']] },
    ] },
    { title: 'Mit mondott?', steps: [
      { say: 'The old woman next to you did not hear me. Tell her what I said: "The market will close at noon tomorrow."', hu: 'A melletted álló öregasszony nem hallotta. Mondd el neki, mit mondtam: „A piac holnap délben bezár.”', replies: [
        ['He said that the market would close at noon tomorrow.', 1, 'Perfect. Now she knows.'],
        ['He said that the market will closed at noon.', 0, 'Will closed? No, no.', 'Függő beszédben a will helyett would áll, utána az ige alapalakja: would close.'],
        ['He told the market closes at noon.', 0, 'Told WHOM? Say: he said that...', 'A told után kell a személy (told her), különben said that a helyes szerkezet.']] },
      { say: 'Good. Now ask me something about the new decree. People always have questions.', hu: 'Jó. Most kérdezz valamit az új rendeletről. Az embereknek mindig van kérdésük.', replies: [
        ['Why did the king decide to close the market early?', 1, 'Because of the procession of Marduk. Everybody must be there.'],
        ['Why the king decided to close the market?', 0, 'You forgot something: why DID the king decide?', 'Múlt idejű kérdésben segédige kell: Why did the king decide...?'],
        ['What decree?', 0, 'The one I just read! Were you listening?', 'Túl rövid és nyers. Kérdezz rá rendesen a rendeletre.', 'nyers']] },
    ] },
  ],
  dfair: [
    { title: 'Tudsz zsonglőrködni?', steps: [
      { say: 'Hey, you! Can you juggle?', hu: 'Hé, te! Tudsz zsonglőrködni?', replies: [
        ['Not really. I can juggle two balls, but not three.', 1, 'Two is a good start! Three is only one more.'],
        ['Yes, I can to juggle.', 0, 'Can to? Just say: I can juggle.', 'A can után to nélkül jön az ige: I can juggle.'],
        ['No, I can\'t juggling.', 0, 'Can\'t juggling? I can\'t juggle, my friend.', 'A can\'t után az ige alapalakja áll: I can\'t juggle.']] },
      { say: 'Guess how long I have been practising!', hu: 'Találd ki, mióta gyakorlok!', replies: [
        ['Have you been practising since you were a child?', 1, 'Since I was six! Every single day.'],
        ['Do you practise since you were a child?', 0, 'Do I practise since...? HAVE I BEEN practising!', 'Régen kezdődött és ma is tartó dologra present perfect continuous kell: Have you been practising since...?'],
        ['You practise for ten years ago.', 0, 'For ten years ago? That is a strange time!', 'A for időtartamot, az ago múltbeli időpontot jelöl, együtt nem állnak.']] },
    ] },
    { title: 'Az előadás után', steps: [
      { say: 'So, what did you think of the show?', hu: 'Na, mit szólsz az előadáshoz?', replies: [
        ['It was amazing! The acrobat was my favourite.', 1, 'Don\'t tell me. I am jealous of her already.'],
        ['It was amazed.', 0, 'Amazed? WE were amazing, YOU were amazed!', 'Az -ing melléknév a dolgot írja le (amazing), az -ed az érzést (amazed).'],
        ['I think the show.', 0, 'You think... what?', 'Véleményt kért: It was amazing.']] },
      { say: 'Would you mind holding these balls for a moment?', hu: 'Megtartanád egy pillanatra ezeket a labdákat?', replies: [
        ['Not at all. Here, give them to me.', 1, 'Thank you! Now don\'t drop them.'],
        ['Yes, I mind. Give them to me.', 0, 'You mind? Then why are you taking them?', 'A „Would you mind...?” kérdésre a beleegyezés: Not at all (egyáltalán nem bánom).'],
        ['No, I don\'t hold.', 0, 'So... will you help me or not?', 'Ha segítesz: Not at all vagy Of course not. Ha nem: Sorry, I can\'t.']] },
    ] },
  ],
  dharvest: [
    { title: 'Búzából kenyér', steps: [
      { say: 'Do you know how bread is made? First we cut the wheat. What do we do next?', hu: 'Tudod, hogy lesz a kenyér? Először levágjuk a búzát. Mit csinálunk utána?', replies: [
        ['Then you tie it into sheaves and take it to the threshing floor.', 1, 'Exactly. There the grain is beaten out of the ears.'],
        ['Next we are eat the bread.', 0, 'Eat it? Not yet! And we say: we eat.', 'Túl korai lépés, és hibás is: are eat helyett eat.'],
        ['Firstly, cut the wheat.', 0, 'Yes, I have just said that!', 'Ezt ő már elmondta. A következő lépés kell: Then...']] },
      { say: 'After that, the grain goes to the mill. What happens to it there?', hu: 'Ezután a gabona a malomba kerül. Mi történik vele ott?', replies: [
        ['It is ground into flour.', 1, 'Yes! And the baker does the rest.'],
        ['It grinds into flour.', 0, 'Hmm, the grain does not grind itself!', 'Szenvedő szerkezet kell: it is ground into flour (megőrlik).'],
        ['It is grinded.', 0, 'Grinded? We say: ground.', 'A grind rendhagyó ige: grind, ground, ground.']] },
    ] },
    { title: 'Segíthetek?', steps: [
      { say: 'Phew, this basket is so heavy.', hu: 'Hű, de nehéz ez a kosár.', replies: [
        ['Shall I carry it for you?', 1, 'Oh, thank you! Put it next to the sheaves.'],
        ['Shall you carry it?', 0, 'Me? I am already carrying it!', 'Felajánlásnál magadról kérdezel: Shall I carry it?'],
        ['Yes, it is heavy.', 0, 'I know! So... will you help me?', 'Csak egyetértettél. Inkább ajánld fel a segítséged.']] },
      { say: 'Have you ever worked on a farm?', hu: 'Dolgoztál már valaha földeken?', replies: [
        ['Only once, when I was a child. I picked apples.', 1, 'Then you know how tired your back gets!'],
        ['Yes, I have worked there when I was a child.', 0, 'When you WERE a child? Then: I worked.', 'Múltbeli időponttal (when I was a child) egyszerű múlt kell.'],
        ['No, I never.', 0, 'Never what?', 'Hiányos. Mondd így: No, never vagy No, I have never worked on a farm.']] },
    ] },
  ],
};
