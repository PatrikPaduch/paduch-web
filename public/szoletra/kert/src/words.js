import { CITY_WORDS } from './citydata.js';
import { HARBOUR_WORDS } from './harbourdata.js';
// Kertszavak: ha a törpe a közelébe ér, felbukkan az angol neve. Az első felfedezés +5 pont, és a szó
// bekerül a Szólétra szavai közé (saját szó, "kert" témával). [angol, magyar, példamondat, fordítás, szint]
export const GARDEN_WORDS = {
  gate: ['gate', 'kapu', 'The gate was covered in blue glazed bricks.', 'A kaput kék mázas téglák borították.', 'a2'],
  lion: ['lion', 'oroszlán', 'Golden lions decorate the blue walls.', 'Arany oroszlánok díszítik a kék falakat.', 'a2'],
  tile: ['tile', 'csempe, burkolólap', 'Some of the blue tiles had fallen off the wall.', 'Néhány kék csempe leesett a falról.', 'b1'],
  fountain: ['fountain', 'szökőkút', 'We sat by the fountain and listened to the water.', 'Leültünk a szökőkút mellé, és hallgattuk a vizet.', 'a2'],
  canal: ['canal', 'csatorna', 'A narrow canal ran along the path.', 'Keskeny csatorna futott az út mentén.', 'b1'],
  flowerbed: ['flower bed', 'virágágyás', 'She planted tulips in the flower bed.', 'Tulipánt ültetett a virágágyásba.', 'b1'],
  hedge: ['hedge', 'sövény', 'The gardener trims the hedge every spring.', 'A kertész minden tavasszal megnyírja a sövényt.', 'b1'],
  palm: ['palm tree', 'pálmafa', 'Palm trees grow well in hot, dry places.', 'A pálmafák jól nőnek forró, száraz helyeken.', 'a2'],
  date: ['date', 'datolya', 'Dates are very sweet and full of energy.', 'A datolya nagyon édes és tele van energiával.', 'b1'],
  pomegranate: ['pomegranate', 'gránátalma', 'She cut the pomegranate in half.', 'Félbevágta a gránátalmát.', 'b2'],
  olive: ['olive tree', 'olajfa', 'Some olive trees live for hundreds of years.', 'Egyes olajfák több száz évig élnek.', 'b1'],
  fig: ['fig', 'füge', 'Fresh figs are sweet and soft.', 'A friss füge édes és puha.', 'b1'],
  cypress: ['cypress', 'ciprus', 'Tall cypresses lined the road.', 'Magas ciprusok szegélyezték az utat.', 'b2'],
  cedar: ['cedar', 'cédrus', 'The old cedar gave shade to the whole terrace.', 'Az öreg cédrus az egész teraszra árnyékot vetett.', 'b2'],
  willow: ['willow', 'fűzfa', "The willow's branches touched the water.", 'A fűzfa ágai a vizet érintették.', 'b1'],
  lavender: ['lavender', 'levendula', 'The whole terrace smelled of lavender.', 'Az egész terasz levendulaillatú volt.', 'b1'],
  rose: ['rose bush', 'rózsabokor', 'Be careful, the rose bush has thorns.', 'Vigyázz, a rózsabokor tüskés.', 'b1'],
  reed: ['reed', 'nád', 'Ducks were hiding in the reeds.', 'Kacsák bújtak meg a nádasban.', 'b2'],
  lily: ['water lily', 'tavirózsa', 'A frog sat on a water lily.', 'Egy béka ült egy tavirózsán.', 'b1'],
  orchard: ['orchard', 'gyümölcsös', 'We picked figs in the orchard.', 'Fügét szedtünk a gyümölcsösben.', 'b2'],
  meadow: ['meadow', 'rét', 'Wild flowers grew in the meadow.', 'Vadvirágok nőttek a réten.', 'b1'],
  well: ['well', 'kút', 'They pulled water up from the well.', 'Vizet húztak fel a kútból.', 'b1'],
  vine: ['vine', 'inda, kúszónövény', 'Green vines hung down from the walls.', 'Zöld indák lógtak le a falakról.', 'b2'],
  terrace: ['terrace', 'terasz', 'We had dinner on the terrace.', 'A teraszon vacsoráztunk.', 'b1'],
  staircase: ['staircase', 'lépcső, lépcsősor', 'The staircase leads to the top of the building.', 'A lépcső az épület tetejére vezet.', 'b1'],
  waterfall: ['waterfall', 'vízesés', 'You can hear the waterfall from far away.', 'A vízesést messziről hallani.', 'a2'],
  shore: ['shore', 'part (tóé, tengeré)', 'We walked along the shore of the lake.', 'Végigsétáltunk a tó partján.', 'b1'],
  bridge: ['bridge', 'híd', 'The wooden bridge leads to a small island.', 'A fahíd egy kis szigetre vezet.', 'a2'],
  island: ['island', 'sziget', 'There is a tiny temple on the island.', 'A szigeten van egy apró templom.', 'a2'],
  dome: ['dome', 'kupola', 'The dome is covered in blue tiles.', 'A kupolát kék csempe borítja.', 'b2'],
  column: ['column', 'oszlop', 'The roof rests on twelve columns.', 'A tető tizenkét oszlopon nyugszik.', 'b1'],
  temple: ['temple', 'templom', 'The temple stands at the very top of the garden.', 'A templom a kert legtetején áll.', 'a2'],
  arbour: ['arbour', 'lugas', 'We rested under an arbour covered with roses.', 'Egy rózsákkal benőtt lugas alatt pihentünk meg.', 'b2'],
  bench: ['bench', 'pad', "Let's sit on the bench in the shade.", 'Üljünk le a padra az árnyékba.', 'a2'],
  flowerpot: ['flowerpot', 'virágcserép', 'There was a small shrub in every flowerpot.', 'Minden virágcserépben volt egy kis cserje.', 'a2'],
  shrub: ['shrub', 'cserje', 'Low shrubs grew at the foot of the walls.', 'Alacsony cserjék nőttek a falak tövében.', 'b2'],
};
// a városrész (az Istár-kapun túl) szavai ugyanabba a szótárba kerülnek, "város" témával
for (const [k, v] of Object.entries(CITY_WORDS)) GARDEN_WORDS[k] = [...v, 'város'];
export const CITY_IDS = Object.keys(CITY_WORDS);
// a túlparti kikötő szavai "hajózás" témával
for (const [k, v] of Object.entries(HARBOUR_WORDS)) GARDEN_WORDS[k] = [...v, 'hajózás'];
export const HARB_IDS = Object.keys(HARBOUR_WORDS);
export const WORD_IDS = Object.keys(GARDEN_WORDS);
