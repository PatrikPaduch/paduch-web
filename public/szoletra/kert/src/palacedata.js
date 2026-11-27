// Nabukodonozor palotája: szavak ("palota" témával). A beszélgetések és a kihallgatás a következő körben jönnek.
export const PALACE_WORDS = {
  palace: ['palace', 'palota', 'The king lived in a huge palace by the river.', 'A király egy hatalmas palotában élt a folyó partján.', 'a2'],
  throne: ['throne', 'trón', 'The king sat on a golden throne.', 'A király aranytrónon ült.', 'b1'],
  crown: ['crown', 'korona', 'The crown was too heavy to wear all day.', 'A korona túl nehéz volt ahhoz, hogy egész nap viselje.', 'a2'],
  courtier: ['courtier', 'udvaronc', 'The courtiers whispered when the king entered.', 'Az udvaroncok sugdolóztak, amikor a király belépett.', 'c1'],
  guard: ['guard', 'őr', 'Two guards stood at the palace gate.', 'Két őr állt a palota kapujában.', 'a2'],
  banner: ['banner', 'zászló, lobogó', 'Blue and red banners hung from the walls.', 'Kék és vörös zászlók lógtak a falakon.', 'b1'],
  garden: ['garden', 'kert', 'The royal garden was full of palm trees and pools.', 'A királyi kert tele volt pálmafákkal és medencékkel.', 'a1'],
  pool: ['pool', 'medence', 'Fish swam in the long pools of the garden.', 'Halak úszkáltak a kert hosszú medencéiben.', 'a2'],
  residence: ['residence', 'rezidencia, lakóhely', 'The royal residence was closed to visitors.', 'A királyi rezidencia zárva volt a látogatók előtt.', 'b2'],
  tower: ['tower', 'torony', 'From the top of the tower you can see the river.', 'A torony tetejéről látni a folyót.', 'a2'],
  treasury: ['treasury', 'kincstár', 'The gold was kept in the treasury.', 'Az aranyat a kincstárban őrizték.', 'b2'],
  gazelle: ['gazelle', 'gazella', 'Two gazelles were eating grass in the garden.', 'Két gazella legelt a kertben.', 'b1'],
  herald: ['herald', 'hírnök', 'The herald announced the guests in a loud voice.', 'A hírnök hangosan bejelentette a vendégeket.', 'c1'],
  chamberlain: ['chamberlain', 'udvarmester, kamarás', 'The chamberlain taught the guests how to bow.', 'Az udvarmester megtanította a vendégeket meghajolni.', 'c1'],
  petition: ['petition', 'kérvény, folyamodvány', 'The scribe wrote down her petition.', 'Az írnok leírta a kérvényét.', 'b2'],
  audience: ['audience', 'kihallgatás; közönség', 'He was granted an audience with the king.', 'Kihallgatást kapott a királynál.', 'b2'],
  seal: ['seal', 'pecsét', 'The letter was closed with the royal seal.', 'A levelet a királyi pecséttel zárták le.', 'b1'],
  brazier: ['brazier', 'parázstartó', 'The brazier kept the hall warm at night.', 'A parázstartó éjjel melegen tartotta a termet.', 'c1'],
};

// Az udvar beszélgetései. A rossz válasz 5. eleme a hangnem: 'nyers' (túl nyers) vagy 'kor' (túl körülményes).
// A sorrend kötött (kapuőr -> írnok -> udvarmester -> hírnök -> király); a "bye" a beszélgetés végi mondat.
export const PALACE_CONVOS = {
  pguard: [
    { title: 'A palotakapunál', bye: ['You may pass. The scribes are in the outer court.', 'Továbbmehetsz. Az írnokok a külső udvarban vannak.'], steps: [
      { say: 'Halt! Who are you, and what is your business at the royal palace?', hu: 'Állj! Ki vagy, és mi dolgod a királyi palotában?', replies: [
        ['Good day. I am a traveller, and I have come to request an audience with the king.', 1, 'An audience? Very well.'],
        ['I want to see the king. Let me in.', 0, 'Not with that tone, stranger!', 'Parancsolgatás (Let me in) és "I want". Egy őrrel is udvariasan: I have come to request…', 'nyers'],
        ['O mighty guardian of this most magnificent gate, would you most graciously permit this humble wanderer to perhaps enter?', 0, 'Just tell me your business, please.', 'Egy őrnek elég egy világos, udvarias mondat: ki vagy és miért jöttél.', 'kor']] },
      { say: 'Do you carry any weapons?', hu: 'Van nálad fegyver?', replies: [
        ["No, I don't. You may check my bag if you wish.", 1, 'Good. Everything is in order.'],
        ['No. Hurry up.', 0, 'I decide how fast this goes, not you.', 'A "Hurry up" sürgetés, egy őrrel szemben bántó.', 'nyers'],
        ['I most humbly assure you, honoured sir, that I carry absolutely nothing that could possibly be considered a weapon of any kind.', 0, 'A simple "no" is enough.', 'Egy egyszerű kérdésre egyszerű, udvarias válasz kell.', 'kor']] },
    ] },
  ],
  pscribe: [
    { title: 'A kérvény', bye: ['Your petition is written. Now go to the chamberlain in the garden.', 'A kérvényed le van írva. Most menj az udvarmesterhez a kertbe.'], steps: [
      { say: 'Next! State the purpose of your petition, please.', hu: 'Következő! Kérem, mondja el a kérvénye célját.', replies: [
        ["I would like to request the king's help with the canal in my village.", 1, 'The canal… I am writing it down.'],
        ['Write this down: the canal is broken and the king must fix it.', 0, 'The king MUST? Careful with your words.', 'Senki nem mondja meg a királynak, mit "kell" tennie. Kérvényben: I would like to request…', 'nyers'],
        ['If it is not too much of an inconvenience, and only if you have time, I was perhaps wondering whether a canal might possibly be mentioned.', 0, 'Mentioned? What do you actually want?', 'Annyi a szabadkozás, hogy elveszik a kérés. Legyen udvarias, de világos.', 'kor']] },
      { say: 'When did the problem begin?', hu: 'Mikor kezdődött a probléma?', replies: [
        ['It began after the spring floods, about two months ago.', 1, 'After the floods. Thank you.'],
        ['Ages ago. Does it matter?', 0, 'Everything matters in a petition.', 'Az írnok pontos választ kér; a "Does it matter?" lekezelő.', 'nyers'],
        ['If my humble memory serves me correctly, which it may not, it was perhaps around the time when the water was perhaps higher than usual.', 0, 'So… after the floods?', 'Túl sok bizonytalanság. Egy egyszerű időhatározó elég: two months ago.', 'kor']] },
    ] },
  ],
  chamberlain: [
    { title: 'Protokoll-lecke', bye: ['You are ready. Go to the herald at the throne room.', 'Készen állsz. Menj a hírnökhöz a trónteremnél.'], steps: [
      { say: 'Before you meet the king, you must know the rules. How do you address him?', hu: 'Mielőtt a király elé lépsz, ismerned kell a szabályokat. Hogyan szólítod meg?', replies: [
        ["I say 'Your Majesty'.", 1, 'Correct. First "Your Majesty", later you may say "sir".'],
        ["I just call him 'King'.", 0, 'Never! That is far too rude.', 'A királyt nem szólítjuk egyszerűen King-nek: Your Majesty.', 'nyers'],
        ["I call him 'O Most Glorious, Eternal and Magnificent Lord of All Lands and Rivers'.", 0, 'Too long! He will fall asleep.', 'Egy rövid, helyes megszólítás jobb: Your Majesty.', 'kor']] },
      { say: 'Good. And how do you ask him for something?', hu: 'Jó. És hogyan kérsz tőle valamit?', replies: [
        ["I say: 'May I ask Your Majesty for help with…'", 1, 'Perfect. Polite and clear.'],
        ["I say: 'Give me…'", 0, 'Give me? You will be thrown out!', 'Felszólító mód egy királynak? Inkább: May I ask… / Could Your Majesty…', 'nyers'],
        ["I say: 'I would never dare to ask, but if it is not too much trouble, perhaps, maybe, possibly…'", 0, 'He will not understand what you want.', 'Ennyi "perhaps, maybe" után nem derül ki a kérés. Egy udvarias szerkezet elég.', 'kor']] },
      { say: 'Last rule: when the audience is over, what do you do?', hu: 'Utolsó szabály: ha vége a kihallgatásnak, mit teszel?', replies: [
        ['I thank him, bow, and take a few steps backwards before I turn around.', 1, 'Exactly. Never turn your back on the king.'],
        ['I just turn around and leave.', 0, 'Turning your back on the king is a great insult!', 'A királynak nem fordítunk hátat: megköszönöd, meghajolsz, hátrálsz.', 'nyers'],
        ['I stay and thank him for at least an hour.', 0, 'An hour? The king has other guests!', 'A hálát röviden fejezzük ki: Thank you, Your Majesty.', 'kor']] },
    ] },
  ],
  herald: [
    { title: 'A hírnök', bye: ['Approach the throne. The king will see you now.', 'Lépj a trón elé. A király most fogad.'], steps: [
      { say: 'The king is ready. Are you prepared for your audience?', hu: 'A király készen áll. Felkészültél a kihallgatásra?', replies: [
        ['Yes, I am ready. Thank you for announcing me.', 1, 'Then follow me.'],
        ['Yeah, whatever. Just go.', 0, 'In the palace we do not speak like this!', 'A "yeah, whatever" túl laza egy udvari helyzetben.', 'nyers'],
        ['I believe I am as ready as any humble person could ever possibly hope to be, if you would be so kind as to consider it.', 0, '…Is that a yes?', 'Egy egyszerű igen és egy köszönet elég.', 'kor']] },
    ] },
  ],
  king: [
    { title: 'Kihallgatás a királynál', bye: ['Take this royal seal. With it, every door in Babylon will open for you.', 'Fogadd ezt a királyi pecsétet. Ezzel Babilon minden ajtaja megnyílik előtted.'], steps: [
      { say: 'Why have you come to my court?', hu: 'Miért jöttél az udvaromba?', replies: [
        ['Your Majesty, I have come to ask for your help with the canal in my village.', 1, 'A canal. Tell me more.'],
        ['I want help with my canal.', 0, 'You WANT? The king frowns.', 'Helyes mondat, de egy királynak nem mondjuk, hogy "akarom". Megszólítás + udvarias kérés.', 'nyers'],
        ['Most glorious king of all lands, I humbly and most respectfully beg to be permitted to perhaps mention a canal.', 0, 'The king waves his hand impatiently.', 'Annyira udvarias, hogy a lényeg elveszik.', 'kor']] },
      { say: 'What happened to the canal?', hu: 'Mi történt a csatornával?', replies: [
        ['The spring floods destroyed its walls, Your Majesty, and now the fields are dry.', 1, 'That is serious. Our fields feed the city.'],
        ['It broke. Fix it.', 0, 'Nobody gives orders to the king!', 'Felszólítás a királynak elképzelhetetlen.', 'nyers'],
        ['Alas, the cruel and merciless waters of spring, in their terrible fury, have caused the noble walls to suffer greatly.', 0, 'Speak plainly, please.', 'Költői túlzás helyett: mi történt és mi a következménye.', 'kor']] },
      { say: 'And what do you need from me?', hu: 'És mire van szükséged tőlem?', replies: [
        ['Could Your Majesty send workers to repair it before the harvest?', 1, 'A reasonable request.'],
        ['Send workers. Now.', 0, 'The guards step forward…', 'Parancsolgatás helyett kérés: Could Your Majesty…?', 'nyers'],
        ['If it would not be an unbearable burden upon your eternal treasury, perhaps a few workers might, one day, possibly be considered.', 0, 'Might? One day? Do you need them or not?', 'Ha túl bizonytalan a kérés, nem derül ki, mit kérsz és mikorra.', 'kor']] },
      { say: 'Very well. I shall send twenty workers tomorrow.', hu: 'Rendben. Holnap húsz munkást küldök.', replies: [
        ['Thank you, Your Majesty. I am most grateful.', 1, 'You have spoken well. Go in peace.'],
        ['Finally. Thanks.', 0, '"Finally"? Be careful.', 'A "Finally" türelmetlenséget mutat; a köszönet legyen hálás.', 'nyers'],
        ['I shall sing of your endless generosity every single day until the very end of time itself.', 0, 'One "thank you" is quite enough.', 'A túlzó hála kínos. Röviden: I am most grateful.', 'kor']] },
    ] },
  ],
};
