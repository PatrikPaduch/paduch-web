// A túlparti kikötő (az Eufrátesz északi partja, Ezüst csillagtól): hajózási szavak, beszélgetések, agyagtáblák.
// Formátumok, mint a citydata.js-ben. A szavak "hajózás" témával kerülnek a Szólétrába.
export const HARBOUR_WORDS = {
  dock: ['dock', 'dokk, rakpart', 'The ship stayed at the dock for three days.', 'A hajó három napig állt a dokknál.', 'b1'],
  pier: ['pier', 'stég, móló', 'We waited for the ferry at the end of the pier.', 'A stég végén vártuk a kompot.', 'b1'],
  ferry: ['ferry', 'komp, rév', 'The ferry takes people across the river.', 'A komp átviszi az embereket a folyón.', 'b1'],
  crane: ['crane', 'daru', 'A wooden crane lifted the heavy sacks from the ship.', 'Egy fadaru emelte ki a nehéz zsákokat a hajóból.', 'b1'],
  pulley: ['pulley', 'csiga (emelő)', 'With a pulley, one man can lift a heavy load.', 'Csigával egy ember is fel tud emelni egy nehéz terhet.', 'b2'],
  warehouse: ['warehouse', 'raktár', 'The grain is kept in a big warehouse near the river.', 'A gabonát egy nagy raktárban tartják a folyó közelében.', 'b1'],
  cargo: ['cargo', 'rakomány', 'The ship carried a cargo of copper and wood.', 'A hajó rezet és fát szállított rakományként.', 'b1'],
  barge: ['barge', 'uszály', 'A long barge moved slowly down the river.', 'Egy hosszú uszály lassan haladt lefelé a folyón.', 'b2'],
  anchor: ['anchor', 'horgony', 'They dropped the anchor near the shore.', 'A part közelében leengedték a horgonyt.', 'b1'],
  oar: ['oar', 'evező', 'He pulled the oars slowly and the boat moved forward.', 'Lassan húzta az evezőket, és a csónak előrehaladt.', 'b1'],
  deck: ['deck', 'fedélzet', 'The sailors were sleeping on the deck.', 'A matrózok a fedélzeten aludtak.', 'b1'],
  hull: ['hull', 'hajótest', 'The hull is covered with bitumen to keep the water out.', 'A hajótestet bitumen borítja, hogy ne jusson be a víz.', 'b2'],
  mast: ['mast', 'árboc', 'The sailor climbed to the top of the mast.', 'A matróz felmászott az árboc tetejére.', 'b1'],
  keel: ['keel', 'tőkesúly, gerinc (hajóé)', 'The shipwright starts with the keel.', 'A hajóács a gerinccel kezdi.', 'b2'],
  sailor: ['sailor', 'matróz, tengerész', 'The old sailor told stories about the sea.', 'Az öreg matróz történeteket mesélt a tengerről.', 'a2'],
  shipwright: ['shipwright', 'hajóács', 'The shipwright has built boats for forty years.', 'A hajóács negyven éve épít hajókat.', 'c1'],
  timber: ['timber', 'épületfa, faanyag', 'The timber for the ship came from the north.', 'A hajó faanyaga északról jött.', 'b2'],
  cedar: ['cedar wood', 'cédrusfa', 'Cedar wood smells good and does not rot easily.', 'A cédrusfa jó illatú, és nem rothad könnyen.', 'b2'],
  log: ['log', 'farönk', 'Ten men rolled the log onto the barge.', 'Tíz ember gördítette fel a rönköt az uszályra.', 'b1'],
  amphora: ['amphora', 'amfóra (kétfülű korsó)', 'The amphorae were full of olive oil.', 'Az amfórák tele voltak olívaolajjal.', 'b2'],
  bitumen: ['bitumen', 'bitumen, földszurok', 'Bitumen makes boats and roofs waterproof.', 'A bitumen vízállóvá teszi a hajókat és a tetőket.', 'c1'],
  unload: ['unload', 'kirakodni', 'It took all morning to unload the ship.', 'Egész délelőtt tartott kirakodni a hajót.', 'b1'],
  customs: ['customs', 'vám, vámhivatal', 'Every merchant must stop at the customs house.', 'Minden kereskedőnek meg kell állnia a vámháznál.', 'b1'],
  tax: ['tax', 'adó, vám', 'The king collects a tax on every cargo.', 'A király minden rakomány után adót szed.', 'b1'],
  voyage: ['voyage', 'hajóút, utazás', 'The voyage to Dilmun took two weeks.', 'A dilmuni hajóút két hétig tartott.', 'b2'],
  reed: ['reed', 'nád', 'Tall reeds grow along the river bank.', 'Magas nád nő a folyóparton.', 'b1'],
  saw: ['saw', 'fűrész', 'He cut the plank with a saw.', 'Fűrésszel vágta el a deszkát.', 'a2'],
  ship: ['ship', 'hajó', 'The ship sailed at dawn.', 'A hajó hajnalban kifutott.', 'a2'],
};

// a túlparti szereplők beszélgetései (a CONVOS-ba olvadnak)
export const HARBOUR_CONVOS = {
  harbourmaster: [
    { title: 'A kikötőmesternél', steps: [
      { say: 'Welcome to the north harbour. Are you a merchant or a traveller?', hu: 'Üdv az északi kikötőben. Kereskedő vagy, vagy utazó?', replies: [
        ["I'm a traveller. I'm just looking around.", 1, 'Then enjoy the view, but stay away from the crane while it is working.'],
        ['I am travel.', 0, 'You are a TRAVELLER. Travel is what you do!', 'Főnév kell: I am a traveller (travel = ige).'],
        ['I am merchant and traveller both.', 0, 'Both a merchant AND a traveller? Busy person!', 'Mindkettő: both a merchant and a traveller.']] },
      { say: 'When a ship arrives, the cargo must be checked before anyone unloads it.', hu: 'Amikor egy hajó befut, a rakományt ellenőrizni kell, mielőtt bárki kirakodná.', replies: [
        ['Who checks the cargo? You or the customs officer?', 1, 'The customs officer counts it, and I sign the tablet.'],
        ['Who does check the cargo?', 0, 'Just: Who checks the cargo? When who is the subject, no does.', 'Ha a who az alany: Who checks...? (does nélkül)'],
        ['Why must check the cargo?', 0, 'Why MUST IT BE checked? You need a subject.', 'Szenvedő szerkezet: Why must it be checked?']] },
    ] },
    { title: 'Mikor indul a hajó?', steps: [
      { say: 'Are you looking for a ship? The barge to Ur leaves soon.', hu: 'Hajót keresel? Hamarosan indul az uszály Urba.', replies: [
        ['When does it leave, and how long does the voyage take?', 1, 'It leaves at noon. With a good wind, the voyage takes four days.'],
        ['When it leaves?', 0, 'When DOES it leave? Questions need does.', 'Jelen idejű kérdés: When does it leave?'],
        ['How long is taking the voyage?', 0, 'How long DOES the voyage TAKE?', 'Időtartam: How long does it take?']] },
      { say: 'It leaves at noon from the third dock. Do you need directions?', hu: 'Délben indul a harmadik dokkból. Kell útbaigazítás?', replies: [
        ['Yes, please. How do I get to the third dock?', 1, 'Walk past the crane and turn left. It is next to the big warehouse.'],
        ['Yes, where is the three dock?', 0, 'The THIRD dock. Order: first, second, third.', 'Sorszámnév: the third dock.'],
        ['Yes, how I go to the third dock?', 0, 'How DO I GET to the third dock?', 'Kérdés: How do I get to...?']] },
    ] },
  ],
  sailor: [
    { title: 'Az öreg matróz', steps: [
      { say: 'Ah, a new face! Have you ever been on a real ship?', hu: 'Á, egy új arc! Voltál már valaha igazi hajón?', replies: [
        ['No, never. Only on the small ferry today.', 1, 'Then you have a lot to see! The sea is a different world.'],
        ['No, I never was on a ship.', 0, 'I have NEVER BEEN on a ship. Ever and never like the present perfect.', 'Tapasztalat: I have never been on a ship.'],
        ['Yes, I have been on a ship yesterday.', 0, 'With yesterday we say: I WAS on a ship yesterday.', 'Konkrét múltbeli idő (yesterday): past simple, I was.']] },
      { say: 'Last year a storm broke our mast. We drifted for six days.', hu: 'Tavaly egy vihar eltörte az árbocunkat. Hat napig sodródtunk.', replies: [
        ['That sounds terrible! How did you survive?', 1, 'We caught fish and drank rainwater. And we prayed a lot!'],
        ['That sounds terribly!', 0, 'Terrible. After sound, use an adjective.', 'A sound után melléknév: sounds terrible.'],
        ['How did you survived?', 0, 'How did you SURVIVE. After did, no -ed.', 'Did után alapalak: survive.']] },
    ] },
  ],
  dilmun: [
    { title: 'Dilmuni kereskedő', steps: [
      { say: 'I come from Dilmun, an island in the southern sea. I bring pearls and copper.', hu: 'Dilmunból jövök, egy szigetről a déli tengeren. Gyöngyöt és rezet hozok.', replies: [
        ['How far is Dilmun from here?', 1, 'About two weeks by ship, if the wind is kind.'],
        ['How much far is Dilmun?', 0, 'Just how FAR. Not how much far.', 'Távolság: How far is it?'],
        ['Where is the Dilmun?', 0, 'Just Dilmun, no the. Names of places usually have no article.', 'Helynév elé nem kell the: Where is Dilmun?']] },
      { say: 'And what do you think I take back to Dilmun?', hu: 'És szerinted mit viszek vissza Dilmunba?', replies: [
        ['Maybe grain and wool from Babylon?', 1, 'Exactly. Our island has pearls, but not enough fields.'],
        ['Maybe grains and wools?', 0, 'Grain and wool are uncountable. No -s!', 'Megszámlálhatatlan: grain, wool (nincs -s).'],
        ['You take back to Dilmun pearls.', 0, 'No, I BRING pearls here. Bring here, take there.', 'Bring = ide hoz, take = oda visz.']] },
    ] },
  ],
  shipwright: [
    { title: 'A hajóácsnál', steps: [
      { say: 'This ship is not finished yet. We started it in spring.', hu: 'Ez a hajó még nincs kész. Tavasszal kezdtük.', replies: [
        ['When will it be ready?', 1, 'Before the floods, I hope. We still need the deck and the mast.'],
        ['When it will be ready?', 0, 'When WILL IT be ready? Question order: will before it.', 'Kérdő szórend: When will it be ready?'],
        ['How long you are building it?', 0, 'How long HAVE you BEEN building it?', 'Folyamatban lévő időtartam: How long have you been building it?']] },
      { say: 'The keel is made of cedar wood. Do you know where cedar comes from?', hu: 'A gerinc cédrusfából készült. Tudod, honnan származik a cédrus?', replies: [
        ['From the mountains in the west, I think.', 1, 'Right, from Lebanon. It travels for weeks on rivers to get here.'],
        ['I think it comes of the mountains.', 0, 'Comes FROM the mountains.', 'Honnan: come from.'],
        ['It is coming from the west every day.', 0, 'Just: It comes from the west. It is a fact, not happening now.', 'Általános tény: present simple, it comes from.']] },
    ] },
  ],
  customs: [
    { title: 'A vámháznál', steps: [
      { say: 'Stop, please. Do you have anything to declare?', hu: 'Álljon meg, kérem. Van valami elvámolnivalója?', replies: [
        ["No, I don't. I'm not carrying any goods.", 1, 'Good. Travellers without goods pay nothing. Next!'],
        ['No, I don\'t have nothing.', 0, 'I don\'t have ANYTHING. Or: I have nothing. Not both!', 'Egy tagadás elég: I don\'t have anything.'],
        ['No, I am not carry goods.', 0, 'I am not CARRYING any goods.', 'Folyamatos: I am not carrying...']] },
      { say: 'Merchants pay one coin for every ten sacks. Is that clear?', hu: 'A kereskedők minden tíz zsák után egy érmét fizetnek. Világos?', replies: [
        ['Yes, it is. So twenty sacks cost two coins.', 1, 'Exactly. You would make a good scribe!'],
        ['Yes. So twenty sacks costs two coins.', 0, 'Twenty sacks COST. Plural subject, no -s.', 'Többes alany: sacks cost (nincs -s).'],
        ['Yes, it is clearly.', 0, 'It is CLEAR. After be, an adjective.', 'A be után melléknév: it is clear.']] },
    ] },
  ],
};

// agyagtáblák a túlparton [cím, x, z, y, angol, magyar, kérdés, válaszok, helyes]
export const HARBOUR_TABLETS = [
  ['The Island of Dilmun', 8, 342, 0,
    'Dilmun was an island in the southern sea, today called Bahrain. Ships from Mesopotamia sailed there with grain and wool and came back with copper and pearls. The Sumerians believed Dilmun was a pure and holy land.',
    'Dilmun egy sziget volt a déli tengeren, ma Bahreinnek hívják. Mezopotámiából hajók vitték oda a gabonát és a gyapjút, és rézzel meg gyönggyel tértek vissza. A sumerok szerint Dilmun tiszta és szent föld volt.',
    'What did the ships bring back from Dilmun?', ['Grain and wool', 'Copper and pearls', 'Cedar wood'], 1],
  ['Cedars from the Mountains', -36, 338, 0,
    'Mesopotamia had clay and reeds, but very few tall trees. Kings sent expeditions to the mountains of Lebanon to cut cedars. The logs floated down the rivers for weeks before they reached the cities.',
    'Mezopotámiában volt agyag és nád, de nagyon kevés magas fa. A királyok expedíciókat küldtek Libanon hegyeibe cédrust vágni. A rönkök hetekig úsztak lefelé a folyókon, mire elérték a városokat.',
    'How did the cedar logs reach the cities?', ['On the backs of camels', 'They floated down the rivers', 'They were not needed'], 1],
  ['The Round Boat', 22, 330, 0,
    'The quffa was a round boat made of woven reeds and covered with bitumen. It could not sail fast, but it carried heavy loads and almost never sank. People used boats like this on the Euphrates for thousands of years.',
    'A quffa kerek csónak volt, fonott nádból, bitumennel bevonva. Nem tudott gyorsan haladni, de nehéz terheket vitt, és szinte sosem süllyedt el. Ilyen csónakokat évezredekig használtak az Eufráteszen.',
    'Why was the quffa useful?', ['It was very fast', 'It carried heavy loads and rarely sank', 'It was made of gold'], 1],
  ['When the River Rises', 62, 340, 0,
    'Every spring, snow melted in the northern mountains and the Euphrates rose. The flood brought rich soil to the fields, but it could also destroy villages. Farmers built canals and walls to control the water.',
    'Minden tavasszal elolvadt a hó az északi hegyekben, és megáradt az Eufrátesz. Az áradás termékeny talajt hozott a földekre, de falvakat is elpusztíthatott. A földművesek csatornákat és gátakat építettek, hogy megfékezzék a vizet.',
    'Why did the Euphrates rise every spring?', ['Because of heavy rain in the city', 'Because snow melted in the mountains', 'Because the canals were closed'], 1],
];

// a révész szövege az átkelés közben (irányonként): két mondat, aztán egy kérdés
export const RIDE_TALK = {
  1: [['Look over there! That round boat is a quffa. It is made of reeds and bitumen.', 'Nézd csak! Az a kerek csónak egy quffa. Nádból és bitumenből készül.'],
      ['Every spring the snow in the mountains melts, and the river rises. Then my job is much harder!', 'Minden tavasszal elolvad a hó a hegyekben, és megárad a folyó. Olyankor sokkal nehezebb a munkám!'],
      ['So, tell me: why does the river rise in spring?', 'Szóval mondd: miért árad meg tavasszal a folyó?', ['Because the snow in the mountains melts', 'Because the boats are too heavy', 'Because the king orders it'], 0]],
  [-1]: [['The harbour master is strict but fair. Nobody unloads cargo without paying the tax.', 'A kikötőmester szigorú, de igazságos. Senki sem rakodhat ki adófizetés nélkül.'],
      ['At sunset the fishermen come back, and their nets are full of fish.', 'Naplementekor visszajönnek a halászok, és tele van a hálójuk hallal.'],
      ['Tell me: who must pay the tax at the harbour?', 'Mondd csak: kinek kell adót fizetnie a kikötőben?', ['Everyone who unloads cargo', 'Only the fishermen', 'Nobody, it is free'], 0]],
};
